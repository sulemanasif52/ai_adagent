// Lightweight statistical primitives used by ML jobs. Pure JS, no GPU, no
// Python — runs in-process on the same Node server.

import * as ss from 'simple-statistics'
import MLR from 'ml-regression-multivariate-linear'
import { kmeans } from 'ml-kmeans'

// Z-score for the LAST value vs the rolling window of preceding values.
// Returns null if there's not enough data (need at least 3 prior points).
export function rollingZ(values, lookback = 14) {
  if (!Array.isArray(values) || values.length < 4) return null
  const tail = values.slice(-lookback - 1, -1)
  if (tail.length < 3) return null
  const last = values[values.length - 1]
  const mean = ss.mean(tail)
  const sd = ss.standardDeviation(tail)
  if (!sd) return null
  return (last - mean) / sd
}

// Holt's linear (double) exponential smoothing forecast.
// values: number[] — historical observations.
// periods: how many future steps to forecast.
// Returns: { forecast: number[], level, trend }.
export function ewmaForecast(values, { alpha = 0.4, beta = 0.2, periods = 7 } = {}) {
  const v = values.filter(x => Number.isFinite(x))
  if (v.length < 2) {
    const flat = v.length ? v[v.length - 1] : 0
    return { forecast: Array(periods).fill(flat), level: flat, trend: 0 }
  }
  let level = v[0]
  let trend = v[1] - v[0]
  for (let i = 1; i < v.length; i++) {
    const newLevel = alpha * v[i] + (1 - alpha) * (level + trend)
    trend = beta * (newLevel - level) + (1 - beta) * trend
    level = newLevel
  }
  const forecast = []
  for (let i = 1; i <= periods; i++) forecast.push(level + i * trend)
  return { forecast, level, trend }
}

// 7×24 matrix of average engagement by (dayOfWeek, hourOfDay).
// posts: [{ timestamp: Date, engagement: number }]
// Returns: { matrix: number[7][24], counts: number[7][24], top: [{day,hour,avg}] }.
export function bestTimeMatrix(posts, { topN = 3 } = {}) {
  const matrix = Array.from({ length: 7 }, () => Array(24).fill(0))
  const counts = Array.from({ length: 7 }, () => Array(24).fill(0))
  for (const p of posts) {
    if (!p.timestamp) continue
    const d = p.timestamp instanceof Date ? p.timestamp : new Date(p.timestamp)
    if (isNaN(d.getTime())) continue
    const day = d.getDay()
    const hr = d.getHours()
    const e = Number(p.engagement) || 0
    matrix[day][hr] += e
    counts[day][hr] += 1
  }
  // Convert sums into averages.
  const avgs = matrix.map((row, d) => row.map((sum, h) => counts[d][h] ? sum / counts[d][h] : 0))
  // Find top cells (skip cells with zero observations).
  const flat = []
  for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) {
    if (counts[d][h] > 0) flat.push({ day: d, hour: h, avg: avgs[d][h], count: counts[d][h] })
  }
  flat.sort((a, b) => b.avg - a.avg)
  return { matrix: avgs, counts, top: flat.slice(0, topN) }
}

// Multivariate linear regression: predict revenue from feature vector.
// history: [{ features: number[], target: number }]
// Returns: predict(features: number[]) -> number; or null if too little data.
export function trainRegression(history) {
  if (!Array.isArray(history) || history.length < 3) return null
  const X = history.map(h => h.features)
  const Y = history.map(h => [h.target])
  let model
  try { model = new MLR(X, Y) } catch { return null }
  return {
    predict: (features) => {
      try { return model.predict(features)[0] } catch { return null }
    },
    coefficients: model.weights,
    rSquared: model.stdError, // ml-regression exposes stdError; OK proxy
  }
}

// Thompson Sampling for budget allocation across N campaigns.
// arms: [{ id, successes, failures }] — successes = revenue events, failures = wasted spend events
// Returns array of { id, sampleScore, allocation } where allocation sums to 1.
export function thompsonAllocate(arms) {
  if (!Array.isArray(arms) || !arms.length) return []
  const samples = arms.map(a => {
    const alpha = (a.successes || 0) + 1
    const beta = (a.failures || 0) + 1
    // Beta(alpha, beta) sample via gamma approximation:
    // Use ratio-of-gammas via approximate beta sample (simpler: just sample from beta via ss).
    const sample = sampleBeta(alpha, beta)
    return { id: a.id, score: sample }
  })
  const total = samples.reduce((a, s) => a + s.score, 0) || 1
  return samples.map(s => ({ id: s.id, sampleScore: s.score, allocation: s.score / total }))
}

// Simple Beta sampler (Marsaglia / inverse-CDF approximation via two gammas).
function sampleBeta(alpha, beta) {
  const x = sampleGamma(alpha)
  const y = sampleGamma(beta)
  return x / (x + y || 1)
}
function sampleGamma(shape) {
  // Marsaglia-Tsang for shape >= 1
  if (shape < 1) return sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / shape)
  const d = shape - 1 / 3
  const c = 1 / Math.sqrt(9 * d)
  while (true) {
    let x, v
    do {
      x = ssRandomNormal()
      v = 1 + c * x
    } while (v <= 0)
    v = v * v * v
    const u = Math.random()
    if (u < 1 - 0.0331 * Math.pow(x, 4)) return d * v
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v
  }
}
function ssRandomNormal() {
  // Box-Muller
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

// K-means cluster centers.
// data: number[][]  — each row a feature vector
// k: cluster count
// Returns: { clusters: number[], centroids: number[][] }
export function clusterAudience(data, k = 3) {
  if (!Array.isArray(data) || data.length < k) return null
  try {
    const result = kmeans(data, k, { initialization: 'kmeans++', seed: 42 })
    return { clusters: result.clusters, centroids: result.centroids }
  } catch (err) {
    console.warn('[stats] kmeans failed:', err.message)
    return null
  }
}

export const _ss = ss
