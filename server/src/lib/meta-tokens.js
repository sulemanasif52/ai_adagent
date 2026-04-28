// Token exchange + Page/Instagram resolution against Meta Graph API.
//
// Flow on login:
//   1. Passport gives us a short-lived user token (~1 hour).
//   2. exchangeForLongLived() → 60-day user token.
//   3. listPages() with the long-lived user token → list of FB Pages the
//      user admins, each with a Page access token (these don't expire when
//      derived from a long-lived user token).
//   4. resolveInstagramAccount() picks the first Page with an attached IG
//      Business account.

import { env } from '../env.js'

const GRAPH = 'https://graph.facebook.com/v21.0'

async function gget(url) {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || data.error) {
    const err = new Error(data?.error?.message || `Graph API ${res.status}`)
    err.code = data?.error?.code
    err.status = res.status
    throw err
  }
  return data
}

export async function exchangeForLongLived(shortLivedUserToken) {
  const url = new URL(`${GRAPH}/oauth/access_token`)
  url.searchParams.set('grant_type', 'fb_exchange_token')
  url.searchParams.set('client_id', env.META_APP_ID)
  url.searchParams.set('client_secret', env.META_APP_SECRET)
  url.searchParams.set('fb_exchange_token', shortLivedUserToken)
  return await gget(url.toString())  // { access_token, token_type, expires_in? }
}

export async function listPages(longLivedUserToken) {
  const url = new URL(`${GRAPH}/me/accounts`)
  url.searchParams.set('fields', 'id,name,access_token,instagram_business_account{id,username}')
  url.searchParams.set('access_token', longLivedUserToken)
  const data = await gget(url.toString())
  return data.data || []
}

// Returns { pageId, pageName, pageAccessToken, igBusinessAccountId, igUsername } | null
export async function resolveInstagramAccount(longLivedUserToken) {
  const pages = await listPages(longLivedUserToken)
  // Prefer Pages with a linked IG account; fall back to the first Page if none.
  const withIg = pages.find(p => p.instagram_business_account?.id)
  const chosen = withIg || pages[0]
  if (!chosen) return null

  return {
    pageId: chosen.id,
    pageName: chosen.name,
    pageAccessToken: chosen.access_token,
    igBusinessAccountId: chosen.instagram_business_account?.id || null,
    igUsername: chosen.instagram_business_account?.username || null,
  }
}
