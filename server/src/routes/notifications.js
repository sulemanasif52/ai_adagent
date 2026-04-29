import { Router } from 'express'
import { requireAuth } from '../auth/middleware.js'
import { prisma } from '../db.js'

const router = Router()

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

// --- GET /api/notifications?unreadOnly=1&limit=50 ---
router.get('/', requireAuth, asyncRoute(async (req, res) => {
  const { unreadOnly, limit = 50 } = req.query
  const where = { userId: req.user.id }
  if (unreadOnly === '1') where.readAt = null

  const rows = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(Number(limit) || 50, 1), 200),
  })
  const unreadCount = await prisma.notification.count({
    where: { userId: req.user.id, readAt: null },
  })
  res.json({ notifications: rows, unreadCount })
}))

// --- POST /api/notifications/mark-read ---
// body: { ids?: [...] }  — mark specific ones, or all unread if omitted
router.post('/mark-read', requireAuth, asyncRoute(async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : null
  const where = { userId: req.user.id, readAt: null }
  if (ids) where.id = { in: ids }
  const result = await prisma.notification.updateMany({
    where,
    data: { readAt: new Date() },
  })
  res.json({ markedRead: result.count })
}))

// --- DELETE /api/notifications/:id ---
router.delete('/:id', requireAuth, asyncRoute(async (req, res) => {
  const owner = await prisma.notification.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    select: { id: true },
  })
  if (!owner) return res.status(404).json({ error: 'not_found' })
  await prisma.notification.delete({ where: { id: owner.id } })
  res.json({ ok: true })
}))

export default router
