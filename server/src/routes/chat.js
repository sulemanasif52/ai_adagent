import { Router } from 'express'
import { requireAuth } from '../auth/middleware.js'
import { prisma } from '../db.js'
import { decrypt } from '../lib/crypto.js'
import * as groq from '../lib/ai/groq.js'
import { TOOL_DEFS, runTool } from '../lib/chat-tools.js'

const router = Router()

const SYSTEM_PROMPT = `You are an AI marketing assistant inside the AIMarket Pro app. You help the user understand their Instagram performance, campaigns, leads, and content strategy.

Always:
- Use the provided tools to ground your answers in the user's REAL data. Never fabricate numbers.
- Be brief (2-4 sentences typical) unless the user asks for detail.
- When showing numbers, format them clearly (e.g. "1,247 reach" not "1247").
- If a tool returns { error }, mention the issue (e.g. "Instagram isn't connected yet") rather than guessing.
- If asked something the tools can't answer, say so honestly.`

const MAX_TOOL_HOPS = 4

// SSE helper
function sse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

// --- POST /api/chat/completions ---
// body: { messages: [{role, content}, ...] }
// Streams Server-Sent Events with chunks: {type: "text"|"tool"|"done"|"error", ...}
router.post('/completions', requireAuth, async (req, res) => {
  const userMessages = Array.isArray(req.body?.messages) ? req.body.messages : []
  if (!userMessages.length) {
    return res.status(400).json({ error: 'messages required' })
  }

  const keys = await prisma.byokKey.findUnique({ where: { userId: req.user.id } })
  const groqKey = keys?.groqKey ? decrypt(keys.groqKey) : null
  if (!groqKey) {
    return res.status(400).json({ error: 'Groq key not configured. Add it in Settings to use the chatbot.' })
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()

  // Build conversation: prepend system prompt.
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...userMessages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : (m.role === 'system' ? 'system' : 'user'),
    content: String(m.content || ''),
  }))]

  try {
    let hops = 0
    while (hops < MAX_TOOL_HOPS) {
      hops++
      // Non-streaming call so we can cleanly detect tool_calls.
      const result = await groq.chat({
        apiKey: groqKey,
        messages,
        tools: TOOL_DEFS,
        toolChoice: 'auto',
        maxTokens: 1024,
      })

      const toolCalls = result.toolCalls || []
      if (toolCalls.length > 0) {
        // Notify the client a tool is running.
        for (const tc of toolCalls) {
          sse(res, { type: 'tool_start', name: tc.function?.name, id: tc.id })
        }

        // Push the assistant's tool-call message into history.
        messages.push({
          role: 'assistant',
          content: result.text || '',
          tool_calls: toolCalls,
        })

        // Execute every tool call sequentially.
        for (const tc of toolCalls) {
          let args = {}
          try { args = JSON.parse(tc.function?.arguments || '{}') } catch {}
          const out = await runTool(tc.function?.name, args, req.user.id)
          sse(res, { type: 'tool_result', name: tc.function?.name, id: tc.id, result: out })
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(out).slice(0, 8000),
          })
        }
        continue // loop again so the model can use the tool results
      }

      // No tool calls — we have the final answer. Stream it word-by-word
      // so the UI feels live (Groq's actual streaming would be cleaner but
      // this avoids re-sending tools mid-stream).
      const text = result.text || ''
      const words = text.split(/(\s+)/)
      for (const w of words) {
        if (!w) continue
        sse(res, { type: 'text', delta: w })
        // tiny delay so the stream is visible (skip in tests via env flag)
        if (process.env.NODE_ENV !== 'test') await sleep(15)
      }
      sse(res, { type: 'done' })
      return res.end()
    }

    sse(res, { type: 'error', error: 'Tool-call loop exceeded' })
    res.end()
  } catch (err) {
    console.error('[chat] error:', err)
    sse(res, { type: 'error', error: err.message || 'chat failed' })
    res.end()
  }
})

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

export default router
