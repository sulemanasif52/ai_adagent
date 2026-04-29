// Groq chat completions wrapper. Free tier 30 req/min, ~6k tokens/min.
// Reference: https://console.groq.com/docs/api-reference

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

export async function chat({ apiKey, messages, model = 'llama-3.3-70b-versatile', temperature = 0.7, maxTokens = 2048, json = false, tools, toolChoice, stream = false }) {
  if (!apiKey) {
    const e = new Error('Groq API key not configured. Add it in Settings.')
    e.status = 400
    throw e
  }
  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream,
  }
  if (json) body.response_format = { type: 'json_object' }
  if (tools) body.tools = tools
  if (toolChoice) body.tool_choice = toolChoice

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (stream) return res // caller pipes the SSE body itself

  const data = await res.json()
  if (!res.ok) {
    const e = new Error(data?.error?.message || `Groq ${res.status}`)
    e.status = res.status
    e.payload = data
    throw e
  }
  const choice = data.choices?.[0]
  return {
    text: choice?.message?.content || '',
    toolCalls: choice?.message?.tool_calls || null,
    finishReason: choice?.finish_reason,
    usage: data.usage,
    raw: data,
  }
}
