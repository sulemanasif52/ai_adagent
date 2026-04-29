// Read-only tools the chatbot can call to ground its answers in real user data.
// Each tool is OpenAI/Groq function-calling compatible.

import { prisma } from './../db.js'
import { decrypt } from './crypto.js'
import { getAccountInsights, getAccountProfile } from './instagram.js'

export const TOOL_DEFS = [
  {
    type: 'function',
    function: {
      name: 'get_account_summary',
      description: 'Returns the user\'s Instagram account summary: followers, following, total post count, last 7-day reach total. Use when the user asks about their IG profile or overall account health.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_account_metrics',
      description: 'Returns IG account-level reach + engagement metrics over the past N days (1-90).',
      parameters: {
        type: 'object',
        properties: {
          range_days: { type: 'integer', minimum: 1, maximum: 90, description: 'How many days back to look. Default 7.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_top_posts',
      description: 'Returns the user\'s top-performing recent IG posts ranked by likes+comments.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 20, description: 'How many posts to return. Default 5.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_post_comments',
      description: 'Returns recent comments on a specific IG post, including sentiment if available.',
      parameters: {
        type: 'object',
        properties: {
          post_id: { type: 'string', description: 'IG media ID.' },
          limit: { type: 'integer', minimum: 1, maximum: 50 },
        },
        required: ['post_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_campaigns',
      description: 'Lists the user\'s campaigns with their summary metrics (spend, leads, ROI).',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['draft', 'active', 'paused', 'archived'] },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_campaign_performance',
      description: 'Returns metric history + summary for a specific campaign.',
      parameters: {
        type: 'object',
        properties: { campaign_id: { type: 'string' } },
        required: ['campaign_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_leads',
      description: 'Lists captured leads, optionally filtered by status.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 50 },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_recommendations',
      description: 'Returns active ML-generated recommendations (anomalies, best-time, forecasts).',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Filter by type: anomaly, besttime, forecast, hashtag, budget.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_sentiment_summary',
      description: 'Returns counts of comment sentiment (positive/neutral/negative/question) across the user\'s posts.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
]

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function loadIgCreds(userId) {
  const cred = await prisma.metaCredential.findUnique({ where: { userId } })
  if (!cred?.igBusinessAccountId || !cred.pageAccessToken) return null
  return {
    igId: cred.igBusinessAccountId,
    pageToken: decrypt(cred.pageAccessToken),
    igUsername: cred.igUsername,
  }
}

const HANDLERS = {
  async get_account_summary(_args, userId) {
    const cred = await loadIgCreds(userId)
    if (!cred) return { error: 'Instagram not connected.' }
    try {
      const profile = await getAccountProfile(cred.igId, cred.pageToken)
      const until = Math.floor(Date.now() / 1000)
      const since = until - 7 * 86400
      const insights = await getAccountInsights(cred.igId, cred.pageToken, { since, until })
      const reach7d = (insights.data || [])
        .find(d => d.name === 'reach')
        ?.values?.reduce((a, v) => a + (v.value || 0), 0) ?? 0
      return {
        username: profile.username,
        followers: profile.followers_count,
        following: profile.follows_count,
        mediaCount: profile.media_count,
        reach7d,
      }
    } catch (err) {
      return { error: err.message }
    }
  },

  async get_account_metrics({ range_days = 7 }, userId) {
    const cred = await loadIgCreds(userId)
    if (!cred) return { error: 'Instagram not connected.' }
    try {
      const days = Math.min(Math.max(Number(range_days) || 7, 1), 90)
      const until = Math.floor(Date.now() / 1000)
      const since = until - days * 86400
      const insights = await getAccountInsights(cred.igId, cred.pageToken, { since, until })
      const series = {}
      const totals = {}
      for (const m of (insights.data || [])) {
        if (Array.isArray(m.values) && m.values.length) series[m.name] = m.values.map(v => ({ d: v.end_time?.slice(0, 10), v: v.value }))
        else if (m.total_value) totals[m.name] = m.total_value.value
      }
      return { rangeDays: days, series, totals }
    } catch (err) {
      return { error: err.message }
    }
  },

  async get_top_posts({ limit = 5 }, userId) {
    const posts = await prisma.igPost.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 60,
    })
    const ranked = posts
      .map(p => ({
        id: p.id,
        permalink: p.permalink,
        caption: (p.caption || '').slice(0, 200),
        likes: p.likeCount,
        comments: p.commentsCount,
        score: (p.likeCount || 0) + 2 * (p.commentsCount || 0),
        timestamp: p.timestamp,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(limit, 20))
    return { posts: ranked }
  },

  async get_post_comments({ post_id, limit = 20 }, userId) {
    const post = await prisma.igPost.findFirst({
      where: { id: post_id, userId },
      select: { id: true },
    })
    if (!post) return { error: 'Post not found.' }
    const comments = await prisma.igComment.findMany({
      where: { postId: post.id },
      include: { analysis: true },
      orderBy: { timestamp: 'desc' },
      take: Math.min(Number(limit) || 20, 50),
    })
    return {
      comments: comments.map(c => ({
        id: c.id,
        username: c.username,
        text: c.text,
        sentiment: c.analysis?.sentiment || null,
        intent: c.analysis?.intent || null,
        timestamp: c.timestamp,
      })),
    }
  },

  async list_campaigns({ status }, userId) {
    const where = { userId }
    if (status) where.status = status
    const rows = await prisma.campaign.findMany({
      where,
      include: { metrics: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })
    return {
      campaigns: rows.map(c => {
        const tot = c.metrics.reduce((a, m) => ({
          spend: a.spend + m.spend,
          revenue: a.revenue + m.revenue,
          leads: a.leads + m.leads,
        }), { spend: 0, revenue: 0, leads: 0 })
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          dailyBudget: c.dailyBudget,
          spend: tot.spend,
          revenue: tot.revenue,
          leads: tot.leads,
          roi: tot.spend ? +((tot.revenue - tot.spend) / tot.spend).toFixed(2) : null,
        }
      }),
    }
  },

  async get_campaign_performance({ campaign_id }, userId) {
    const c = await prisma.campaign.findFirst({
      where: { id: campaign_id, userId },
      include: { metrics: { orderBy: { date: 'asc' } } },
    })
    if (!c) return { error: 'Campaign not found.' }
    const totals = c.metrics.reduce((a, m) => ({
      impressions: a.impressions + m.impressions,
      clicks: a.clicks + m.clicks,
      leads: a.leads + m.leads,
      spend: a.spend + m.spend,
      revenue: a.revenue + m.revenue,
    }), { impressions: 0, clicks: 0, leads: 0, spend: 0, revenue: 0 })
    return {
      campaign: { id: c.id, name: c.name, status: c.status, dailyBudget: c.dailyBudget },
      totals,
      derived: {
        cpl: totals.leads ? +(totals.spend / totals.leads).toFixed(2) : null,
        ctr: totals.impressions ? +(totals.clicks / totals.impressions).toFixed(4) : null,
        roas: totals.spend ? +(totals.revenue / totals.spend).toFixed(2) : null,
      },
      dailyHistory: c.metrics.map(m => ({
        date: m.date.toISOString().slice(0, 10),
        spend: m.spend,
        revenue: m.revenue,
        clicks: m.clicks,
        leads: m.leads,
      })),
    }
  },

  async get_leads({ status, limit = 20 }, userId) {
    const where = { userId }
    if (status) where.status = status
    const rows = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit) || 20, 50),
    })
    return {
      leads: rows.map(l => ({
        id: l.id,
        name: l.fullName,
        email: l.email,
        status: l.status,
        source: l.source,
        score: l.score,
        createdAt: l.createdAt,
      })),
    }
  },

  async get_recommendations({ type }, userId) {
    const where = { userId, appliedAt: null, dismissedAt: null }
    if (type) where.type = type
    const rows = await prisma.recommendation.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      take: 20,
    })
    return {
      recommendations: rows.map(r => ({
        id: r.id,
        type: r.type,
        severity: r.severity,
        title: r.title,
        message: r.message,
        createdAt: r.createdAt,
      })),
    }
  },

  async get_sentiment_summary(_args, userId) {
    const counts = await prisma.igCommentAnalysis.groupBy({
      by: ['sentiment'],
      where: { comment: { post: { userId } } },
      _count: { _all: true },
    })
    const out = { positive: 0, neutral: 0, negative: 0, question: 0, total: 0 }
    for (const r of counts) {
      const k = r.sentiment
      if (out[k] !== undefined) out[k] = r._count._all
      out.total += r._count._all
    }
    return out
  },
}

export async function runTool(name, args, userId) {
  const fn = HANDLERS[name]
  if (!fn) return { error: `Unknown tool: ${name}` }
  try {
    return await fn(args || {}, userId)
  } catch (err) {
    return { error: err.message }
  }
}
