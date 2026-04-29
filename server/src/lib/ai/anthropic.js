// Anthropic Messages API wrapper (raw fetch — no SDK install needed).
// Reference: https://docs.anthropic.com/en/api/messages

const ENDPOINT = 'https://api.anthropic.com/v1/messages'
const VERSION = '2023-06-01'

export async function chat({ apiKey, messages, model = 'claude-sonnet-4-6', temperature = 0.7, maxTokens = 2048, system }) {
  if (!apiKey) {
    const e = new Error('Anthropic API key not configured. Add it in Settings.')
    e.status = 400
    throw e
  }

  // Anthropic uses a separate `system` field, not a system message in the array.
  const sysFromMessages = messages.find(m => m.role === 'system')?.content
  const userTurns = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }))

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
