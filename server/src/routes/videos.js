import { Router } from 'express'
import { requireAuth } from '../auth/middleware.js'
import { prisma } from '../db.js'
import { generateSlideshowAd } from '../lib/video.js'

const router = Router()

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

// --- POST /api/videos/generate ---
// body: { product, description, durationSec?, voice?, campaignId? }
router.post('/generate', requireAuth, asyncRoute(async (req, res) => {
  const { product, description, durationSec = 30, voice = 'guy', campaignId } = req.body || {}
  if (!product && !description) {
    return res.status(400).json({ error: 'product or description required' })
  }

  const result = await generateSlideshowAd({
    userId: req.user.id,
    product,
    description,
    durationSec: Math.min(Math.max(Number(durationSec) || 30, 6), 120),
    voice,
  })

  // If a campaignId is provided, persist the videoUrl reference (using the
  // voiceover URL since we don't compose a single MP4 yet).
  if (campaignId) {
    const owns = await prisma.campaign.findFirst({
      where: { id: String(campaignId), userId: req.user.id },
      select: { id: true },
    })
    if (owns) {
      await prisma.campaign.update({
        where: { id: owns.id },
        data: { videoUrl: result.voiceoverUrl || null },
      })
    }
  }

  res.json(result)
}))

export default router
