import passport from 'passport'
import { Strategy as FacebookStrategy } from 'passport-facebook'
import { prisma } from '../db.js'
import { encrypt } from '../lib/crypto.js'
import { env } from '../env.js'
import { exchangeForLongLived, resolveInstagramAccount } from '../lib/meta-tokens.js'

// Scopes — only used if META_LOGIN_CONFIG_ID is NOT set.
// With Facebook Login for Business, permissions come from the configuration; scope is ignored.
// To enable IG/FB publishing the configuration MUST also grant these:
//   - instagram_content_publish (post images to IG Business)
//   - pages_manage_posts (post to FB Page feed)
//   - plus the Phase 2 read scopes (instagram_basic, pages_show_list, etc.)
const SCOPES = [
  'email',
  'public_profile',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_insights',
  'instagram_manage_comments',
  'business_management',
]

const strategy = new FacebookStrategy(
  {
    clientID: env.META_APP_ID,
    clientSecret: env.META_APP_SECRET,
    callbackURL: `${env.BACKEND_URL}/api/auth/facebook/callback`,
    profileFields: ['id', 'displayName', 'emails', 'photos'],
    enableProof: true,
    graphAPIVersion: 'v21.0',
  },
  async (accessToken, _refreshToken, profile, done) => {
    try {
      const fbUserId = profile.id
      const email = profile.emails?.[0]?.value ?? null
      const name = profile.displayName || 'Unknown'
      const avatarUrl = profile.photos?.[0]?.value ?? null

      // 1. Exchange short-lived for long-lived (60 days). If this fails, log
      //    the error but keep the short-lived token so login still succeeds.
      let userToken = accessToken
      let expiresAt = null
      try {
        const longLived = await exchangeForLongLived(accessToken)
        userToken = longLived.access_token
        if (longLived.expires_in) {
          expiresAt = new Date(Date.now() + longLived.expires_in * 1000)
        }
      } catch (err) {
        console.warn('[auth] long-lived exchange failed:', err.message)
      }

      // 2. Resolve Page + Instagram Business account. Best-effort — if user
      //    didn't grant Pages permission, just leave these null.
      let igInfo = null
      try {
        igInfo = await resolveInstagramAccount(userToken)
      } catch (err) {
        console.warn('[auth] IG resolution failed:', err.message)
      }

      const credentialPayload = {
        accessToken: encrypt(userToken),
        scopes: SCOPES.join(','),
        expiresAt,
        ...(igInfo && {
          pageId: igInfo.pageId,
          pageName: igInfo.pageName,
          pageAccessToken: igInfo.pageAccessToken ? encrypt(igInfo.pageAccessToken) : null,
          igBusinessAccountId: igInfo.igBusinessAccountId,
          igUsername: igInfo.igUsername,
        }),
      }

      const user = await prisma.user.upsert({
        where: { fbUserId },
        create: {
          fbUserId,
          email,
          name,
          avatarUrl,
          metaCredential: { create: credentialPayload },
          preferences: { create: {} },
          byokKeys: { create: {} },
        },
        update: {
          email,
          name,
          avatarUrl,
          metaCredential: {
            upsert: { create: credentialPayload, update: credentialPayload },
          },
        },
      })

      done(null, { id: user.id })
    } catch (err) {
      done(err)
    }
  },
)

if (env.META_LOGIN_CONFIG_ID) {
  const original = strategy.authorizationParams.bind(strategy)
  strategy.authorizationParams = function (options) {
    return { ...original(options), config_id: env.META_LOGIN_CONFIG_ID }
  }
}

passport.use(strategy)

passport.serializeUser((user, done) => done(null, user.id))
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } })
    done(null, user || false)
  } catch (err) {
    done(err)
  }
})

export { passport, SCOPES }
