// Image generation across multiple free providers. Default is Pollinations
// (URL-only, no API key). Falls back through HuggingFace and Cloudflare
// Workers AI when keys are present.

const POLLINATIONS = 'https://image.pollinations.ai/prompt'
const HF_MODEL = 'black-forest-labs/FLUX.1-schnell'
const CF_MODEL = '@cf/black-forest-labs/flux-1-schnell'

// Pollinations.ai is free + URL-only. Returns a URL the browser can load
// directly — image is rendered server-side at request time.
export function pollinationsUrl(prompt, { width = 1024, height = 1024, seed } = {}) {
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    nologo: 'true',
    enhance: 'true',
  })
  if (seed) params.set('seed', String(seed))
  return `${POLLINATIONS}/${encodeURIComponent(prompt)}?${params.toString()}`
}

// HuggingFace Inference API — returns a binary blob; we save it to disk and
// return the served URL. Requires hfToken.
export async function huggingFaceImage({ apiKey, prompt, model = HF_MODEL, width = 1024, height = 1024 }) {
  if (!apiKey) {
    const e = new Error('HuggingFace token not configured.')
    e.status = 400
    throw e
  }
  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { width, height },
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const e = new Error(`HuggingFace ${res.status}: ${text.slice(0, 200)}`)
    e.status = res.status
    throw e
  }
  return Buffer.from(await res.arrayBuffer())
}

// Cloudflare Workers AI — returns binary PNG. Requires accountId + token.
export async function cloudflareImage({ accountId, apiKey, prompt, model = CF_MODEL }) {
  if (!apiKey || !accountId) {
    const e = new Error('Cloudflare account ID + token required.')
    e.status = 400
    throw e
  }
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const e = new Error(`Cloudflare ${res.status}: ${text.slice(0, 200)}`)
    e.status = res.status
    throw e
  }
  // CF returns JSON wrapping a base64 image for some models, raw bytes for others.
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    const data = await res.json()
    const b64 = data?.result?.image
    if (!b64) throw new Error('Cloudflare returned no image data')
    return Buffer.from(b64, 'base64')
  }
  return Buffer.from(await res.arrayBuffer())
}

// Unified entry point. provider = 'pollinations' | 'huggingface' | 'cloudflare'.
// For pollinations returns { url, provider } directly (no download).
// For others returns { buffer, provider } — caller must save to disk.
export async function generate({ provider = 'pollinations', prompt, keys = {}, width = 1024, height = 1024 }) {
  if (provider === 'pollinations') {
    return { url: pollinationsUrl(prompt, { width, height }), provider }
  }
  if (provider === 'huggingface') {
    const buffer = await huggingFaceImage({ apiKey: keys.hfToken, prompt, width, height })
    return { buffer, provider }
  }
  if (provider === 'cloudflare') {
    const buffer = await cloudflareImage({
      accountId: keys.cloudflareAccount,
      apiKey: keys.cloudflareToken,
      prompt,
    })
    return { buffer, provider }
  }
  throw new Error(`Unknown image provider: ${provider}`)
}
