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
  const order = preferred ? [preferred] : []
  order.push('groq', 'gemini', 'anthropic')
  for (const p of order) {
    if (p === 'groq' && keys.groqKey) return 'groq'
    if (p === 'gemini' && keys.geminiKey) return 'gemini'
    if (p === 'anthropic' && keys.anthropicKey) return 'anthropic'
  }
  return null
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

  const out = await callText({ provider, keys, messages: prompt, json: true, maxTokens: 800 })
  const parsed = safeParseJson(out.text) || {}
  res.json({
    headlines: Array.isArray(parsed.headlines) ? parsed.headlines : [],
    body: parsed.body || '',
    cta: parsed.cta || 'Learn more',
    provider,
    raw: parsed,
  })
}))

// --- POST /api/ai/generate-image ---
// body: { prompt, provider?, width?, height? }
router.post('/generate-image', requireAuth, asyncRoute(async (req, res) => {
  const { prompt, provider = 'pollinations', width = 1024, height = 1024 } = req.body || {}
  if (!prompt) return res.status(400).json({ error: 'prompt required' })

  const keys = await loadKeys(req.user.id)
  const result = await imageLib.generate({ provider, prompt, keys, width, height })

  if (result.url) {
    return res.json({ url: result.url, provider: result.provider })
  }

  // Provider returned a buffer — save to /uploads and serve via static route.
  const filename = `${req.user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`
  const filepath = path.join(UPLOAD_DIR, filename)
  fs.writeFileSync(filepath, result.buffer)
  res.json({ url: `/uploads/${filename}`, provider: result.provider })
}))

// --- POST /api/ai/analyze ---
// Entry point for CreateAd's "Analyze & Generate Ad" button. Single call that
// suggests targeting + headlines + body + CTA. Prefers Anthropic for quality;
// falls back to Groq/Gemini.
// body: { description, mediaUrls?, productName? }
router.post('/analyze', requireAuth, asyncRoute(async (req, res) => {
  const { description, mediaUrls = [], productName } = req.body || {}
  if (!description) return res.status(400).json({ error: 'description required' })

  const keys = await loadKeys(req.user.id)
  const provider = pickTextProvider(keys, 'anthropic')
  if (!provider) {
    return res.status(400).json({ error: 'No LLM key configured.' })
  }

  const messages = [
    { role: 'system', content: 'You are an expert direct-response marketer. Return ONLY valid JSON, no prose.' },
    { role: 'user', content: `Product description: ${description}${productName ? `\nProduct name: ${productName}` : ''}${mediaUrls.length ? `\nMedia provided: ${mediaUrls.length} file(s)` : ''}\n\nAnalyze the product, infer the ideal target audience, and produce ad copy.\n\nReturn JSON exactly in this shape:\n{\n  "audience": "1-sentence audience description",\n  "targeting": {\n    "demographics": ["..."],\n    "interests": ["..."],\n    "ageRange": "min-max",\n    "platforms": ["facebook", "instagram"]\n  },\n  "imagePrompt": "1-sentence prompt suitable for an image-generation model",\n  "copy": {\n    "headlines": ["3 short headline variations"],\n    "body": "1-2 sentences",\n    "cta": "2-3 word call-to-action"\n  }\n}` },
  ]

  const out = await callText({ provider, keys, messages, json: provider !== 'anthropic', maxTokens: 1200 })
  const parsed = safeParseJson(out.text)
  if (!parsed) {
    return res.status(502).json({ error: 'AI returned non-JSON output', raw: out.text?.slice(0, 500) })
  }

  res.json({
    audience: parsed.audience || '',
    targeting: parsed.targeting || {},
    imagePrompt: parsed.imagePrompt || description,
    copy: parsed.copy || { headlines: [], body: '', cta: '' },
    provider,
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

  const out = await callText({ provider, keys, messages, json: provider !== 'anthropic', maxTokens: 1500 })
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
