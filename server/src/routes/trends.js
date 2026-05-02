import { Router } from 'express'
import { requireAuth } from '../auth/middleware.js'
import { prisma } from '../db.js'
import { decrypt } from '../lib/crypto.js'
import { env } from '../env.js'
import * as groq from '../lib/ai/groq.js'
import * as gemini from '../lib/ai/gemini.js'
import * as anthropic from '../lib/ai/anthropic.js'

const router = Router()

const CACHE_TTL_MS = {
  ad_library: 60 * 60 * 1000,    // 1h
  reddit: 60 * 60 * 1000,        // 1h
  news: 60 * 60 * 1000,          // 1h
  google: 6 * 60 * 60 * 1000,    // 6h
  synthesize: 6 * 60 * 60 * 1000,
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

async function cached(source, topic, fetcher, { skip = false } = {}) {
  const ttl = CACHE_TTL_MS[source] || 60 * 60 * 1000
  const cutoff = new Date(Date.now() - ttl)
  if (!skip) {
    const hit = await prisma.trend.findFirst({
      where: { source, topic, fetchedAt: { gte: cutoff } },
      orderBy: { fetchedAt: 'desc' },
    })
    if (hit) {
      try { return { fromCache: true, data: JSON.parse(hit.payload), fetchedAt: hit.fetchedAt } } catch {}
    }
  }
  const fresh = await fetcher()
  await prisma.trend.create({ data: { source, topic, payload: JSON.stringify(fresh) } })
  return { fromCache: false, data: fresh, fetchedAt: new Date() }
}

const isFresh = (req) => req.query.fresh === '1' || req.query.refresh === '1'

// --- GET /api/trends/ad-library?keyword=&country=US ---
// Uses APP_ID|APP_SECRET as access token (Meta's "app access token" — works
// for the public Ad Library without requiring a logged-in user).
router.get('/ad-library', requireAuth, asyncRoute(async (req, res) => {
  const keyword = String(req.query.keyword || '').trim()
  const country = String(req.query.country || 'US').toUpperCase()
  if (!keyword) return res.status(400).json({ error: 'keyword required' })

  const result = await cached('ad_library', `${country}:${keyword}`, async () => {
    const url = new URL('https://graph.facebook.com/v21.0/ads_archive')
    url.searchParams.set('access_token', `${env.META_APP_ID}|${env.META_APP_SECRET}`)
    url.searchParams.set('search_terms', keyword)
    url.searchParams.set('ad_type', 'ALL')
    url.searchParams.set('ad_reached_countries', JSON.stringify([country]))
    url.searchParams.set('limit', '20')
    url.searchParams.set('fields', 'id,page_name,page_id,ad_creative_bodies,ad_creative_link_titles,ad_creative_link_descriptions,ad_snapshot_url,ad_delivery_start_time,publisher_platforms')
    const r = await fetch(url.toString())
    const d = await r.json()
    if (!r.ok) {
      console.warn('[trends] ad_library failed:', d?.error?.message)
      return { ads: [], error: d?.error?.message || `status ${r.status}` }
    }
    return { ads: d.data || [] }
  }, { skip: isFresh(req) })
  res.json(result)
}))

// --- GET /api/trends/reddit?subreddit=Entrepreneur&limit=10 ---
router.get('/reddit', requireAuth, asyncRoute(async (req, res) => {
  const subreddit = String(req.query.subreddit || 'marketing').replace(/[^a-z0-9_]/gi, '').slice(0, 50) || 'marketing'
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 25)
  const time = ['hour', 'day', 'week'].includes(String(req.query.time)) ? String(req.query.time) : 'day'

  const result = await cached('reddit', `${subreddit}:${time}:${limit}`, async () => {
    const r = await fetch(`https://www.reddit.com/r/${subreddit}/top.json?limit=${limit}&t=${time}`, {
      headers: { 'User-Agent': 'AIMarketPro/0.1 (trend-research)' },
    })
    if (!r.ok) return { posts: [], error: `status ${r.status}` }
    const d = await r.json()
    return {
      posts: (d?.data?.children || []).map(c => ({
        id: c.data.id,
        title: c.data.title,
        subreddit: c.data.subreddit,
        url: `https://reddit.com${c.data.permalink}`,
        score: c.data.score,
        comments: c.data.num_comments,
        author: c.data.author,
        thumbnail: c.data.thumbnail?.startsWith('http') ? c.data.thumbnail : null,
        createdAt: c.data.created_utc * 1000,
      })),
    }
  }, { skip: isFresh(req) })
  res.json(result)
}))

// --- GET /api/trends/news?topic=&limit=10 ---
router.get('/news', requireAuth, asyncRoute(async (req, res) => {
  const topic = String(req.query.topic || '').trim()
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50)
  if (!topic) return res.status(400).json({ error: 'topic required' })

  const keys = await prisma.byokKey.findUnique({ where: { userId: req.user.id } })
  const newsKey = keys?.newsApiKey ? decrypt(keys.newsApiKey) : null
  if (!newsKey) {
    return res.status(400).json({ error: 'NewsAPI key not configured. Add it in Settings.' })
  }

  const result = await cached('news', `${topic}:${limit}`, async () => {
    const url = new URL('https://newsapi.org/v2/everything')
    url.searchParams.set('q', topic)
    url.searchParams.set('pageSize', String(limit))
    url.searchParams.set('language', 'en')
    url.searchParams.set('sortBy', 'publishedAt')
    const r = await fetch(url.toString(), { headers: { 'X-Api-Key': newsKey } })
    const d = await r.json()
    if (!r.ok) return { articles: [], error: d?.message || `status ${r.status}` }
    return {
      articles: (d.articles || []).map(a => ({
        title: a.title,
        description: a.description,
        url: a.url,
        source: a.source?.name,
        author: a.author,
        publishedAt: a.publishedAt,
        image: a.urlToImage,
      })),
    }
  }, { skip: isFresh(req) })
  res.json(result)
}))

// --- GET /api/trends/hackernews?limit=10 ---
// Bonus: public, no key required. Surfaces tech/business cultural signal.
router.get('/hackernews', requireAuth, asyncRoute(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 30)
  const result = await cached('news', `hackernews:${limit}`, async () => {
    const idsRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
    if (!idsRes.ok) return { stories: [], error: `status ${idsRes.status}` }
    const ids = (await idsRes.json()).slice(0, limit)
    const stories = await Promise.all(ids.map(async id => {
      const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
      return r.ok ? await r.json() : null
    }))
    return {
      stories: stories.filter(Boolean).map(s => ({
        id: s.id,
        title: s.title,
        url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
        score: s.score,
        comments: s.descendants,
        by: s.by,
        time: s.time * 1000,
      })),
    }
  }, { skip: isFresh(req) })
  res.json(result)
}))

// --- POST /api/trends/synthesize ---
// body: { industry, signals: { adLibrary?, reddit?, news? } }
// Pass already-fetched signals so we can reuse cached data without re-fetching.
router.post('/synthesize', requireAuth, asyncRoute(async (req, res) => {
  const { industry, signals = {} } = req.body || {}
  if (!industry) return res.status(400).json({ error: 'industry required' })

  const keys = await prisma.byokKey.findUnique({ where: { userId: req.user.id } })
  const groqKey = keys?.groqKey ? decrypt(keys.groqKey) : null
  const geminiKey = keys?.geminiKey ? decrypt(keys.geminiKey) : null
  const anthropicKey = keys?.anthropicKey ? decrypt(keys.anthropicKey) : null

  if (!groqKey && !geminiKey && !anthropicKey) {
    return res.status(400).json({ error: 'No LLM key. Add Groq, Gemini, or Anthropic in Settings.' })
  }

  const summary = JSON.stringify({
    adLibrary: (signals.adLibrary || []).slice(0, 8),
    reddit: (signals.reddit || []).slice(0, 8),
    news: (signals.news || []).slice(0, 8),
  })

  const messages = [
    { role: 'system', content: 'You are a senior marketing strategist. Distill cross-source signal into actionable creative direction. Always return valid JSON.' },
    { role: 'user', content: `Industry: ${industry}\n\nSignals (JSON):\n${summary}\n\nReturn JSON with this shape:\n{\n  "summary": "2-3 sentence overview of what is trending and why it matters for advertisers",\n  "themes": ["3-6 short trend keywords"],\n  "suggestedAngles": [\n    { "headline": "draft ad headline", "rationale": "why this works given the data" }\n  ]\n}\n\nMake suggestedAngles 3-5 entries. Be specific to the signals provided, not generic.` },
  ]

  let out
  if (anthropicKey) out = await anthropic.chat({ apiKey: anthropicKey, messages, maxTokens: 1500 })
  else if (groqKey) out = await groq.chat({ apiKey: groqKey, messages, json: true, maxTokens: 1500 })
  else out = await gemini.chat({ apiKey: geminiKey, messages, json: true, maxTokens: 1500 })

  let parsed = null
  try { parsed = JSON.parse(out.text) }
  catch {
    const fence = out.text.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fence) try { parsed = JSON.parse(fence[1]) } catch {}
  }
  if (!parsed) {
    const m = out.text.match(/[{[][\s\S]*[}\]]/)
    if (m) try { parsed = JSON.parse(m[0]) } catch {}
  }
  if (!parsed) return res.status(502).json({ error: 'AI returned non-JSON', raw: out.text?.slice(0, 500) })

  res.json({
    summary: parsed.summary || '',
    themes: parsed.themes || [],
    suggestedAngles: parsed.suggestedAngles || [],
  })
}))

export default router
