# AIMarket Pro — Server (Phase 0)

Express + Prisma (SQLite) + Passport (Facebook OAuth). BYOK keys encrypted at rest with AES-GCM.

## What's in this scaffold

- **Auth:** Login with Facebook → upserts a `User` + encrypted FB access token in DB → cookie session (Prisma-backed)
- **Routes:**
  - `GET  /api/health`
  - `GET  /api/auth/facebook` — starts OAuth
  - `GET  /api/auth/facebook/callback` — handled by Passport
  - `POST /api/auth/logout`
  - `GET  /api/me`
  - `GET/PUT /api/settings` — encrypted BYOK keys (Anthropic, fal.ai, etc.)
  - `GET/PUT /api/preferences` — optimization mode + alert toggles
- **DB:** SQLite at `prisma/dev.db`. Swap `provider = "sqlite"` → `"postgresql"` in `prisma/schema.prisma` when you deploy.

## First-run setup

You **only** need to fill in two values. The session secret + encryption key were already generated.

1. Open `server/.env`
2. Replace `META_APP_ID=REPLACE_ME` with your **Meta App ID** (from your app's Settings → Basic page on developers.facebook.com)
3. Replace `META_APP_SECRET=REPLACE_ME` with your **Meta App Secret** (same page, click "Show")

That's it. AI keys (Anthropic, fal.ai, etc.) are **not** in `.env` — paste them in the app's Settings modal once you log in.

## Run

```bash
# Terminal 1 — backend
cd server
npm run dev          # → http://localhost:3000

# Terminal 2 — frontend
cd ..                # back to repo root
npm run dev          # → http://localhost:5173
```

Open http://localhost:5173, click "Log in with Facebook", and you should land on `/dashboard` with your real name in the Header.

## Useful scripts

```bash
npm run db:studio   # open Prisma Studio in your browser to inspect data
npm run db:migrate  # run after editing prisma/schema.prisma
npm run db:generate # regenerate Prisma client only
```

## Phase 0 status

✅ Auth (Facebook login)
✅ Sessions persisted to DB
✅ Encrypted BYOK key storage
✅ User identity in Header (replaces "Sarah Jenkins")
✅ Login gate on `/dashboard`, `/create-ad`, `/analytics`, `/crm`, `/billing`
✅ Notification + optimization-mode preferences persisted

⏭ **Phase 1 (next):** real campaigns, AI generation moved server-side, file uploads, "Approve & Launch" persists a campaign.
⏭ **Phase 2:** IG analytics endpoints, insights/recommendations pipeline, real Analytics charts.
⏭ **Phase 3:** chatbot rewritten as a tool-calling agent grounded in your IG data.
