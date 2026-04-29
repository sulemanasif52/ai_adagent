// Google Gemini chat wrapper (free tier: 15 RPM, 1M tokens/day).
// Reference: https://ai.google.dev/api/generate-content

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

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

export async function chat({ apiKey, messages, model = 'gemini-2.0-flash-exp', temperature = 0.7, maxTokens = 2048, json = false }) {
  if (!apiKey) {
    const e = new Error('Gemini API key not configured. Add it in Settings.')
    e.status = 400
    throw e
  }
  const url = `${BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
  const body = {
    contents: toGemini(messages),
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
