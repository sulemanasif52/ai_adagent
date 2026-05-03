// Google Gemini chat wrapper (free tier: 15 RPM, 1M tokens/day).
// Reference: https://ai.google.dev/api/generate-content
// Vision support: pass `imageUrls` and they're attached as inlineData blobs.

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

async function imageUrlToBase64(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`)
  const ct = res.headers.get('content-type') || 'image/jpeg'
  const buf = Buffer.from(await res.arrayBuffer())
  return { mediaType: ct.split(';')[0], data: buf.toString('base64') }
}

// Convert OpenAI-style messages to Gemini "contents" format.
function toGemini(messages) {
  // Gemini doesn't have a "system" role — fold any system message into the
  // first user turn as a prefix.
  const system = messages.find(m => m.role === 'system')?.content
  const rest = messages.filter(m => m.role !== 'system')
  const contents = rest.map((m, idx) => {
    let text = m.content
    if (idx === 0 && system) text = `${system}\n\n${text}`
    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text }],
    }
  })
  return contents
}

export async function chat({ apiKey, messages, model = 'gemini-2.0-flash-exp', temperature = 0.7, maxTokens = 2048, json = false, imageUrls = [] }) {
  if (!apiKey) {
    const e = new Error('Gemini API key not configured. Add it in Settings.')
    e.status = 400
    throw e
  }
  const url = `${BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`

  const contents = toGemini(messages)

  // Attach image parts to the LAST user turn so the model "sees" the image.
  if (imageUrls.length > 0 && contents.length > 0) {
    const lastUserIdx = (() => {
      for (let i = contents.length - 1; i >= 0; i--) if (contents[i].role === 'user') return i
      return -1
    })()
    if (lastUserIdx >= 0) {
      const imageParts = []
      for (const u of imageUrls.slice(0, 4)) {
        try {
          const { mediaType, data } = await imageUrlToBase64(u)
          imageParts.push({ inlineData: { mimeType: mediaType, data } })
        } catch (err) {
          console.warn('[gemini] image fetch failed:', u, err.message)
        }
      }
      if (imageParts.length > 0) {
        contents[lastUserIdx] = {
          role: 'user',
          parts: [...imageParts, ...contents[lastUserIdx].parts],
        }
      }
    }
  }

  const body = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      ...(json ? { responseMimeType: 'application/json' } : {}),
    },
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) {
    const e = new Error(data?.error?.message || `Gemini ${res.status}`)
    e.status = res.status
    e.payload = data
    throw e
  }
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || ''
  return { text, raw: data }
}
