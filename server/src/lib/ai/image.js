// Image generation across multiple free providers. Server fetches the image
// bytes itself, so the browser never has to load a flaky third-party URL.
// Order tried (when caller passes provider='auto'):
//   1. Pollinations (free, no key) — with retries on 429
//   2. HuggingFace FLUX (free, slower) — if hfToken set
//   3. Cloudflare Workers AI FLUX (free 10k/day) — if both CF keys set

const POLLINATIONS = 'https://image.pollinations.ai/prompt'
const HF_MODEL = 'black-forest-labs/FLUX.1-schnell'
const CF_MODEL = '@cf/black-forest-labs/flux-1-schnell'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// Build a Pollinations URL — useful when we want to embed without server fetch.
// `referrer=aimarketpro` is recognized by Pollinations to relax rate limits
// for known apps (per their docs).
export function pollinationsUrl(prompt, { width = 1024, height = 1024, seed, model = 'flux' } = {}) {
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    nologo: 'true',
    enhance: 'true',
    nofeed: 'true',
    referrer: 'aimarketpro',
    model,
  })
  if (seed) params.set('seed', String(seed))
  return `${POLLINATIONS}/${encodeURIComponent(prompt)}?${params.toString()}`
}

// Fetch the actual image bytes from Pollinations. Tries multiple models on
// 429/5xx since each model has its own rate-limit bucket. Returns Buffer or
// throws.
export async function pollinationsImage({ prompt, width = 1024, height = 1024, seed }) {
  // Attempt order: try the most-available models first.
  const attempts = [
    { model: 'flux', delay: 0 },
    { model: 'turbo', delay: 1000 },
    { model: 'flux-schnell', delay: 2000 },
    { model: 'flux', delay: 3500 },  // one final retry
  ]

  let lastErr
  for (const { model, delay } of attempts) {
    if (delay > 0) await sleep(delay + Math.random() * 500)
    const url = pollinationsUrl(prompt, { width, height, seed, model })
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'AIMarketPro/0.1 (+https://aimarket-pro-production.up.railway.app)',
          Accept: 'image/jpeg,image/png,image/webp,image/*;q=0.8',
          Referer: 'https://aimarket-pro-production.up.railway.app/',
        },
      })
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`Pollinations(${model}) ${res.status}`)
        continue
      }
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        lastErr = new Error(`Pollinations(${model}) ${res.status}: ${txt.slice(0, 120)}`)
        continue
      }
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 1000) {
        lastErr = new Error(`Pollinations(${model}) tiny payload (${buf.length} bytes)`)
        continue
      }
      return { buffer: buf, contentType: res.headers.get('content-type') || 'image/jpeg', model }
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr || new Error('Pollinations failed after all model attempts')
}

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
  return { buffer: Buffer.from(await res.arrayBuffer()), contentType: 'image/jpeg' }
}

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
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    const data = await res.json()
    const b64 = data?.result?.image
    if (!b64) throw new Error('Cloudflare returned no image data')
    return { buffer: Buffer.from(b64, 'base64'), contentType: 'image/png' }
  }
  return { buffer: Buffer.from(await res.arrayBuffer()), contentType: ct || 'image/png' }
}

// Auto mode: try providers in priority order, fall back on failure. Always
// returns image bytes so the route handler can save them to /uploads and
// return a local URL the browser can load reliably.
export async function generate({ provider = 'auto', prompt, keys = {}, width = 1024, height = 1024 }) {
  if (!prompt || !prompt.trim()) {
    const e = new Error('image prompt required')
    e.status = 400
    throw e
  }

  const order = []
  if (provider === 'auto') {
    order.push('pollinations')
    if (keys.cloudflareAccount && keys.cloudflareToken) order.push('cloudflare')
    if (keys.hfToken) order.push('huggingface')
  } else {
    order.push(provider)
  }

  const errors = []
  for (const p of order) {
    try {
      if (p === 'pollinations') {
        const r = await pollinationsImage({ prompt, width, height })
        return { ...r, provider: p }
      }
      if (p === 'huggingface') {
        const r = await huggingFaceImage({ apiKey: keys.hfToken, prompt, width, height })
        return { ...r, provider: p }
      }
      if (p === 'cloudflare') {
        const r = await cloudflareImage({
          accountId: keys.cloudflareAccount,
          apiKey: keys.cloudflareToken,
          prompt,
        })
        return { ...r, provider: p }
      }
    } catch (err) {
      console.warn(`[image] provider=${p} failed:`, err.message)
      errors.push({ provider: p, error: err.message })
    }
  }

  const e = new Error(`All image providers failed: ${errors.map(x => `${x.provider}=${x.error}`).join('; ')}`)
  e.status = 502
  e.errors = errors
  throw e
}
