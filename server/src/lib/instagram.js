// Instagram Graph API client. All calls require an IG Business Account ID +
// a Page Access Token (both stored on MetaCredential after login).
//
// Reference: https://developers.facebook.com/docs/instagram-api/

const GRAPH = 'https://graph.facebook.com/v21.0'

async function gget(url) {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || data.error) {
    const err = new Error(data?.error?.message || `IG Graph API ${res.status}`)
    err.code = data?.error?.code
    err.subcode = data?.error?.error_subcode
    err.status = res.status
    err.payload = data?.error
    throw err
  }
  return data
}

export async function getAccountProfile(igId, pageToken) {
  const url = new URL(`${GRAPH}/${igId}`)
  url.searchParams.set(
    'fields',
    'id,username,name,profile_picture_url,biography,website,followers_count,follows_count,media_count',
  )
  url.searchParams.set('access_token', pageToken)
  return await gget(url.toString())
}

// Account-level insights for v21:
//   - `reach` returns a daily time series (period=day, no metric_type).
//   - `views`, `profile_views`, `website_clicks`, `accounts_engaged`,
//     `total_interactions` return one total value for the period and require
//     `metric_type=total_value`.
// Make both calls in parallel and merge.
export async function getAccountInsights(igId, pageToken, { since, until } = {}) {
  const baseSeries = new URL(`${GRAPH}/${igId}/insights`)
  baseSeries.searchParams.set('metric', 'reach')
  baseSeries.searchParams.set('period', 'day')
  baseSeries.searchParams.set('access_token', pageToken)
  if (since) baseSeries.searchParams.set('since', String(since))
  if (until) baseSeries.searchParams.set('until', String(until))

  const baseTotals = new URL(`${GRAPH}/${igId}/insights`)
  baseTotals.searchParams.set(
    'metric',
    'views,profile_views,website_clicks,accounts_engaged,total_interactions',
  )
  baseTotals.searchParams.set('metric_type', 'total_value')
  baseTotals.searchParams.set('period', 'day')
  baseTotals.searchParams.set('access_token', pageToken)
  if (since) baseTotals.searchParams.set('since', String(since))
  if (until) baseTotals.searchParams.set('until', String(until))

  const [seriesRes, totalsRes] = await Promise.all([
    gget(baseSeries.toString()).catch(err => {
      console.warn('[ig] series fetch failed:', err.message)
      return { data: [] }
    }),
    gget(baseTotals.toString()).catch(err => {
      console.warn('[ig] totals fetch failed:', err.message)
      return { data: [] }
    }),
  ])

  return { data: [...(seriesRes.data || []), ...(totalsRes.data || [])] }
}

export async function getMedia(igId, pageToken, { limit = 25 } = {}) {
  const url = new URL(`${GRAPH}/${igId}/media`)
  url.searchParams.set(
    'fields',
    'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count',
  )
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('access_token', pageToken)
  const data = await gget(url.toString())
  return data.data || []
}

export async function getMediaInsights(mediaId, pageToken) {
  // v21 per-media metrics. `impressions` removed — `views` is the modern equivalent.
  const url = new URL(`${GRAPH}/${mediaId}/insights`)
  url.searchParams.set('metric', 'reach,views,saved,total_interactions,likes,comments,shares')
  url.searchParams.set('access_token', pageToken)
  try {
    return await gget(url.toString())
  } catch {
    const fb = new URL(`${GRAPH}/${mediaId}/insights`)
    fb.searchParams.set('metric', 'reach')
    fb.searchParams.set('access_token', pageToken)
    return await gget(fb.toString())
  }
}

export async function getMediaComments(mediaId, pageToken, { limit = 50 } = {}) {
  const url = new URL(`${GRAPH}/${mediaId}/comments`)
  url.searchParams.set('fields', 'id,text,username,timestamp,like_count')
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('access_token', pageToken)
  const data = await gget(url.toString())
  return data.data || []
}

// ─── Publishing (organic posts to user's IG Business account) ────────────────
// Requires the `instagram_content_publish` scope. The image URL must be
// publicly accessible (Meta fetches it server-side). Two-step flow:
//   1. POST /{igId}/media with image_url + caption → returns container creationId
//   2. POST /{igId}/media_publish with creationId → returns published media id

async function gpost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    const err = new Error(data?.error?.message || `IG Graph POST ${res.status}`)
    err.code = data?.error?.code
    err.status = res.status
    err.payload = data?.error
    throw err
  }
  return data
}

export async function createMediaContainer(igId, pageToken, { imageUrl, caption, mediaType = 'IMAGE' }) {
  if (!imageUrl) throw new Error('imageUrl required')
  const body = { image_url: imageUrl, access_token: pageToken }
  if (caption) body.caption = String(caption).slice(0, 2200)
  if (mediaType === 'REELS') body.media_type = 'REELS'
  const data = await gpost(`${GRAPH}/${igId}/media`, body)
  return data.id  // container creation id
}

export async function publishMediaContainer(igId, pageToken, creationId) {
  const data = await gpost(`${GRAPH}/${igId}/media_publish`, {
    creation_id: creationId,
    access_token: pageToken,
  })
  return data.id  // published media id
}

// One-shot helper: create container, poll for ready (FINISHED status), publish.
export async function publishImageToInstagram(igId, pageToken, { imageUrl, caption }) {
  const containerId = await createMediaContainer(igId, pageToken, { imageUrl, caption })

  // Poll status — Meta needs a moment to download & validate the image.
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 1500))
    const statusUrl = new URL(`${GRAPH}/${containerId}`)
    statusUrl.searchParams.set('fields', 'status_code,status')
    statusUrl.searchParams.set('access_token', pageToken)
    const status = await gget(statusUrl.toString()).catch(() => null)
    if (status?.status_code === 'FINISHED') break
    if (status?.status_code === 'ERROR') {
      throw new Error(`IG container failed: ${status.status || 'unknown error'}`)
    }
  }

  const mediaId = await publishMediaContainer(igId, pageToken, containerId)
  return { mediaId, containerId }
}
