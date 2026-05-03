// API client for the AIMarket server. All calls go through Vite's /api proxy
// to the Express backend; cookies are sent automatically.

async function req(path, { method = 'GET', body, headers } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  const data = text ? safeJson(text) : null

  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`)
    err.status = res.status
    err.body = data
    throw err
  }
  return data
}

function safeJson(s) { try { return JSON.parse(s) } catch { return null } }

// --- auth ---
export const loginUrl = '/api/auth/facebook'
export const logout = () => req('/auth/logout', { method: 'POST' })

// --- me ---
export const getMe = () => req('/me')

// --- settings (BYOK keys) ---
export const getSettings = () => req('/settings')
export const putSettings = body => req('/settings', { method: 'PUT', body })

// --- preferences (alerts, optimization mode) ---
export const getPreferences = () => req('/preferences')
export const putPreferences = body => req('/preferences', { method: 'PUT', body })

// --- Instagram analytics ---
export const getIgAccount    = () => req('/instagram/account')
export const getIgInsights   = (days = 7) => req(`/instagram/insights?days=${days}`)
export const getIgPosts      = ({ fresh = false, limit = 12 } = {}) =>
  req(`/instagram/posts?limit=${limit}${fresh ? '&fresh=1' : ''}`)
export const getIgPostInsights = postId => req(`/instagram/posts/${postId}/insights`)
export const getIgPostComments = (postId, fresh = false) =>
  req(`/instagram/posts/${postId}/comments${fresh ? '?fresh=1' : ''}`)
export const syncInstagram   = () => req('/instagram/sync', { method: 'POST' })

// --- Facebook Page analytics ---
export const getFbPage         = () => req('/facebook/page')
export const getFbPageInsights = (days = 7) => req(`/facebook/page/insights?days=${days}`)
export const getFbPagePosts    = (limit = 12) => req(`/facebook/page/posts?limit=${limit}`)
export const getFbPostInsights = id => req(`/facebook/page/posts/${id}/insights`)
export const getFbPostComments = (id, limit = 50) => req(`/facebook/page/posts/${id}/comments?limit=${limit}`)

// --- AI generation ---
export const aiGenerateCopy   = body => req('/ai/generate-copy', { method: 'POST', body })
export const aiGenerateImage  = body => req('/ai/generate-image', { method: 'POST', body })
export const aiAnalyze        = body => req('/ai/analyze', { method: 'POST', body })
export const aiGenerateScript = body => req('/ai/generate-script', { method: 'POST', body })

// --- File upload (multipart, custom flow) ---
export async function uploadFile(file, onProgress) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: fd })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

// --- Campaigns ---
const qs = (params) => {
  if (!params) return ''
  const e = Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
  return e.length ? '?' + e.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&') : ''
}

export const listCampaigns      = (params) => req('/campaigns' + qs(params))
export const createCampaign     = (body) => req('/campaigns', { method: 'POST', body })
export const getCampaign        = (id) => req(`/campaigns/${id}`)
export const updateCampaign     = (id, body) => req(`/campaigns/${id}`, { method: 'PUT', body })
export const deleteCampaign     = (id) => req(`/campaigns/${id}`, { method: 'DELETE' })
export const addCampaignMetric  = (id, body) => req(`/campaigns/${id}/metrics`, { method: 'POST', body })
export const publishCampaign    = (id, body) => req(`/campaigns/${id}/publish`, { method: 'POST', body })

// --- Per-post (creative) endpoints ---
export const listCampaignPosts  = (id) => req(`/campaigns/${id}/posts`)
export const createCampaignPost = (id, body) => req(`/campaigns/${id}/posts`, { method: 'POST', body })
export const updateCampaignPost = (postId, body) => req(`/campaigns/posts/${postId}`, { method: 'PUT', body })
export const deleteCampaignPost = (postId) => req(`/campaigns/posts/${postId}`, { method: 'DELETE' })
export const publishCampaignPost = (postId, body) => req(`/campaigns/posts/${postId}/publish`, { method: 'POST', body })

// --- Direct platform publishing ---
export const publishToInstagram = (body) => req('/instagram/publish', { method: 'POST', body })
export const publishToFbPage    = (body) => req('/facebook/page/publish', { method: 'POST', body })

// --- Leads / CRM ---
export const listLeads   = (params) => req('/leads' + qs(params))
export const getLead     = (id) => req(`/leads/${id}`)
export const updateLead  = (id, body) => req(`/leads/${id}`, { method: 'PUT', body })
export const captureLead = (body) => req('/leads', { method: 'POST', body })

// --- Notifications ---
export const listNotifications  = (unreadOnly = false) => req(`/notifications${unreadOnly ? '?unreadOnly=1' : ''}`)
export const markNotificationsRead = (ids) => req('/notifications/mark-read', { method: 'POST', body: { ids } })
export const deleteNotification = (id) => req(`/notifications/${id}`, { method: 'DELETE' })

// --- Recommendations ---
export const listRecommendations  = (params) => req('/recommendations' + qs(params))
export const updateRecommendation = (id, body) => req(`/recommendations/${id}`, { method: 'PUT', body })

// --- Trends --- (pass fresh=true to bypass server-side cache)
export const trendsAdLibrary  = (keyword, country = 'US', fresh = false) => req(`/trends/ad-library?keyword=${encodeURIComponent(keyword)}&country=${country}${fresh ? '&fresh=1' : ''}`)
export const trendsReddit     = (subreddit = 'marketing', limit = 10, time = 'day', fresh = false) => req(`/trends/reddit?subreddit=${encodeURIComponent(subreddit)}&limit=${limit}&time=${time}${fresh ? '&fresh=1' : ''}`)
export const trendsNews       = (topic, limit = 10, fresh = false) => req(`/trends/news?topic=${encodeURIComponent(topic)}&limit=${limit}${fresh ? '&fresh=1' : ''}`)
export const trendsHN         = (limit = 10, fresh = false) => req(`/trends/hackernews?limit=${limit}${fresh ? '&fresh=1' : ''}`)
export const trendsSynthesize = (industry, signals) => req('/trends/synthesize', { method: 'POST', body: { industry, signals } })

// --- ML ---
export const mlRunAll          = () => req('/ml/run-all', { method: 'POST' })
export const mlAnomaly         = () => req('/ml/anomaly', { method: 'POST' })
export const mlForecast        = () => req('/ml/forecast', { method: 'POST' })
export const mlBestTime        = () => req('/ml/best-time', { method: 'POST' })
export const mlSentiment       = () => req('/ml/sentiment', { method: 'POST' })
export const mlPredictRoi      = (body) => req('/ml/predict-roi', { method: 'POST', body })
export const mlAllocateBudget  = (body) => req('/ml/allocate-budget', { method: 'POST', body })
export const mlAudienceClusters = (k = 3) => req(`/ml/audience-clusters?k=${k}`)

// --- Videos (slideshow ad gen) ---
export const generateVideoAd = (body) => req('/videos/generate', { method: 'POST', body })

// --- Chat (SSE — caller handles the stream) ---
export const chatStreamUrl = '/api/chat/completions'

