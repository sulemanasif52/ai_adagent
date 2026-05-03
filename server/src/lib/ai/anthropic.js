// Anthropic Messages API wrapper (raw fetch — no SDK install needed).
// Reference: https://docs.anthropic.com/en/api/messages

const ENDPOINT = 'https://api.anthropic.com/v1/messages'
const VERSION = '2023-06-01'

// Fetch an image URL and return base64 + media_type for Anthropic vision input.
async function imageUrlToBase64(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`)
  const ct = res.headers.get('content-type') || 'image/jpeg'
  const buf = Buffer.from(await res.arrayBuffer())
  return { mediaType: ct.split(';')[0], data: buf.toString('base64') }
}

// `messages` is the standard OpenAI-style array. To pass images, set
// `imageUrls` — they get attached to the LAST user message as a multimodal
// content block. Anthropic Sonnet/Haiku/Opus all support vision.
export async function chat({ apiKey, messages, model = 'claude-sonnet-4-6', temperature = 0.7, maxTokens = 2048, system, imageUrls = [] }) {
  if (!apiKey) {
    const e = new Error('Anthropic API key not configured. Add it in Settings.')
    e.status = 400
    throw e
  }

  const sysFromMessages = messages.find(m => m.role === 'system')?.content
  const userTurns = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }))

  // Attach images to the last user turn as multimodal content blocks.
  if (imageUrls.length > 0 && userTurns.length > 0) {
    const lastIdx = [...userTurns].reverse().findIndex(m => m.role === 'user')
    if (lastIdx >= 0) {
      const realIdx = userTurns.length - 1 - lastIdx
      const blocks = []
      for (const url of imageUrls.slice(0, 4)) {  // cap at 4 images
        try {
          const { mediaType, data } = await imageUrlToBase64(url)
          blocks.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data } })
        } catch (err) {
          console.warn('[anthropic] image fetch failed:', url, err.message)
        }
      }
      if (blocks.length > 0) {
        const originalText = userTurns[realIdx].content
        userTurns[realIdx] = {
          role: 'user',
          content: [...blocks, { type: 'text', text: originalText }],
        }
      }
    }
  }

  const body = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages: userTurns,
    ...(system || sysFromMessages ? { system: system || sysFromMessages } : {}),
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': VERSION,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) {
    const e = new Error(data?.error?.message || `Anthropic ${res.status}`)
    e.status = res.status
    e.payload = data
    throw e
  }
  const text = data?.content?.map(c => c.text).filter(Boolean).join('') || ''
  return { text, usage: data.usage, raw: data }
}
