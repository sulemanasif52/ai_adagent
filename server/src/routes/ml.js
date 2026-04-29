import { Router } from 'express'
import { requireAuth } from '../auth/middleware.js'
import {
  runAnomalyDetection,
  runForecasting,
  runBestTimeAnalysis,
  predictRoi,
  allocateBudget,
  audienceClusters,
} from '../jobs/ml.js'
import { classifyUnanalyzedComments } from '../jobs/sentiment.js'

const router = Router()

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

// --- POST /api/ml/run-all ---  Full nightly batch on demand.
router.post('/run-all', requireAuth, asyncRoute(async (req, res) => {
  const [anom, fore, bt, sent] = await Promise.all([
    runAnomalyDetection(req.user.id).catch(e => ({ error: e.message })),
    runForecasting(req.user.id).catch(e => ({ error: e.message })),
    runBestTimeAnalysis(req.user.id).catch(e => ({ error: e.message })),
    classifyUnanalyzedComments(req.user.id).catch(e => ({ error: e.message })),
  ])
  res.json({ anomaly: anom, forecast: fore, bestTime: bt, sentiment: sent })
}))

// --- POST /api/ml/anomaly ---
router.post('/anomaly', requireAuth, asyncRoute(async (req, res) => {
  res.json(await runAnomalyDetection(req.user.id))
}))

// --- POST /api/ml/forecast ---
router.post('/forecast', requireAuth, asyncRoute(async (req, res) => {
  res.json(await runForecasting(req.user.id))
}))

// --- POST /api/ml/best-time ---
router.post('/best-time', requireAuth, asyncRoute(async (req, res) => {
  res.json(await runBestTimeAnalysis(req.user.id))
}))

// --- POST /api/ml/sentiment ---
router.post('/sentiment', requireAuth, asyncRoute(async (req, res) => {
  res.json(await classifyUnanalyzedComments(req.user.id))
}))

// --- POST /api/ml/predict-roi ---  body: { dailyBudget, days, estRevenue, excludeId? }
router.post('/predict-roi', requireAuth, asyncRoute(async (req, res) => {
  res.json(await predictRoi(req.user.id, req.body || {}))
}))

// --- POST /api/ml/allocate-budget ---  body: { totalDailyBudget }
router.post('/allocate-budget', requireAuth, asyncRoute(async (req, res) => {
  const total = Number(req.body?.totalDailyBudget)
  if (!total || total < 0) return res.status(400).json({ error: 'totalDailyBudget required (>0)' })
  res.json(await allocateBudget(req.user.id, total))
}))

// --- GET /api/ml/audience-clusters?k=3 ---
router.get('/audience-clusters', requireAuth, asyncRoute(async (req, res) => {
  const k = Math.min(Math.max(Number(req.query.k) || 3, 2), 6)
  res.json(await audienceClusters(req.user.id, k))
}))

export default router
