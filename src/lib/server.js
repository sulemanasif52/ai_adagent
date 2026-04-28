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
