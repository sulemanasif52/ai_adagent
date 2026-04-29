import { Router } from 'express'
import { requireAuth } from '../auth/middleware.js'
import { prisma } from '../db.js'
import { sendLeadEmail, sendLeadAutoReply } from '../lib/email.js'

const router = Router()

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

function isValidEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

// --- POST /api/leads (PUBLIC — used by AdClick page) ---
// body: { campaignId?, fullName, email, phone?, productId?, source? }
router.post('/', asyncRoute(async (req, res) => {
  const b = req.body || {}
  if (!b.fullName || !isValidEmail(b.email)) {
    return res.status(400).json({ error: 'fullName and valid email required' })
  }

  // Resolve owner: prefer the campaignId path, else require productId match an
  // existing campaign, else fall back to "first user" (single-tenant dev mode).
  let userId = null
  let campaignId = null
  if (b.campaignId) {
    const camp = await prisma.campaign.findUnique({
      where: { id: String(b.campaignId) },
      select: { id: true, userId: true },
    })
    if (camp) {
      campaignId = camp.id
      userId = camp.userId
    }
  }
  if (!userId) {
    // Dev fallback so AdClick (which currently has no campaign association)
    // still routes leads to the only user logged in.
    const anyUser = await prisma.user.findFirst({ select: { id: true } })
    if (!anyUser) return res.status(400).json({ error: 'no_users_yet' })
    userId = anyUser.id
  }

  const lead = await prisma.lead.create({
    data: {
      userId,
      campaignId,
      fullName: String(b.fullName).slice(0, 200),
      email: String(b.email).slice(0, 200),
      phone: b.phone ? String(b.phone).slice(0, 50) : null,
      productId: b.productId ? String(b.productId).slice(0, 100) : null,
      source: b.source ? String(b.source).slice(0, 100) : 'adclick',
      audienceTag: b.audienceTag ? String(b.audienceTag).slice(0, 100) : null,
      estValue: b.estValue != null ? Number(b.estValue) : null,
      status: 'new',
    },
  })

  // Notification + email (don't await sequentially — fire-and-forget).
  prisma.notification.create({
    data: {
      userId,
      type: 'success',
      title: `New lead: ${lead.fullName}`,
      message: `${lead.email}${lead.source ? ` · ${lead.source}` : ''}`,
    },
  }).catch(err => console.warn('[leads] notification create failed:', err.message))
  sendLeadEmail(userId, lead).catch(err => console.warn('[leads] notify email failed:', err.message))
  sendLeadAutoReply(userId, lead).catch(err => console.warn('[leads] auto-reply failed:', err.message))

  res.status(201).json({ lead })
}))

// --- GET /api/leads?search=&status=&from=&to=&limit= ---
router.get('/', requireAuth, asyncRoute(async (req, res) => {
  const { search, status, from, to, limit = 100 } = req.query
  const where = { userId: req.user.id }

  if (status) where.status = String(status)
  if (search) {
    const s = String(search)
    where.OR = [
      { fullName: { contains: s } },
      { email: { contains: s } },
      { source: { contains: s } },
      { productId: { contains: s } },
    ]
  }
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(String(from))
    if (to) where.createdAt.lte = new Date(String(to))
  }

  const rows = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(Number(limit) || 100, 1), 500),
  })
  res.json({ leads: rows })
}))

// --- GET /api/leads/:id ---
router.get('/:id', requireAuth, asyncRoute(async (req, res) => {
  const lead = await prisma.lead.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: { campaign: { select: { id: true, name: true, status: true } } },
  })
  if (!lead) return res.status(404).json({ error: 'not_found' })
  res.json({ lead })
}))

// --- PUT /api/leads/:id ---
router.put('/:id', requireAuth, asyncRoute(async (req, res) => {
  const owner = await prisma.lead.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    select: { id: true },
  })
  if (!owner) return res.status(404).json({ error: 'not_found' })

  const b = req.body || {}
  const data = {}
  if (b.status !== undefined) data.status = String(b.status)
  if (b.estValue !== undefined) data.estValue = b.estValue == null ? null : Number(b.estValue)
  if (b.audienceTag !== undefined) data.audienceTag = b.audienceTag
  if (b.score !== undefined) data.score = b.score == null ? null : Number(b.score)

  const updated = await prisma.lead.update({ where: { id: owner.id }, data })
  res.json({ lead: updated })
}))

export default router
