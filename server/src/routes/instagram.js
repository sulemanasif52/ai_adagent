import { Router } from 'express'
import { requireAuth } from '../auth/middleware.js'
import { prisma } from '../db.js'
import { decrypt } from '../lib/crypto.js'
import {
  getAccountProfile,
  getAccountInsights,
  getMedia,
  getMediaInsights,
  getMediaComments,
  publishImageToInstagram,
} from '../lib/instagram.js'

const router = Router()

// Resolves IG credentials for the logged-in user, throwing 412 if not connected.
async function loadIgCredentials(userId) {
  const cred = await prisma.metaCredential.findUnique({ where: { userId } })
  if (!cred) {
    const e = new Error('No Meta credentials. Please log in with Facebook again.')
    e.status = 401
    throw e
  }
  if (!cred.igBusinessAccountId || !cred.pageAccessToken) {
    const e = new Error('Instagram is not connected. Make sure your IG is set to Business and linked to a Facebook Page, then log in again.')
    e.status = 412
    throw e
  }
  return {
    igId: cred.igBusinessAccountId,
    igUsername: cred.igUsername,
    pageToken: decrypt(cred.pageAccessToken),
    pageId: cred.pageId,
    pageName: cred.pageName,
    lastSyncedAt: cred.lastSyncedAt,
  }
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

// --- /api/instagram/account ---
router.get('/account', requireAuth, asyncRoute(async (req, res) => {
  const cred = await loadIgCredentials(req.user.id)
  const profile = await getAccountProfile(cred.igId, cred.pageToken)
  res.json({
    id: profile.id,
    username: profile.username,
    name: profile.name,
    avatar: profile.profile_picture_url,
    biography: profile.biography,
    website: profile.website,
    followers: profile.followers_count ?? 0,
    follows: profile.follows_count ?? 0,
    mediaCount: profile.media_count ?? 0,
    pageId: cred.pageId,
    pageName: cred.pageName,
    lastSyncedAt: cred.lastSyncedAt,
  })
}))

// --- /api/instagram/insights?days=7 ---
router.get('/insights', requireAuth, asyncRoute(async (req, res) => {
  const cred = await loadIgCredentials(req.user.id)
  const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90)
  const until = Math.floor(Date.now() / 1000)
  const since = until - days * 86400

  const live = await getAccountInsights(cred.igId, cred.pageToken, { since, until })

  // v21 returns two shapes: time-series (m.values[]) for `reach`, and
  // single totals (m.total_value.value) for everything else.
  const series = {}
  const totals = {}
  for (const m of (live.data || [])) {
    if (Array.isArray(m.values) && m.values.length) {
      series[m.name] = m.values.map(v => ({
        date: v.end_time?.slice(0, 10),
        value: v.value || 0,
      }))
    } else if (m.total_value) {
      totals[m.name] = m.total_value.value || 0
    }
  }
  res.json({ days, series, totals })
}))

// --- /api/instagram/posts ---
// Returns cached posts; pass ?fresh=1 to fetch from Graph API and update cache.
router.get('/posts', requireAuth, asyncRoute(async (req, res) => {
  const cred = await loadIgCredentials(req.user.id)
  const fresh = req.query.fresh === '1'
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50)

  if (fresh) {
    const live = await getMedia(cred.igId, cred.pageToken, { limit })
    for (const m of live) {
      await prisma.igPost.upsert({
        where: { id: m.id },
        create: {
          id: m.id,
          userId: req.user.id,
          caption: m.caption ?? null,
          mediaType: m.media_type,
          mediaUrl: m.media_url ?? null,
          permalink: m.permalink ?? null,
          thumbnailUrl: m.thumbnail_url ?? null,
          timestamp: new Date(m.timestamp),
          likeCount: m.like_count ?? 0,
          commentsCount: m.comments_count ?? 0,
        },
        update: {
          caption: m.caption ?? null,
          mediaType: m.media_type,
          mediaUrl: m.media_url ?? null,
          permalink: m.permalink ?? null,
          thumbnailUrl: m.thumbnail_url ?? null,
          likeCount: m.like_count ?? 0,
          commentsCount: m.comments_count ?? 0,
        },
      })
    }
    await prisma.metaCredential.update({
      where: { userId: req.user.id },
      data: { lastSyncedAt: new Date() },
    })
  }

  const cached = await prisma.igPost.findMany({
    where: { userId: req.user.id },
    orderBy: { timestamp: 'desc' },
    take: limit,
  })
  res.json({ posts: cached })
}))

// --- /api/instagram/posts/:id/insights ---
router.get('/posts/:id/insights', requireAuth, asyncRoute(async (req, res) => {
  const cred = await loadIgCredentials(req.user.id)
  const post = await prisma.igPost.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  })
  if (!post) return res.status(404).json({ error: 'post_not_found' })
  const live = await getMediaInsights(req.params.id, cred.pageToken)
  const flat = {}
  for (const m of (live.data || [])) {
    flat[m.name] = m.values?.[0]?.value ?? 0
  }
  await prisma.igPost.update({
    where: { id: req.params.id },
    data: { insightsJson: JSON.stringify(flat), insightsAt: new Date() },
  })
  res.json({ insights: flat })
}))

// --- /api/instagram/posts/:id/comments?fresh=1 ---
router.get('/posts/:id/comments', requireAuth, asyncRoute(async (req, res) => {
  const cred = await loadIgCredentials(req.user.id)
  const post = await prisma.igPost.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  })
  if (!post) return res.status(404).json({ error: 'post_not_found' })

  const fresh = req.query.fresh === '1'
  if (fresh) {
    const live = await getMediaComments(req.params.id, cred.pageToken, { limit: 100 })
    for (const c of live) {
      await prisma.igComment.upsert({
        where: { id: c.id },
        create: {
          id: c.id,
          postId: post.id,
          text: c.text || '',
          username: c.username ?? null,
          timestamp: new Date(c.timestamp),
          likeCount: c.like_count ?? 0,
        },
        update: {
          text: c.text || '',
          username: c.username ?? null,
          likeCount: c.like_count ?? 0,
        },
      })
    }
  }

  const comments = await prisma.igComment.findMany({
    where: { postId: post.id },
    orderBy: { timestamp: 'desc' },
    take: 200,
  })
  res.json({ comments })
}))

// --- POST /api/instagram/sync ---
// Force a full refresh: posts + their per-post insights + a snapshot of account metrics.
router.post('/sync', requireAuth, asyncRoute(async (req, res) => {
  const cred = await loadIgCredentials(req.user.id)
  const errors = []

  // Recent posts
  let posts = []
  try {
    posts = await getMedia(cred.igId, cred.pageToken, { limit: 25 })
    for (const m of posts) {
      await prisma.igPost.upsert({
        where: { id: m.id },
        create: {
          id: m.id,
          userId: req.user.id,
          caption: m.caption ?? null,
          mediaType: m.media_type,
          mediaUrl: m.media_url ?? null,
          permalink: m.permalink ?? null,
          thumbnailUrl: m.thumbnail_url ?? null,
          timestamp: new Date(m.timestamp),
          likeCount: m.like_count ?? 0,
          commentsCount: m.comments_count ?? 0,
        },
        update: {
          caption: m.caption ?? null,
          mediaType: m.media_type,
          mediaUrl: m.media_url ?? null,
          permalink: m.permalink ?? null,
          thumbnailUrl: m.thumbnail_url ?? null,
          likeCount: m.like_count ?? 0,
          commentsCount: m.comments_count ?? 0,
        },
      })
    }
  } catch (err) {
    errors.push({ step: 'posts', message: err.message })
  }

  // Account profile + 7-day insights snapshot
  try {
    const profile = await getAccountProfile(cred.igId, cred.pageToken)
    const until = Math.floor(Date.now() / 1000)
    const since = until - 7 * 86400
    const insights = await getAccountInsights(cred.igId, cred.pageToken, { since, until })

    const metricByName = Object.fromEntries((insights.data || []).map(d => [d.name, d]))
    const metrics = {
      followers: profile.followers_count ?? 0,
      follows: profile.follows_count ?? 0,
      mediaCount: profile.media_count ?? 0,
      reachSeries: metricByName.reach?.values || [],
      viewsTotal: metricByName.views?.total_value?.value ?? 0,
      profileViewsTotal: metricByName.profile_views?.total_value?.value ?? 0,
      websiteClicksTotal: metricByName.website_clicks?.total_value?.value ?? 0,
      accountsEngagedTotal: metricByName.accounts_engaged?.total_value?.value ?? 0,
      totalInteractionsTotal: metricByName.total_interactions?.total_value?.value ?? 0,
    }

    await prisma.analyticsSnapshot.create({
      data: {
        userId: req.user.id,
        igBusinessId: cred.igId,
        accountMetrics: JSON.stringify(metrics),
      },
    })
  } catch (err) {
    errors.push({ step: 'snapshot', message: err.message })
  }

  await prisma.metaCredential.update({
    where: { userId: req.user.id },
    data: { lastSyncedAt: new Date() },
  })

  res.json({
    ok: errors.length === 0,
    postsSynced: posts.length,
    errors,
    syncedAt: new Date().toISOString(),
  })
}))

// --- POST /api/instagram/publish ---
// Body: { imageUrl, caption?, campaignId? }
// Posts an image to the user's IG Business account. imageUrl must be public.
// Requires `instagram_content_publish` scope on the Page token.
router.post('/publish', requireAuth, asyncRoute(async (req, res) => {
  const cred = await loadIgCredentials(req.user.id)
  let { imageUrl, caption, campaignId } = req.body || {}
  if (!imageUrl) return res.status(400).json({ error: 'imageUrl required' })

  // If imageUrl is a relative /uploads/* path, expand to a public URL Meta can fetch.
  if (imageUrl.startsWith('/')) {
    const base = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`
    imageUrl = base.replace(/\/$/, '') + imageUrl
  }

  try {
    const result = await publishImageToInstagram(cred.igId, cred.pageToken, { imageUrl, caption })

    // Stamp campaign with the published media id if provided.
    if (campaignId) {
      const owns = await prisma.campaign.findFirst({
        where: { id: String(campaignId), userId: req.user.id },
        select: { id: true },
      })
      if (owns) {
        await prisma.campaign.update({
          where: { id: owns.id },
          data: { status: 'active' },
        })
      }
    }

    res.json({ ok: true, network: 'instagram', mediaId: result.mediaId, containerId: result.containerId, permalink: `https://www.instagram.com/p/${result.mediaId}` })
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message, code: err.code, payload: err.payload })
  }
}))

export default router
