import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../auth/middleware.js'
import { prisma } from '../db.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const prefs = await prisma.preferences.upsert({
    where: { userId: req.user.id },
    create: { userId: req.user.id },
    update: {},
  })
  res.json({
    optimization_mode: prefs.optimizationMode,
    alert_budget: prefs.alertBudget,
    alert_performance: prefs.alertPerformance,
    alert_scale: prefs.alertScale,
  })
})

const schema = z.object({
  optimization_mode: z.enum(['auto', 'manual']).optional(),
  alert_budget: z.boolean().optional(),
  alert_performance: z.boolean().optional(),
  alert_scale: z.boolean().optional(),
})

router.put('/', requireAuth, async (req, res) => {
  const body = schema.safeParse(req.body)
  if (!body.success) return res.status(400).json({ error: 'invalid_body', details: body.error.flatten() })

  const data = {}
  if (body.data.optimization_mode !== undefined) data.optimizationMode = body.data.optimization_mode
  if (body.data.alert_budget !== undefined) data.alertBudget = body.data.alert_budget
  if (body.data.alert_performance !== undefined) data.alertPerformance = body.data.alert_performance
  if (body.data.alert_scale !== undefined) data.alertScale = body.data.alert_scale

  const prefs = await prisma.preferences.upsert({
    where: { userId: req.user.id },
    create: { userId: req.user.id, ...data },
    update: data,
  })

  res.json({
    optimization_mode: prefs.optimizationMode,
    alert_budget: prefs.alertBudget,
    alert_performance: prefs.alertPerformance,
    alert_scale: prefs.alertScale,
  })
})

export default router
