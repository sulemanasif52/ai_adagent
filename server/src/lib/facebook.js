// Facebook Page Graph API client. All calls require a Page ID + Page Access
// Token (both stored on MetaCredential after login). Mirrors instagram.js.
//
// Reference: https://developers.facebook.com/docs/graph-api/reference/page/

const GRAPH = 'https://graph.facebook.com/v21.0'

async function gget(url) {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || data.error) {
    const err = new Error(data?.error?.message || `FB Graph API ${res.status}`)
    err.code = data?.error?.code
    err.subcode = data?.error?.error_subcode
    err.status = res.status
    err.payload = data?.error
    throw err
  }
  return data
}

export async function getPageProfile(pageId, pageToken) {
  const url = new URL(`${GRAPH}/${pageId}`)
  url.searchParams.set(
    'fields',
    'id,name,about,category,fan_count,followers_count,picture{url},link,verification_status',
  )
  url.searchParams.set('access_token', pageToken)
  return await gget(url.toString())
}

// Page-level insights for v21:
//   - `page_impressions`, `page_impressions_unique`, `page_post_engagements`,
//     `page_video_views` come back as time-series (period=day, m.values[]).
//   - `page_fans` is a single total. Some metrics 404 for newer pages; we
//     soft-fail so missing metrics don't kill the whole call.
export async function getPageInsights(pageId, pageToken, { since, until } = {}) {
  const series = new URL(`${GRAPH}/${pageId}/insights`)
  series.searchParams.set(
    'metric',
    'page_impressions,page_impressions_unique,page_post_engagements,page_video_views',
  )
  series.searchParams.set('period', 'day')
  series.searchParams.set('access_token', pageToken)
  if (since) series.searchParams.set('since', String(since))
  if (until) series.searchParams.set('until', String(until))

  const fans = new URL(`${GRAPH}/${pageId}/insights/page_fans`)
  fans.searchParams.set('period', 'day')
  fans.searchParams.set('access_token', pageToken)
  if (since) fans.searchParams.set('since', String(since))
  if (until) fans.searchParams.set('until', String(until))

  const [seriesRes, fansRes] = await Promise.all([
    gget(series.toString()).catch(err => {
      console.warn('[fb] page series fetch failed:', err.message)
      return { data: [] }
    }),
    gget(fans.toString()).catch(err => {
      console.warn('[fb] page_fans fetch failed:', err.message)
      return { data: [] }
    }),
  ])

  return { data: [...(seriesRes.data || []), ...(fansRes.data || [])] }
}

export async function getPagePosts(pageId, pageToken, { limit = 12 } = {}) {
  const url = new URL(`${GRAPH}/${pageId}/posts`)
  url.searchParams.set(
    'fields',
    'id,message,created_time,permalink_url,full_picture,attachments{media_type,url},reactions.summary(total_count),comments.summary(total_count),shares',
  )
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('access_token', pageToken)
  const data = await gget(url.toString())
  return data.data || []
}

export async function getPostInsights(postId, pageToken) {
  const url = new URL(`${GRAPH}/${postId}/insights`)
  url.searchParams.set(
    'metric',
    'post_impressions,post_impressions_unique,post_engaged_users,post_clicks,post_reactions_by_type_total',
  )
  url.searchParams.set('access_token', pageToken)
  try {
    return await gget(url.toString())
  } catch {
    const fb = new URL(`${GRAPH}/${postId}/insights`)
    fb.searchParams.set('metric', 'post_impressions')
    fb.searchParams.set('access_token', pageToken)
    return await gget(fb.toString())
  }
}
