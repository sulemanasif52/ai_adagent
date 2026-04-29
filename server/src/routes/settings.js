import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../auth/middleware.js'
import { prisma } from '../db.js'
import { encrypt, mask, decrypt } from '../lib/crypto.js'

const router = Router()

// Map of field-name in API ↔ column-name in DB.
// `secret: true` means: returned masked, encrypted at rest.
const FIELDS = {
  anthropic_key:     { col: 'anthropicKey',      secret: true },
  fal_key:           { col: 'falKey',            secret: true },
  cloudflare_token:  { col: 'cloudflareToken',   secret: true },
  cloudflare_account:{ col: 'cloudflareAccount', secret: false },
  hf_token:          { col: 'hfToken',           secret: true },
  groq_key:          { col: 'groqKey',           secret: true },
  gemini_key:        { col: 'geminiKey',         secret: true },
  resend_key:        { col: 'resendKey',         secret: true },
  news_api_key:      { col: 'newsApiKey',        secret: true },
  ig_token:          { col: 'igToken',           secret: true },
  ig_user_id:        { col: 'igUserId',          secret: false },
}

router.get('/', requireAuth, async (req, res) => {
  const row = await prisma.byokKey.findUnique({ where: { userId: req.user.id } })
  const out = {}
  for (const [api, { col, secret }] of Object.entries(FIELDS)) {
    const val = row?.[col] ?? null
    if (val == null) {
      out[api] = ''
      continue
    }
    out[api] = secret ? mask(decrypt(val) || '') : val
  }
  res.json(out)
})

const putSchema = z.object(
  Object.fromEntries(Object.keys(FIELDS).map(k => [k, z.string().optional()])),
)

router.put('/', requireAuth, async (req, res) => {
  const body = putSchema.safeParse(req.body)
  if (!body.success) return res.status(400).json({ error: 'invalid_body', details: body.error.flatten() })

  // Build update payload — only set fields the caller actually sent.
  // Empty string means "clear". A masked value (starts with ••••) means "leave existing".
  const data = {}
  for (const [api, { col, secret }] of Object.entries(FIELDS)) {
    if (!(api in body.data)) continue
    const v = body.data[api]
    if (v == null) continue
    if (secret && v.startsWith('••••')) continue
    if (v === '') {
      data[col] = null
    } else {
      data[col] = secret ? encrypt(v.trim()) : v.trim()
    }
  }

  await prisma.byokKey.upsert({
    where: { userId: req.user.id },
    create: { userId: req.user.id, ...data },
    update: data,
  })

  res.json({ ok: true })
})

export default router
