// Cron scheduler. Runs the in-process ML + sentiment jobs on a schedule.
// Only enabled in production (NODE_ENV=production) so dev doesn't grind through
// LLM/Graph quota during normal coding.

import cron from 'node-cron'
import { prisma } from '../db.js'
import { classifyUnanalyzedComments } from './sentiment.js'
import {
  runAnomalyDetection,
  runForecasting,
  runBestTimeAnalysis,
} from './ml.js'

let started = false

export function startScheduler() {
  if (started) return
  started = true

  // Hourly: classify any new IG comments (cheap, free Groq).
  cron.schedule('5 * * * *', async () => {
    console.log('[cron] sentiment classification tick')
    try {
      const users = await prisma.user.findMany({ select: { id: true } })
      for (const u of users) {
        try {
          const out = await classifyUnanalyzedComments(u.id, { batchSize: 30, maxBatches: 3 })
          if (out.classified) console.log(`[cron] sentiment user=${u.id} classified=${out.classified}`)
        } catch (err) {
          console.warn(`[cron] sentiment failed for ${u.id}:`, err.message)
        }
      }
    } catch (err) {
      console.error('[cron] sentiment top-level failure:', err.message)
    }
  })

  // Nightly 02:00 UTC: full ML batch (anomaly + forecast + best-time).
  cron.schedule('0 2 * * *', async () => {
    console.log('[cron] nightly ML batch tick')
    try {
      const users = await prisma.user.findMany({ select: { id: true } })
      for (const u of users) {
        try {
          await runAnomalyDetection(u.id)
          await runForecasting(u.id)
          await runBestTimeAnalysis(u.id)
        } catch (err) {
          console.warn(`[cron] ML batch failed for ${u.id}:`, err.message)
        }
      }
      console.log('[cron] nightly ML batch complete')
    } catch (err) {
      console.error('[cron] ML top-level failure:', err.message)
    }
  })

  console.log('✓ Cron scheduler started (sentiment hourly, ML batch nightly @ 02:00 UTC)')
}
