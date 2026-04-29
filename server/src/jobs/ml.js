// ML jobs: anomaly detection, forecasting, best-time-to-post, ROI prediction,
// budget allocation. Pure JS, in-process. Triggered manually via /api/ml/*
// or nightly via cron (B-12).

import { prisma } from '../db.js'
import {
  rollingZ,
  ewmaForecast,
  bestTimeMatrix,
  trainRegression,
  thompsonAllocate,
} from '../lib/stats.js'

// ─── Anomaly detection ────────────────────────────────────────────────────────

export async function runAnomalyDetection(userId) {
  const campaigns = await prisma.campaign.findMany({
    where: { userId, status: { in: ['active', 'paused', 'draft'] } },
    include: { metrics: { orderBy: { date: 'asc' } } },
  })

  let alerts = 0
  for (const c of campaigns) {
    if (c.metrics.length < 7) continue

    // Build daily series for CTR + CPL + ROAS.
    const ctrSeries = c.metrics.map(m => m.impressions ? m.clicks / m.impressions : 0)
    const cplSeries = c.metrics.map(m => m.leads ? m.spend / m.leads : 0)
    const roasSeries = c.metrics.map(m => m.spend ? m.revenue / m.spend : 0)

    const checks = [
      { name: 'CTR', series: ctrSeries, goodHigh: true },
      { name: 'CPL', series: cplSeries, goodHigh: false }, // lower is better
      { name: 'ROAS', series: roasSeries, goodHigh: true },
    ]

    for (const check of checks) {
      const z = rollingZ(check.series, 14)
      if (z == null) continue
      if (Math.abs(z) < 2) continue

      const isBad = check.goodHigh ? z < 0 : z > 0
      const severity = Math.abs(z) > 3 ? 'critical' : 'warn'
      const direction = z > 0 ? 'spiked' : 'dropped'
      const title = `${check.name} ${direction} on ${c.name}`
      const message = `${check.name} on "${c.name}" is ${z.toFixed(1)} σ from its 14-day mean (${isBad ? 'unfavorable' : 'favorable'} direction).`

      await prisma.recommendation.create({
        data: {
          userId,
          campaignId: c.id,
          type: 'anomaly',
          severity: isBad ? severity : 'info',
          title,
          message,
          data: JSON.stringify({ metric: check.name, zScore: z, lastValue: check.series.at(-1) }),
        },
      })
      if (isBad) {
        await prisma.notification.create({
          data: {
            userId,
            type: 'alert',
            title,
            message,
          },
        })
      }
      alerts++
    }
  }
  return { alerts, campaignsChecked: campaigns.length }
}

// ─── Forecasting (7-day) ──────────────────────────────────────────────────────

export async function runForecasting(userId) {
  const campaigns = await prisma.campaign.findMany({
    where: { userId, status: { in: ['active', 'paused'] } },
    include: { metrics: { orderBy: { date: 'asc' }, take: 60 } },
  })

  let made = 0
  for (const c of campaigns) {
    if (c.metrics.length < 5) continue
    const spendSeries = c.metrics.map(m => m.spend)
    const revenueSeries = c.metrics.map(m => m.revenue)
    const fSpend = ewmaForecast(spendSeries, { periods: 7 })
    const fRev = ewmaForecast(revenueSeries, { periods: 7 })

    const projSpend = fSpend.forecast.reduce((a, x) => a + Math.max(0, x), 0)
    const projRev = fRev.forecast.reduce((a, x) => a + Math.max(0, x), 0)
    const projRoi = projSpend ? (projRev - projSpend) / projSpend : null

    await prisma.recommendation.create({
      data: {
        userId,
        campaignId: c.id,
        type: 'forecast',
        severity: 'info',
        title: `7-day forecast for ${c.name}`,
        message: projRoi != null
          ? `Projected 7-day spend $${projSpend.toFixed(0)}, revenue $${projRev.toFixed(0)} (ROI ${(projRoi * 100).toFixed(0)}%).`
          : `Projected 7-day spend $${projSpend.toFixed(0)}.`,
        data: JSON.stringify({
          spendForecast: fSpend.forecast,
          revenueForecast: fRev.forecast,
          projectedSpend: projSpend,
          projectedRevenue: projRev,
          projectedRoi: projRoi,
        }),
      },
    })
    made++
  }
  return { campaignsForecasted: made }
}

// ─── Best-time-to-post ────────────────────────────────────────────────────────

export async function runBestTimeAnalysis(userId) {
  const posts = await prisma.igPost.findMany({
    where: { userId },
    select: { timestamp: true, likeCount: true, commentsCount: true, insightsJson: true },
    take: 200,
    orderBy: { timestamp: 'desc' },
  })
  if (posts.length < 10) return { skipped: 'not_enough_posts' }

  const enriched = posts.map(p => {
    let extra = 0
    try {
      const ins = p.insightsJson ? JSON.parse(p.insightsJson) : null
      extra = (ins?.shares || 0) + (ins?.saved || 0)
    } catch {}
    return {
      timestamp: p.timestamp,
      engagement: (p.likeCount || 0) + 2 * (p.commentsCount || 0) + extra,
    }
  })

  const result = bestTimeMatrix(enriched, { topN: 3 })
  if (!result.top.length) return { skipped: 'no_signal' }

  // Save the matrix as a "besttime" recommendation so the frontend can render
  // a heatmap from it. Replace any prior besttime rec for this user.
  await prisma.recommendation.deleteMany({
    where: { userId, type: 'besttime', appliedAt: null, dismissedAt: null },
  })

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const top = result.top[0]
  await prisma.recommendation.create({
    data: {
      userId,
      type: 'besttime',
      severity: 'info',
      title: `Best time to post: ${days[top.day]} ${String(top.hour).padStart(2, '0')}:00`,
      message: `Top 3 windows: ${result.top.map(t => `${days[t.day]} ${t.hour}:00`).join(', ')}.`,
      data: JSON.stringify({ matrix: result.matrix, counts: result.counts, top: result.top }),
    },
  })
  return { topWindows: result.top.length }
}

// ─── ROI predictor (called on-demand, not from cron) ──────────────────────────

export async function predictRoi(userId, draft) {
  const past = await prisma.campaign.findMany({
    where: { userId, NOT: { id: draft.excludeId || undefined } },
    include: { metrics: true },
  })
  const history = past
    .map(c => {
      const totals = c.metrics.reduce((a, m) => ({
        spend: a.spend + m.spend,
        revenue: a.revenue + m.revenue,
        clicks: a.clicks + m.clicks,
        impressions: a.impressions + m.impressions,
        days: a.days + 1,
      }), { spend: 0, revenue: 0, clicks: 0, impressions: 0, days: 0 })
      if (!totals.days || !totals.spend) return null
      return {
        features: [c.dailyBudget || 0, totals.days, c.estRevenue || 0],
        target: totals.revenue,
      }
    })
    .filter(Boolean)

  const model = trainRegression(history)
  if (!model) {
    // Heuristic fallback when there's no usable history.
    const dailyBudget = Number(draft.dailyBudget) || 0
    const days = Number(draft.days) || 7
    const est = Number(draft.estRevenue) || 0
    const projectedRevenue = dailyBudget * days * 1.4 // assume 1.4x ROAS for new campaigns
    const projectedSpend = dailyBudget * days
    return {
      heuristic: true,
      projectedRevenue,
      projectedSpend,
      projectedRoi: projectedSpend ? (projectedRevenue - projectedSpend) / projectedSpend : null,
      confidence: 'low',
    }
  }

  const features = [Number(draft.dailyBudget) || 0, Number(draft.days) || 7, Number(draft.estRevenue) || 0]
  const projectedRevenue = Math.max(0, model.predict(features) || 0)
  const projectedSpend = features[0] * features[1]
  return {
    heuristic: false,
    projectedRevenue,
    projectedSpend,
    projectedRoi: projectedSpend ? (projectedRevenue - projectedSpend) / projectedSpend : null,
    confidence: history.length >= 5 ? 'medium' : 'low',
    samplesUsed: history.length,
  }
}

// ─── Budget allocator (Thompson sampling) ─────────────────────────────────────

export async function allocateBudget(userId, totalDailyBudget) {
  const campaigns = await prisma.campaign.findMany({
    where: { userId, status: 'active' },
    include: { metrics: { orderBy: { date: 'desc' }, take: 30 } },
  })
  if (!campaigns.length) return { allocations: [] }

  const arms = campaigns.map(c => {
    const tot = c.metrics.reduce((a, m) => ({
      revenue: a.revenue + m.revenue,
      spend: a.spend + m.spend,
    }), { revenue: 0, spend: 0 })
    return {
      id: c.id,
      name: c.name,
      successes: Math.max(0, Math.round(tot.revenue / 10)),  // 1 success per $10 revenue
      failures: Math.max(0, Math.round((tot.spend - tot.revenue) / 10)),
    }
  })

  const out = thompsonAllocate(arms)
  const total = Number(totalDailyBudget) || 0
  return {
    allocations: out.map(a => {
      const camp = campaigns.find(c => c.id === a.id)
      return {
        campaignId: a.id,
        campaignName: camp?.name,
        suggestedBudget: +(a.allocation * total).toFixed(2),
        sampleScore: a.sampleScore,
      }
    }),
  }
}

// ─── Audience clustering ──────────────────────────────────────────────────────

export async function audienceClusters(userId, k = 3) {
  const posts = await prisma.igPost.findMany({
    where: { userId },
    select: { id: true, likeCount: true, commentsCount: true, mediaType: true, caption: true, timestamp: true, insightsJson: true },
    take: 100,
    orderBy: { timestamp: 'desc' },
  })
  if (posts.length < k * 2) return { skipped: 'not_enough_posts', clusters: [] }

  // Feature vector per post: [likes, comments, captionLength, hour, isVideo].
  const features = posts.map(p => {
    let hr = 0
    try { hr = new Date(p.timestamp).getHours() } catch {}
    return [
      p.likeCount || 0,
      p.commentsCount || 0,
      (p.caption || '').length,
      hr,
      p.mediaType?.includes('VIDEO') ? 1 : 0,
    ]
  })

  // Normalize each column so kmeans isn't dominated by like_count.
  const norm = features[0].map((_, col) => {
    const max = Math.max(...features.map(r => r[col])) || 1
    return max
  })
  const normalized = features.map(r => r.map((v, i) => v / norm[i]))

  const { clusterAudience } = await import('../lib/stats.js')
  const result = clusterAudience(normalized, k)
  if (!result) return { skipped: 'kmeans_failed', clusters: [] }

  // Group posts by cluster + summarize.
  const groups = Array.from({ length: k }, () => [])
  result.clusters.forEach((cIdx, pIdx) => groups[cIdx].push(posts[pIdx]))
  return {
    clusters: groups.map((postsInCluster, idx) => {
      const avgLikes = postsInCluster.reduce((a, p) => a + (p.likeCount || 0), 0) / (postsInCluster.length || 1)
      const avgComments = postsInCluster.reduce((a, p) => a + (p.commentsCount || 0), 0) / (postsInCluster.length || 1)
      return {
        id: idx,
        size: postsInCluster.length,
        avgLikes: +avgLikes.toFixed(1),
        avgComments: +avgComments.toFixed(1),
        samplePostIds: postsInCluster.slice(0, 3).map(p => p.id),
      }
    }),
  }
}
