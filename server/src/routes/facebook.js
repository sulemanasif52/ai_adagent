import { Router } from 'express'
import { requireAuth } from '../auth/middleware.js'
import { prisma } from '../db.js'
import { decrypt } from '../lib/crypto.js'
import {
  getPageProfile,
  getPageInsights,
  getPagePosts,
  getPostInsights,
} from '../lib/facebook.js'

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

export default router
