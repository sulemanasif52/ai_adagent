// Batch-classify IG comments via Groq. Cheap (free tier) and good enough for
// {positive | neutral | negative | question} + intent labels. Stores results
// in IgCommentAnalysis so we never re-classify the same comment.

import { prisma } from '../db.js'
import { decrypt } from '../lib/crypto.js'
import * as groq from '../lib/ai/groq.js'
import * as gemini from '../lib/ai/gemini.js'

function safeJson(s) {
  if (!s) return null
  try { return JSON.parse(s) } catch {}
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) try { return JSON.parse(fence[1]) } catch {}
  const m = s.match(/[{[][\s\S]*[}\]]/)
  if (m) try { return JSON.parse(m[0]) } catch {}
  return null
}

const SYSTEM = `You are a precise comment classifier for an Instagram analytics tool.
For each comment, return:
- sentiment: "positive" | "neutral" | "negative" | "question"
- intent: "praise" | "complaint" | "question" | "spam" | "other"
- confidence: 0.0–1.0

Always return ONLY valid JSON in the form: {"results": [{"id": "...", "sentiment": "...", "intent": "...", "confidence": 0.95}, ...]}`

export async function classifyUnanalyzedComments(userId, { batchSize = 30, maxBatches = 10 } = {}) {
  const keys = await prisma.byokKey.findUnique({ where: { userId } })
  const groqKey = keys?.groqKey ? decrypt(keys.groqKey) : null
  const geminiKey = keys?.geminiKey ? decrypt(keys.geminiKey) : null
  if (!groqKey && !geminiKey) {
    return { skipped: 'no_llm_key', classified: 0 }
  }

  let totalClassified = 0
  for (let i = 0; i < maxBatches; i++) {
    // Get unanalyzed comments scoped to user's posts.
    const comments = await prisma.igComment.findMany({
      where: {
        analysis: null,
        post: { userId },
      },
      take: batchSize,
      orderBy: { timestamp: 'desc' },
    })
    if (!comments.length) break

    const userPrompt = `Classify these ${comments.length} comments. Return JSON {"results":[...]}.\n\n` +
      comments.map((c, idx) => `${idx + 1}. id=${c.id} username=${c.username || 'anon'} text=${JSON.stringify(c.text || '')}`).join('\n')

    let result
    try {
      if (groqKey) {
        result = await groq.chat({
          apiKey: groqKey,
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: userPrompt },
          ],
          json: true,
          maxTokens: 2000,
        })
      } else {
        result = await gemini.chat({
          apiKey: geminiKey,
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: userPrompt },
          ],
          json: true,
          maxTokens: 2000,
        })
      }
    } catch (err) {
      console.warn('[sentiment] LLM call failed:', err.message)
      break
    }

    const parsed = safeJson(result.text)
    const results = parsed?.results || []
    if (!results.length) {
      console.warn('[sentiment] empty/invalid LLM output, stopping batch loop')
      break
    }

    // Persist. Use a Set lookup so we never double-insert.
    const knownIds = new Set(comments.map(c => c.id))
    for (const r of results) {
      if (!r.id || !knownIds.has(r.id)) continue
      const sentiment = ['positive', 'neutral', 'negative', 'question'].includes(r.sentiment) ? r.sentiment : 'neutral'
      const intent = ['praise', 'complaint', 'question', 'spam', 'other'].includes(r.intent) ? r.intent : null
      const confidence = typeof r.confidence === 'number' ? Math.max(0, Math.min(1, r.confidence)) : 0.5
      await prisma.igCommentAnalysis.upsert({
        where: { commentId: r.id },
        create: { commentId: r.id, sentiment, intent, confidence },
        update: { sentiment, intent, confidence, analyzedAt: new Date() },
      }).catch(err => console.warn('[sentiment] upsert failed:', r.id, err.message))
      totalClassified++
    }

    // If the LLM returned fewer rows than we asked, the rest of this batch
    // would just keep getting picked up next loop. Break to avoid wasting budget.
    if (results.length < comments.length) break
  }

  return { classified: totalClassified }
}
