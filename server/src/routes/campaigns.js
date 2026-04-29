import { Router } from 'express'
import { requireAuth } from '../auth/middleware.js'
import { prisma } from '../db.js'

const router = Router()

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

function summarize(metrics) {
  let impressions = 0, reach = 0, clicks = 0, leads = 0, spend = 0, revenue = 0
  for (const m of metrics) {
    impressions += m.impressions
    reach += m.reach
    clicks += m.clicks
    leads += m.leads
    spend += m.spend
    revenue += m.revenue
  }
  return {
    impressions, reach, clicks, leads, spend, revenue,
    cpl: leads ? +(spend / leads).toFixed(2) : null,
    cpc: clicks ? +(spend / clicks).toFixed(2) : null,
    cpm: impressions ? +((spend / impressions) * 1000).toFixed(2) : null,
    ctr: impressions ? +(clicks / impressions).toFixed(4) : null,
    convRate: clicks ? +(leads / clicks).toFixed(4) : null,
    roas: spend ? +(revenue / spend).toFixed(2) : null,
    roi: spend ? +((revenue - spend) / spend).toFixed(2) : null,
  }
}

// Strip JSON-serialized fields back into objects on read.
function hydrate(c) {
  if (!c) return c
  return {
    ...c,
    goals: c.goals ? safeJson(c.goals) : null,
    platforms: c.platforms ? safeJson(c.platforms) : null,
    targeting: c.targeting ? safeJson(c.targeting) : null,
    copy: c.copy ? safeJson(c.copy) : null,
    imageUrls: c.imageUrls ? safeJson(c.imageUrls) : null,
  }
}
function safeJson(s) { try { return JSON.parse(s) } catch { return null } }
function toJson(v) { return v == null ? null : JSON.stringify(v) }

// --- GET /api/campaigns ---
router.get('/', requireAuth, asyncRoute(async (req, res) => {
  const { status, limit = 50 } = req.query
  const where = { userId: req.user.id }
  if (status) where.status = String(status)

  const rows = await prisma.campaign.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(Number(limit) || 50, 1), 200),
    include: { metrics: true },
  })

  res.json({
    campaigns: rows.map(c => ({
      ...hydrate(c),
      metrics: undefined,
      summary: summarize(c.metrics),
      metricsCount: c.metrics.length,
    })),
  })
}))

// --- POST /api/campaigns ---
router.post('/', requireAuth, asyncRoute(async (req, res) => {
  const b = req.body || {}
  if (!b.name) return res.status(400).json({ error: 'name required' })

  const created = await prisma.campaign.create({
    data: {
      userId: req.user.id,
      name: String(b.name),
      status: b.status || 'draft',
      product: b.product ?? null,
      description: b.description ?? null,
      goals: toJson(b.goals),
      platforms: toJson(b.platforms),
      dailyBudget: b.dailyBudget != null ? Number(b.dailyBudget) : null,
      lifetimeCap: b.lifetimeCap != null ? Number(b.lifetimeCap) : null,
      targeting: toJson(b.targeting),
      copy: toJson(b.copy),
      imageUrls: toJson(b.imageUrls),
      videoUrl: b.videoUrl ?? null,
      estRevenue: b.estRevenue != null ? Number(b.estRevenue) : null,
    },
  })
  res.status(201).json({ campaign: hydrate(created) })
}))

// --- GET /api/campaigns/:id ---
router.get('/:id', requireAuth, asyncRoute(async (req, res) => {
  const c = await prisma.campaign.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: {
      metrics: { orderBy: { date: 'asc' } },
      recommendations: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!c) return res.status(404).json({ error: 'not_found' })
  res.json({
    campaign: hydrate(c),
    summary: summarize(c.metrics),
  })
}))

// --- PUT /api/campaigns/:id ---
router.put('/:id', requireAuth, asyncRoute(async (req, res) => {
  const owner = await prisma.campaign.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    select: { id: true },
  })
  if (!owner) return res.status(404).json({ error: 'not_found' })

  const b = req.body || {}
  const data = {}
  if (b.name !== undefined) data.name = String(b.name)
  if (b.status !== undefined) data.status = String(b.status)
  if (b.product !== undefined) data.product = b.product
  if (b.description !== undefined) data.description = b.description
  if (b.goals !== undefined) data.goals = toJson(b.goals)
  if (b.platforms !== undefined) data.platforms = toJson(b.platforms)
  if (b.dailyBudget !== undefined) data.dailyBudget = b.dailyBudget == null ? null : Number(b.dailyBudget)
  if (b.lifetimeCap !== undefined) data.lifetimeCap = b.lifetimeCap == null ? null : Number(b.lifetimeCap)
  if (b.targeting !== undefined) data.targeting = toJson(b.targeting)
  if (b.copy !== undefined) data.copy = toJson(b.copy)
  if (b.imageUrls !== undefined) data.imageUrls = toJson(b.imageUrls)
  if (b.videoUrl !== undefined) data.videoUrl = b.videoUrl
  if (b.estRevenue !== undefined) data.estRevenue = b.estRevenue == null ? null : Number(b.estRevenue)

  const updated = await prisma.campaign.update({ where: { id: owner.id }, data })
  res.json({ campaign: hydrate(updated) })
}))

// --- DELETE /api/campaigns/:id (archive) ---
router.delete('/:id', requireAuth, asyncRoute(async (req, res) => {
  const owner = await prisma.campaign.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    select: { id: true },
  })
  if (!owner) return res.status(404).json({ error: 'not_found' })
  await prisma.campaign.update({ where: { id: owner.id }, data: { status: 'archived' } })
  res.json({ ok: true, archived: owner.id })
}))

// --- POST /api/campaigns/:id/metrics ---
// body: { date, impressions, reach, clicks, leads, spend, revenue }
router.post('/:id/metrics', requireAuth, asyncRoute(async (req, res) => {
  const c = await prisma.campaign.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    select: { id: true },
  })
  if (!c) return res.status(404).json({ error: 'not_found' })

  const b = req.body || {}
  if (!b.date) return res.status(400).json({ error: 'date required' })

  const date = new Date(b.date)
  if (isNaN(date.getTime())) return res.status(400).json({ error: 'invalid date' })

  const upserted = await prisma.campaignMetric.upsert({
    where: { campaignId_date: { campaignId: c.id, date } },
    create: {
      campaignId: c.id,
      date,
      impressions: Number(b.impressions) || 0,
      reach: Number(b.reach) || 0,
      clicks: Number(b.clicks) || 0,
      leads: Number(b.leads) || 0,
      spend: Number(b.spend) || 0,
      revenue: Number(b.revenue) || 0,
    },
    update: {
      impressions: Number(b.impressions) || 0,
      reach: Number(b.reach) || 0,
      clicks: Number(b.clicks) || 0,
      leads: Number(b.leads) || 0,
      spend: Number(b.spend) || 0,
      revenue: Number(b.revenue) || 0,
    },
  })
  res.json({ metric: upserted })
}))

export default router
