import { Router } from 'express'
import { requireAuth } from '../auth/middleware.js'
import { prisma } from '../db.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
  })
  if (!user) return res.status(404).json({ error: 'user_not_found' })
  res.json(user)
})

export default router
