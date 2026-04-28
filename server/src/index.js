import express from 'express'
import session from 'express-session'
import { PrismaSessionStore } from '@quixo3/prisma-session-store'
import cors from 'cors'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

import { env, isProd } from './env.js'
import { prisma } from './db.js'
import { passport } from './auth/passport.js'

import authRoutes from './auth/routes.js'
import meRoutes from './routes/me.js'
import settingsRoutes from './routes/settings.js'
import preferencesRoutes from './routes/preferences.js'
import instagramRoutes from './routes/instagram.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '..', '..', 'dist')

const app = express()

app.set('trust proxy', 1)

app.use(morgan(isProd ? 'combined' : 'dev'))
app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())

// CORS only matters in dev (cross-origin between Vite :5173 and API :3000).
// In prod, frontend is served from the same origin so this is a no-op.
if (!isProd) {
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }))
}

app.use(
  session({
    name: 'aim.sid',
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: isProd,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
    store: new PrismaSessionStore(prisma, {
      checkPeriod: 2 * 60 * 1000,
      dbRecordIdIsSessionId: false,
      dbRecordIdFunction: undefined,
    }),
  }),
)

app.use(passport.initialize())
app.use(passport.session())

app.get('/api/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }))

app.use('/api/auth', authRoutes)
app.use('/api/me', meRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/preferences', preferencesRoutes)
app.use('/api/instagram', instagramRoutes)

// Production: serve the built React app from dist/, with SPA fallback for non-/api routes.
if (isProd && fs.existsSync(distDir)) {
  app.use(express.static(distDir, { index: false, maxAge: '1h' }))
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
} else if (isProd) {
  console.warn(`[warn] dist/ not found at ${distDir} — frontend won't be served`)
}

app.use((err, _req, res, _next) => {
  console.error('[error]', err)
  res.status(err.status || 500).json({ error: err.message || 'internal_error' })
})

const port = env.PORT
app.listen(port, '0.0.0.0', () => {
  console.log(`✓ AIMarket server listening on port ${port} (env: ${env.NODE_ENV})`)
  if (isProd) console.log(`  serving frontend from ${distDir}`)
})
