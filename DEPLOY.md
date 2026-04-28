# Deploying AIMarket Pro to Railway

Single-service deploy: Express serves both `/api/*` and the built React frontend from one URL.

## One-time prerequisites

1. **Railway account** — https://railway.app (sign in with GitHub)
2. **Railway CLI**:
   ```powershell
   npm i -g @railway/cli
   ```
3. **Auth the CLI** (browser opens, sign in):
   ```powershell
   railway login
   ```

## Step 1 — generate the random secrets

These are needed as Railway env vars. Generate them locally so you can paste them in:

```powershell
# Run twice — once for SESSION_SECRET, once for ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Save both outputs.

## Step 2 — create the Railway project

From the repo root:

```powershell
cd C:\Users\Dell\ai_adagent
railway init
```

It prompts for a project name. Pick anything (e.g. `aimarket-pro`).

## Step 3 — add a persistent volume for SQLite

Railway's filesystem is ephemeral by default — the SQLite DB would be wiped on every redeploy. Add a volume:

1. Open the project in Railway dashboard (`railway open`)
2. Click your service → **Variables** tab → leave it for now
3. Service → **Settings** tab → scroll to **Volumes** → **+ New Volume**
4. **Mount path**: `/data`
5. **Size**: 1 GB is plenty
6. Click **Add**

## Step 4 — set environment variables

In the dashboard's **Variables** tab (or via CLI), set:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `file:/data/dev.db` |
| `SESSION_SECRET` | the first random string from Step 1 |
| `ENCRYPTION_KEY` | the second random string from Step 1 |
| `META_APP_ID` | from your Meta app's Settings → Basic |
| `META_APP_SECRET` | from your Meta app's Settings → Basic |
| `FRONTEND_URL` | leave blank for now (set after Step 5) |
| `BACKEND_URL` | leave blank for now (set after Step 5) |

CLI alternative:
```powershell
railway variables --set NODE_ENV=production --set DATABASE_URL=file:/data/dev.db --set SESSION_SECRET=... --set ENCRYPTION_KEY=... --set META_APP_ID=... --set META_APP_SECRET=...
```

## Step 5 — first deploy + get your URL

```powershell
railway up
```

This uploads the repo, builds (frontend + backend), and deploys. Wait for it to finish.

Get your public URL:
```powershell
railway domain
```
*(or in dashboard: Service → Settings → Networking → Generate Domain)*

You'll get something like `aimarket-pro-production-a3f9.up.railway.app`.

## Step 6 — set FRONTEND_URL + BACKEND_URL, then add the URL to Meta

```powershell
railway variables --set FRONTEND_URL=https://YOUR-URL.up.railway.app --set BACKEND_URL=https://YOUR-URL.up.railway.app
```

Then in your **Meta app dashboard**:

1. **App settings → Basic** → **App Domains** → add `YOUR-URL.up.railway.app`
2. **Facebook Login for Business → Settings** → **Valid OAuth Redirect URIs** → add:
   ```
   https://YOUR-URL.up.railway.app/api/auth/facebook/callback
   ```
3. **Save Changes** in both places

## Step 7 — redeploy with the URLs in place

```powershell
railway up
```

Once it finishes, open `https://YOUR-URL.up.railway.app` from any device. Click **Log in with Facebook**.

## Subsequent deploys

After the first deploy, every change is just:

```powershell
railway up
```

## Useful CLI commands

```powershell
railway logs            # tail server logs
railway status          # see deploy status
railway open            # open project in browser
railway variables       # list env vars
railway run npm run server:migrate    # one-off migration if needed
railway shell           # interactive shell on a service
```

## Cost note

Railway Hobby plan: $5/mo trial credit. SQLite + small Express service runs comfortably under that. If you exceed it, the cheapest path is to switch DB to Railway Postgres (1-click add-on, generous free tier within Hobby).
