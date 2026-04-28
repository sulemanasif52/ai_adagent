import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().min(1),

  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 chars'),
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 chars (base64-encoded 32 bytes)'),

  META_APP_ID: z.string().min(1),
  META_APP_SECRET: z.string().min(1),
  // Optional: ID of a Facebook Login for Business "Configuration".
  // When set, OAuth uses the permissions defined in that config (scope is ignored by Meta).
  META_LOGIN_CONFIG_ID: z.string().optional(),

  // In dev these differ (Vite at 5173, API at 3000).
  // In prod (Railway) they're the same — set both to your Railway URL.
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  BACKEND_URL: z.string().url().default('http://localhost:3000'),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error('Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
export const isProd = env.NODE_ENV === 'production'
