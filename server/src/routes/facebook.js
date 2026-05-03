import { Router } from 'express'
import { requireAuth } from '../auth/middleware.js'
import { prisma } from '../db.js'
import { decrypt } from '../lib/crypto.js'
import {
  getPageProfile,
  getPageInsights,
  getPagePosts,
  getPostInsights,
  getPagePostComments,
  publishPagePost,
} from '../lib/facebook.js'
import * as groq from '../lib/ai/groq.js'

const router = Router()

async function loadPageCredentials(userId) {
  const cred = await prisma.metaCredential.findUnique({ where: { userId } })
  if (!cred) {
    const e = new Error('No Meta credentials. Please log in with Facebook again.')
    e.status = 401
    throw e
  }
  if (!cred.pageId || !cred.pageAccessToken) {
    const e = new Error('No Facebook Page connected. Make sure your Facebook account manages at least one Page, then log in again.')
    e.status = 412
    throw e
  }
  return {
    pageId: cred.pageId,
    pageName: cred.pageName,
    pageToken: decrypt(cred.pageAccessToken),
    lastSyncedAt: cred.lastSyncedAt,
  }
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

// --- /api/facebook/page ---
router.get('/page', requireAuth, asyncRoute(async (req, res) => {
  const cred = await loadPageCredentials(req.user.id)
  const profile = await getPageProfile(cred.pageId, cred.pageToken)
  res.json({
    id: profile.id,
    name: profile.name,
    about: profile.about ?? null,
    category: profile.category ?? null,
    fanCount: profile.fan_count ?? 0,
    followers: profile.followers_count ?? 0,
    avatar: profile.picture?.data?.url ?? null,
    link: profile.link ?? null,
    verified: profile.verification_status === 'blue_verified' || profile.verification_status === 'gray_verified',
    lastSyncedAt: cred.lastSyncedAt,
  })
}))

// --- /api/facebook/page/insights?days=7 ---
router.get('/page/insights', requireAuth, asyncRoute(async (req, res) => {
  const cred = await loadPageCredentials(req.user.id)
  const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90)
  const until = Math.floor(Date.now() / 1000)
  const since = until - days * 86400

  const live = await getPageInsights(cred.pageId, cred.pageToken, { since, until })

  const series = {}
  const totals = {}
  for (const m of (live.data || [])) {
    if (Array.isArray(m.values) && m.values.length) {
      const points = m.values.map(v => ({
        date: v.end_time?.slice(0, 10),
        value: typeof v.value === 'object' ? Object.values(v.value).reduce((a, b) => a + b, 0) : (v.value || 0),
      }))
      series[m.name] = points
      // also derive totals so UI can render headline cards
      totals[m.name] = points.reduce((a, p) => a + (p.value || 0), 0)
    } else if (m.total_value) {
      totals[m.name] = m.total_value.value || 0
    }
  }
  res.json({ days, series, totals })
}))

// --- /api/facebook/page/posts?limit=12 ---
router.get('/page/posts', requireAuth, asyncRoute(async (req, res) => {
  const cred = await loadPageCredentials(req.user.id)
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50)
  const posts = await getPagePosts(cred.pageId, cred.pageToken, { limit })
  res.json({
    posts: posts.map(p => ({
      id: p.id,
      message: p.message ?? '',
      createdAt: p.created_time,
      permalink: p.permalink_url ?? null,
      image: p.full_picture ?? null,
      mediaType: p.attachments?.data?.[0]?.media_type ?? null,
      reactions: p.reactions?.summary?.total_count ?? 0,
      comments: p.comments?.summary?.total_count ?? 0,
      shares: p.shares?.count ?? 0,
    })),
  })
}))

// --- /api/facebook/page/posts/:id/comments ---
// Fetches comments + (if Groq key set) classifies sentiment inline so the
// frontend Comments tab can render IG + FB side-by-side with sentiment dots.
router.get('/page/posts/:id/comments', requireAuth, asyncRoute(async (req, res) => {
  const cred = await loadPageCredentials(req.user.id)
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100)

  const raw = await getPagePostComments(req.params.id, cred.pageToken, { limit })
  let comments = raw.map(c => ({
    id: c.id,
    text: c.message || '',
    username: c.from?.name || null,
    timestamp: c.created_time ? new Date(c.created_time).toISOString() : null,
    likeCount: c.like_count ?? 0,
    network: 'facebook',
    analysis: null,
  }))

  // Inline sentiment via Groq if available + comments to classify.
  const keys = await prisma.byokKey.findUnique({ where: { userId: req.user.id } })
  if (keys?.groqKey && comments.length > 0) {
    try {
      const apiKey = (await import('../lib/crypto.js')).decrypt(keys.groqKey)
      const prompt = `Classify these ${comments.length} Facebook comments. Return ONLY JSON {"results":[{"id":"...","sentiment":"positive|neutral|negative|question","intent":"praise|complaint|question|spam|other","confidence":0.0-1.0}]}.\n\n` +
        comments.map((c, i) => `${i + 1}. id=${c.id} text=${JSON.stringify(c.text)}`).join('\n')
      const out = await groq.chat({
        apiKey,
        messages: [
          { role: 'system', content: 'You are a precise comment classifier. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        json: true,
        maxTokens: 1500,
      })
      const parsed = JSON.parse(out.text.match(/\{[\s\S]*\}/)?.[0] || '{}')
      const byId = new Map((parsed.results || []).map(r => [r.id, r]))
      comments = comments.map(c => {
        const a = byId.get(c.id)
        return a ? { ...c, analysis: { sentiment: a.sentiment, intent: a.intent || null, confidence: a.confidence ?? 0.5 } } : c
      })
    } catch (err) {
      console.warn('[fb-comments] sentiment classify failed:', err.message)
    }
  }

  res.json({ comments })
}))

// --- /api/facebook/page/posts/:id/insights ---
router.get('/page/posts/:id/insights', requireAuth, asyncRoute(async (req, res) => {
  const cred = await loadPageCredentials(req.user.id)
  const live = await getPostInsights(req.params.id, cred.pageToken)
  const flat = {}
  for (const m of (live.data || [])) {
    flat[m.name] = m.values?.[0]?.value ?? 0
  }
  res.json({ insights: flat })
}))

// --- POST /api/facebook/page/publish ---
// Body: { message?, imageUrl?, campaignId? }
// Posts to the user's connected FB Page. Either message or imageUrl required.
// Requires `pages_manage_posts` scope on the Page Access Token.
router.post('/page/publish', requireAuth, asyncRoute(async (req, res) => {
  const cred = await loadPageCredentials(req.user.id)
  let { message, imageUrl, campaignId } = req.body || {}
  if (!message && !imageUrl) {
    return res.status(400).json({ error: 'message or imageUrl required' })
  }

  if (imageUrl && imageUrl.startsWith('/')) {
    const base = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`
    imageUrl = base.replace(/\/$/, '') + imageUrl
  }

  try {
    const result = await publishPagePost(cred.pageId, cred.pageToken, { message, imageUrl })
    res.json({
      ok: true,
      network: 'facebook',
      postId: result.id,
      permalink: `https://www.facebook.com/${result.id}`,
    })
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message, code: err.code, payload: err.payload })
  }
}))

export default router
