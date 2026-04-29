import { Router } from 'express'
import { requireAuth } from '../auth/middleware.js'
import { prisma } from '../db.js'

const router = Router()

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

function hydrate(r) {
  if (!r) return r
  let data = null
  if (r.data) {
    try { data = JSON.parse(r.data) } catch { data = r.data }
  }
  return { ...r, data }
}

// --- GET /api/recommendations?type=&campaignId=&active=1 ---
router.get('/', requireAuth, asyncRoute(async (req, res) => {
  const { type, campaignId, active } = req.query
  const where = { userId: req.user.id }
  if (type) where.type = String(type)
  if (campaignId) where.campaignId = String(campaignId)
  if (active === '1') {
    where.appliedAt = null
    where.dismissedAt = null
  }

  const rows = await prisma.recommendation.findMany({
    where,
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  })
  res.json({ recommendations: rows.map(hydrate) })
}))

// --- PUT /api/recommendations/:id ---
// body: { applied?: bool, dismissed?: bool }
router.put('/:id', requireAuth, asyncRoute(async (req, res) => {
  const owner = await prisma.recommendation.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    select: { id: true },
  })
  if (!owner) return res.status(404).json({ error: 'not_found' })

  const data = {}
  if (req.body?.applied === true) data.appliedAt = new Date()
  if (req.body?.applied === false) data.appliedAt = null
  if (req.body?.dismissed === true) data.dismissedAt = new Date()
  if (req.body?.dismissed === false) data.dismissedAt = null

  const updated = await prisma.recommendation.update({ where: { id: owner.id }, data })
  res.json({ recommendation: hydrate(updated) })
}))

export default router
