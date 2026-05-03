import { Router } from 'express'
import path from 'node:path'
import fs from 'node:fs'
import { requireAuth } from '../auth/middleware.js'
import { prisma } from '../db.js'
import { decrypt } from '../lib/crypto.js'
import * as groq from '../lib/ai/groq.js'
import * as gemini from '../lib/ai/gemini.js'
import * as anthropic from '../lib/ai/anthropic.js'
import * as imageLib from '../lib/ai/image.js'

const router = Router()

const UPLOAD_DIR = process.env.NODE_ENV === 'production' ? '/data/uploads' : path.resolve(process.cwd(), 'uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

async function loadKeys(userId) {
  const row = await prisma.byokKey.findUnique({ where: { userId } })
  if (!row) return {}
  return {
    groqKey: row.groqKey ? decrypt(row.groqKey) : null,
    geminiKey: row.geminiKey ? decrypt(row.geminiKey) : null,
    anthropicKey: row.anthropicKey ? decrypt(row.anthropicKey) : null,
    hfToken: row.hfToken ? decrypt(row.hfToken) : null,
    cloudflareAccount: row.cloudflareAccount ? decrypt(row.cloudflareAccount) : null,
    cloudflareToken: row.cloudflareToken ? decrypt(row.cloudflareToken) : null,
  }
}

// Pick the best available provider based on which keys the user has configured.
function pickTextProvider(keys, preferred) {
  // Priority order matters for daily quota distribution:
  // - Gemini: 1M tokens/day free (most generous — use for heavy gen tasks)
  // - Anthropic: paid but best quality (use when explicitly preferred)
  // - Groq: 100k tokens/day free (preserve for chatbot tool-calling)
  const order = preferred ? [preferred] : []
  order.push('gemini', 'anthropic', 'groq')
  for (const p of order) {
    if (p === 'gemini' && keys.geminiKey) return 'gemini'
    if (p === 'anthropic' && keys.anthropicKey) return 'anthropic'
    if (p === 'groq' && keys.groqKey) return 'groq'
  }
  return null
}

// Wraps callText with auto-fallback when the primary provider returns 429.
async function callTextWithFallback({ keys, preferred, messages, json = false, maxTokens = 1024 }) {
  const tried = []
  // Try preferred first, then fall through other available providers.
  const candidates = []
  if (preferred && (
    (preferred === 'gemini' && keys.geminiKey) ||
    (preferred === 'anthropic' && keys.anthropicKey) ||
    (preferred === 'groq' && keys.groqKey)
  )) candidates.push(preferred)
  if (keys.geminiKey && !candidates.includes('gemini')) candidates.push('gemini')
  if (keys.anthropicKey && !candidates.includes('anthropic')) candidates.push('anthropic')
  if (keys.groqKey && !candidates.includes('groq')) candidates.push('groq')

  let lastErr
  for (const p of candidates) {
    try {
      const out = await callText({ provider: p, keys, messages, json, maxTokens })
      return { ...out, _provider: p, _tried: tried }
    } catch (err) {
      tried.push({ provider: p, error: err.message, status: err.status })
      const isRateLimit = err.status === 429 || /rate.?limit/i.test(err.message || '')
      if (!isRateLimit) {
        // Non-quota error — surface it instead of silently falling through.
        err._provider = p
        err._tried = tried
        throw err
      }
      lastErr = err
    }
  }
  const e = lastErr || new Error('No text provider available')
  e._tried = tried
  throw e
}

async function callText({ provider, keys, messages, json = false, maxTokens = 1024 }) {
  if (provider === 'groq') {
    return groq.chat({ apiKey: keys.groqKey, messages, json, maxTokens })
  }
  if (provider === 'gemini') {
    return gemini.chat({ apiKey: keys.geminiKey, messages, json, maxTokens })
  }
  if (provider === 'anthropic') {
    return anthropic.chat({ apiKey: keys.anthropicKey, messages, maxTokens })
  }
  const e = new Error('No AI key configured. Add at least one (Groq, Gemini, or Anthropic) in Settings.')
  e.status = 400
  throw e
}

function safeParseJson(text) {
  if (!text) return null
  try { return JSON.parse(text) } catch {}
  // Try to extract a fenced JSON block.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) {
    try { return JSON.parse(fence[1]) } catch {}
  }
  // Last-ditch: find the outermost { ... } or [ ... ].
  const m = text.match(/[{[][\s\S]*[}\]]/)
  if (m) {
    try { return JSON.parse(m[0]) } catch {}
  }
  return null
}

// --- POST /api/ai/generate-copy ---
// body: { brand, audience, points, tone?, provider? }
router.post('/generate-copy', requireAuth, asyncRoute(async (req, res) => {
  const { brand, audience, points = [], tone = 'confident, modern', provider: preferred } = req.body || {}
  if (!brand && !audience) return res.status(400).json({ error: 'brand or audience required' })

  const keys = await loadKeys(req.user.id)
  const provider = pickTextProvider(keys, preferred)
  if (!provider) {
    return res.status(400).json({ error: 'No LLM key configured. Add a Groq, Gemini, or Anthropic key in Settings.' })
  }

  const prompt = [
    { role: 'system', content: 'You are an expert performance ad copywriter. Always return valid JSON. Keep headlines under 8 words and body copy under 2 sentences.' },
    { role: 'user', content: `Generate ad copy as JSON: {"headlines": ["..."], "body": "...", "cta": "..."}.\n\nBrand: ${brand || 'unspecified'}\nAudience: ${audience || 'unspecified'}\nKey points: ${(points || []).join(', ') || 'none provided'}\nTone: ${tone}\n\nProvide 3 headline variations and 1 body copy. Return ONLY the JSON object.` },
  ]

  let out
  try {
    out = await callTextWithFallback({ keys, preferred: preferred || provider, messages: prompt, json: true, maxTokens: 800 })
  } catch (err) {
    return res.status(err.status || 502).json({ error: err.message, tried: err._tried })
  }
  const parsed = safeParseJson(out.text) || {}
  res.json({
    headlines: Array.isArray(parsed.headlines) ? parsed.headlines : [],
    body: parsed.body || '',
    cta: parsed.cta || 'Learn more',
    provider: out._provider || provider,
    raw: parsed,
  })
}))

// --- POST /api/ai/generate-image ---
// body: { prompt, provider?, width?, height? }
// Strategy:
//   1. Try server-side fetch through providers in order (Pollinations →
//      Cloudflare → HuggingFace). If one returns bytes, save to /uploads.
//   2. If all server-side providers fail, return the Pollinations URL
//      anyway with `fallback: true`. The browser sometimes succeeds where
//      our server doesn't (different IP, different rate-limit bucket).
//   3. Frontend should `onError` -> show retry button if even fallback
//      load fails in the browser.
router.post('/generate-image', requireAuth, asyncRoute(async (req, res) => {
  const { prompt, provider = 'auto', width = 1024, height = 1024 } = req.body || {}
  if (!prompt) return res.status(400).json({ error: 'prompt required' })

  const keys = await loadKeys(req.user.id)
  try {
    const result = await imageLib.generate({ provider, prompt, keys, width, height })
    const ext = (result.contentType || '').includes('png') ? 'png' : 'jpg'
    const filename = `${req.user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const filepath = path.join(UPLOAD_DIR, filename)
    fs.writeFileSync(filepath, result.buffer)
    return res.json({
      url: `/uploads/${filename}`,
      provider: result.provider,
      model: result.model,
      bytes: result.buffer.length,
    })
  } catch (err) {
    // Fallback: hand the browser a Pollinations URL to try directly.
    const fallbackUrl = imageLib.pollinationsUrl(prompt, { width, height })
    console.warn('[ai] generate-image server fetch failed, returning fallback URL:', err.message)
    return res.json({
      url: fallbackUrl,
      provider: 'pollinations-direct',
      fallback: true,
      serverError: err.message,
    })
  }
}))

// --- POST /api/ai/analyze ---
// Entry point for CreateAd's "Analyze & Generate Ad" button. Single call that
// suggests targeting + headlines + body + CTA. Prefers Anthropic for quality
// (and uses vision when uploaded images are provided); falls back to Groq/Gemini.
// body: { description, mediaUrls?, productName? }
router.post('/analyze', requireAuth, asyncRoute(async (req, res) => {
  const { description, mediaUrls = [], productName } = req.body || {}
  if (!description && mediaUrls.length === 0) {
    return res.status(400).json({ error: 'description or mediaUrls required' })
  }

  const keys = await loadKeys(req.user.id)
  const provider = pickTextProvider(keys, 'anthropic')
  if (!provider) {
    return res.status(400).json({ error: 'No LLM key configured.' })
  }

  // Resolve relative /uploads/* URLs to absolute so Anthropic can fetch them.
  const absoluteImageUrls = (mediaUrls || []).map(u => {
    if (u.startsWith('/')) {
      const base = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`
      return base.replace(/\/$/, '') + u
    }
    return u
  })

  // Vision-capable providers (in priority order). Use whichever the user has.
  let visionProvider = null
  if (absoluteImageUrls.length > 0) {
    if (keys.anthropicKey) visionProvider = 'anthropic'
    else if (keys.geminiKey) visionProvider = 'gemini'
  }
  const useVision = !!visionProvider

  const visionInstr = useVision
    ? '\n\nIMPORTANT: The user has attached the actual product image. LOOK AT THE IMAGE and describe what you ACTUALLY SEE. Identify the product specifically (color, type, brand if visible, key features) and write copy that references real visible details — not generic marketing language. The first headline should call out a specific feature you can see.'
    : ''

  const messages = [
    { role: 'system', content: 'You are an expert direct-response marketer. Return ONLY valid JSON, no prose.' },
    { role: 'user', content: `Product description: ${description || '(image only — describe what you see and write ad copy about it)'}${productName ? `\nProduct name: ${productName}` : ''}${absoluteImageUrls.length ? `\nMedia provided: ${absoluteImageUrls.length} file(s)` : ''}${visionInstr}\n\nAnalyze the product, infer the ideal target audience, and produce ad copy.\n\nReturn JSON exactly in this shape:\n{\n  "audience": "1-sentence audience description",\n  "imageDescription": "${useVision ? '1-sentence factual description of what is in the image (so user knows AI saw it)' : 'leave empty'}",\n  "targeting": {\n    "demographics": ["..."],\n    "interests": ["..."],\n    "ageRange": "min-max",\n    "platforms": ["facebook", "instagram"]\n  },\n  "imagePrompt": "1-sentence prompt suitable for an image-generation model — only used if user did NOT upload their own image",\n  "copy": {\n    "headlines": ["3 short headline variations — first one MUST reference a real detail you can see in the image"],\n    "body": "1-2 sentences",\n    "cta": "2-3 word call-to-action"\n  }\n}` },
  ]

  let out
  try {
    if (visionProvider === 'anthropic') {
      out = await anthropic.chat({
        apiKey: keys.anthropicKey,
        messages,
        maxTokens: 1500,
        imageUrls: absoluteImageUrls,
      })
    } else if (visionProvider === 'gemini') {
      out = await gemini.chat({
        apiKey: keys.geminiKey,
        messages,
        maxTokens: 1500,
        imageUrls: absoluteImageUrls,
        json: true,
      })
    } else {
      out = await callTextWithFallback({ keys, preferred: provider, messages, json: provider !== 'anthropic', maxTokens: 1200 })
    }
  } catch (err) {
    return res.status(err.status || 502).json({ error: err.message, tried: err._tried })
  }

  const parsed = safeParseJson(out.text)
  if (!parsed) {
    return res.status(502).json({ error: 'AI returned non-JSON output', raw: out.text?.slice(0, 500) })
  }

  res.json({
    audience: parsed.audience || '',
    imageDescription: parsed.imageDescription || '',
    targeting: parsed.targeting || {},
    imagePrompt: parsed.imagePrompt || description,
    copy: parsed.copy || { headlines: [], body: '', cta: '' },
    provider,
    visionProvider: visionProvider || null,
    usedVision: useVision,
  })
}))

// --- POST /api/ai/generate-script ---
// Used by the video pipeline (B-7). Returns scenes + voiceover lines.
// body: { product, description, durationSec? }
router.post('/generate-script', requireAuth, asyncRoute(async (req, res) => {
  const { product, description, durationSec = 30 } = req.body || {}
  if (!product && !description) return res.status(400).json({ error: 'product or description required' })

  const keys = await loadKeys(req.user.id)
  const provider = pickTextProvider(keys)
  if (!provider) return res.status(400).json({ error: 'No LLM key configured.' })

  const sceneCount = Math.max(3, Math.min(6, Math.round(durationSec / 6)))
  const messages = [
    { role: 'system', content: 'You write punchy, high-conversion video ad scripts. Return ONLY valid JSON.' },
    { role: 'user', content: `Product: ${product || 'unspecified'}\nDescription: ${description || ''}\nTotal duration: ${durationSec} seconds (${sceneCount} scenes).\n\nReturn JSON:\n{\n  "hook": "first 3-second attention grabber, max 8 words",\n  "scenes": [\n    {\n      "description": "what the visual shows (image-gen prompt friendly)",\n      "voiceoverLine": "what the narrator says — 1 short sentence",\n      "durationSec": ${Math.round(durationSec / sceneCount)}\n    }\n  ],\n  "cta": "final 2-3 word CTA"\n}\n\nProduce exactly ${sceneCount} scenes.` },
  ]

  let out
  try {
    out = await callTextWithFallback({ keys, preferred: provider, messages, json: provider !== 'anthropic', maxTokens: 1500 })
  } catch (err) {
    return res.status(err.status || 502).json({ error: err.message, tried: err._tried })
  }
  const parsed = safeParseJson(out.text)
  if (!parsed) {
    return res.status(502).json({ error: 'AI returned non-JSON', raw: out.text?.slice(0, 500) })
  }

  res.json({
    hook: parsed.hook || '',
    scenes: Array.isArray(parsed.scenes) ? parsed.scenes : [],
    cta: parsed.cta || 'Learn more',
    provider,
  })
}))

export default router
