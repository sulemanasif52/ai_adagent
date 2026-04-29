// Video ad generator. v1 = "slideshow payload": script + image URLs +
// voiceover MP3. Frontend plays it as a slideshow. No ffmpeg, $0 cost.
//
// If/when ffmpeg becomes available we'll upgrade to compose a real MP4 here.

import path from 'node:path'
import fs from 'node:fs'
import { prisma } from '../db.js'
import { decrypt } from './crypto.js'
import * as groq from './ai/groq.js'
import * as gemini from './ai/gemini.js'
import * as anthropic from './ai/anthropic.js'
import { generate as generateImage } from './ai/image.js'
import { synthesizeToFile, VOICES } from './tts.js'

const UPLOAD_DIR = process.env.NODE_ENV === 'production'
  ? '/data/uploads'
  : path.resolve(process.cwd(), 'uploads')

function safeJson(s) {
  if (!s) return null
  try { return JSON.parse(s) } catch {}
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) try { return JSON.parse(fence[1]) } catch {}
  const m = s.match(/[{[][\s\S]*[}\]]/)
  if (m) try { return JSON.parse(m[0]) } catch {}
  return null
}

async function loadKeys(userId) {
  const row = await prisma.byokKey.findUnique({ where: { userId } })
  if (!row) return {}
  return {
    groqKey: row.groqKey ? decrypt(row.groqKey) : null,
    geminiKey: row.geminiKey ? decrypt(row.geminiKey) : null,
    anthropicKey: row.anthropicKey ? decrypt(row.anthropicKey) : null,
    hfToken: row.hfToken ? decrypt(row.hfToken) : null,
    cloudflareAccount: row.cloudflareAccount || null,
    cloudflareToken: row.cloudflareToken ? decrypt(row.cloudflareToken) : null,
  }
}

async function callLLM(keys, messages, json = true, maxTokens = 1500) {
  if (keys.anthropicKey) return anthropic.chat({ apiKey: keys.anthropicKey, messages, maxTokens })
  if (keys.groqKey) return groq.chat({ apiKey: keys.groqKey, messages, json, maxTokens })
  if (keys.geminiKey) return gemini.chat({ apiKey: keys.geminiKey, messages, json, maxTokens })
  const e = new Error('No LLM key configured.')
  e.status = 400
  throw e
}

export async function generateSlideshowAd({ userId, product, description, durationSec = 30, voice = 'guy' }) {
  const keys = await loadKeys(userId)
  const sceneCount = Math.max(3, Math.min(6, Math.round(durationSec / 6)))
  const perScene = Math.round(durationSec / sceneCount)

  // 1. Generate script.
  const script = await callLLM(keys, [
    { role: 'system', content: 'You write punchy video ad scripts. Return ONLY valid JSON.' },
    { role: 'user', content: `Product: ${product || 'unspecified'}\nDescription: ${description || ''}\nTotal duration: ${durationSec}s, ${sceneCount} scenes (${perScene}s each).\n\nReturn JSON with this exact shape:\n{\n  "hook": "first 3-second attention grabber, max 8 words",\n  "scenes": [\n    {\n      "description": "vivid visual prompt suitable for an image generation model",\n      "voiceoverLine": "what the narrator says — 1 short sentence"\n    }\n  ],\n  "cta": "final 2-3 word call-to-action"\n}\n\nProduce exactly ${sceneCount} scenes.` },
  ])

  const parsed = safeJson(script.text)
  if (!parsed || !Array.isArray(parsed.scenes) || !parsed.scenes.length) {
    const e = new Error('LLM returned no scenes')
    e.status = 502
    e.raw = script.text?.slice(0, 500)
    throw e
  }

  // 2. Generate per-scene images server-side IN PARALLEL — saves to /uploads
  // and returns local URLs the browser can load reliably (avoids Pollinations
  // 429 rate-limits hitting the user's browser directly).
  const sceneImages = await Promise.all(parsed.scenes.slice(0, sceneCount).map(async (s, i) => {
    const prompt = s.description || product || 'product photo'
    try {
      const result = await generateImage({ provider: 'auto', prompt, keys, width: 1080, height: 1080 })
      const ext = (result.contentType || '').includes('png') ? 'png' : 'jpg'
      const filename = `scene-${userId}-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}.${ext}`
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), result.buffer)
      return { url: `/uploads/${filename}`, error: null }
    } catch (err) {
      console.warn(`[video] scene ${i} image failed:`, err.message)
      return { url: null, error: err.message }
    }
  }))

  const scenes = parsed.scenes.slice(0, sceneCount).map((s, i) => ({
    index: i,
    description: s.description || '',
    voiceoverLine: s.voiceoverLine || '',
    durationSec: perScene,
    imageUrl: sceneImages[i]?.url || null,
    imageError: sceneImages[i]?.error || null,
  }))

  // 3. Generate voiceover MP3 from concatenated script.
  const fullScript = [parsed.hook, ...scenes.map(s => s.voiceoverLine), parsed.cta]
    .filter(Boolean)
    .join(' ... ')

  let voiceoverUrl = null
  let voiceoverError = null
  try {
    const voiceId = VOICES[voice] || VOICES.guy
    const out = await synthesizeToFile({
      text: fullScript,
      voice: voiceId,
      outDir: UPLOAD_DIR,
      filenamePrefix: `voiceover-${userId}`,
    })
    voiceoverUrl = `/uploads/${out.filename}`
  } catch (err) {
    console.warn('[video] TTS failed (non-fatal):', err.message)
    voiceoverError = err.message
  }

  return {
    type: 'slideshow',
    hook: parsed.hook || '',
    cta: parsed.cta || '',
    scenes,
    voiceoverUrl,
    voiceoverError,
    voiceoverScript: fullScript,
    durationSec,
    generatedAt: new Date().toISOString(),
  }
}
