# Deployment & integration setup

## Option A (recommended): everything on Vercel as one project

The repo root contains `vercel.json` and `api/index.js`. Vercel serves the React app as static files and runs the Express API as a Vercel Function on `/api/*`. Both share one origin, so login cookies work without extra setup.

1. **Vercel → Add New → Project → import `UV_DSP`.**
   - **Root Directory:** `./` (the repo root, *not* `client`).
   - **Application Preset / Framework:** **Other**. Don't choose "Services", and don't use "Import single project" for client or server. `vercel.json` already wires both together.
   - Leave Build, Output and Install settings empty; they come from `vercel.json`.
2. **Add a database.** Serverless functions can't keep a local database, so use one of these:
   - Vercel → **Storage → Create Database → Neon (Postgres)**, connected to this project. It sets `POSTGRES_URL` / `DATABASE_URL` automatically.
   - Supabase: set `DATABASE_URL` to its pooler connection string.

   The tables are created automatically on the first request.
3. **Environment Variables** (Project → Settings → Environment Variables):

   | Name | Value |
   |---|---|
   | `JWT_SECRET` | A long random string. Required. |
   | `CRON_SECRET` | A random string. Required for the daily job; Vercel sends it to the cron automatically. |
   | `APP_URL` | `https://<your-project>.vercel.app` |
   | Optional | `OPENAI_API_KEY`, `ADZUNA_APP_ID` / `ADZUNA_APP_KEY`, `JSEARCH_API_KEY`, `EMAIL_TRANSPORT=smtp` + `SMTP_*`, `TELEGRAM_BOT_TOKEN`, `ADMIN_EMAILS` |
4. **Deploy**, or Redeploy after adding variables. Open `https://<your-project>.vercel.app/api/health`; it should return `{"status":"ok","database":"postgres",…}`.

If a required variable is missing, the sign-up page names it ("Server not configured: set …") instead of showing a 404.

**Daily alerts on Vercel:** `vercel.json` registers a cron at **03:30 UTC (09:00 IST)** that calls `/api/cron/daily`. That run collects jobs, matches alerts and sends digests. Hobby plans allow one cron run per day, so every user's digest goes out with that run. Per-user delivery times apply only on always-on hosts such as Render (Option B). Each function call can run for up to 60 s.

---

## Option B: Render (API) + Vercel (frontend) + Supabase

Recommended layout: **Supabase** (PostgreSQL + optional Auth) → **Render** (Node API + scheduler) → **Vercel** (React frontend, proxying `/api` to Render so cookies stay first-party).

## 1. Database – Supabase

1. Create a Supabase project.
2. Go to **Project Settings → Database → Connection string → URI**. The *Session pooler* URI is recommended. Use it as `DATABASE_URL`, and set `DATABASE_SSL=true`.
3. The API applies migrations automatically on start (tracked in the `schema_migrations` table). You can also run them manually: `DATABASE_URL=... npm run migrate`.
4. *(Recommended)* Run [`supabase/rls_policies.sql`](../supabase/rls_policies.sql) in the SQL editor. It enables RLS and blocks direct `anon` access to your data.

### Optional: Supabase Auth
Set `AUTH_PROVIDER=supabase`, `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Sign-up and sign-in are then delegated to Supabase, while the API keeps issuing its own httpOnly session cookie. If email confirmation is on in Supabase, new users are told to confirm their email before signing in.

## 2. API – Render

1. Push the repo to GitHub, then go to Render → **New → Blueprint** and select the repo. `render.yaml` defines the `careerpilot-api` web service.
2. Fill in the environment variables (see [`server/.env.example`](../server/.env.example)). The minimum is `DATABASE_URL`, `DATABASE_SSL=true`, `CLIENT_ORIGIN=https://<your-app>.vercel.app` and `APP_URL=https://<your-app>.vercel.app`. `JWT_SECRET` is generated automatically.
3. Use an **always-on instance** (Starter or above). The in-process scheduler (`JOB_COLLECTION_CRON`, `DIGEST_CHECK_CRON`) does not run while a free instance sleeps. Alternative: set `SCHEDULER_ENABLED=false` and create a **Render Cron Job** running `npm run collect -w server -- --digests` every 15 minutes, with the same env vars.
4. Health check: `GET /api/health`.

## 3. Frontend – Vercel

1. Import the repo into Vercel with **Root Directory = `client`**. The framework is detected as Vite.
2. Add a `client/vercel.json` with the rewrite `{ "source": "/api/:path*", "destination": "https://<your-render-host>/api/:path*" }` plus the SPA fallback `{ "source": "/(.*)", "destination": "/index.html" }`. Browser calls to `/api/*` are then proxied to the API, so session cookies are first-party (`COOKIE_SAMESITE=lax` works).
3. Leave `VITE_API_URL` empty.

> Not using the rewrite? Set `VITE_API_URL=https://<api-host>` in Vercel, and on the API set `COOKIE_SAMESITE=none`, `COOKIE_SECURE=true` and `CLIENT_ORIGIN=https://<vercel-host>`. Some browsers restrict third-party cookies, so the rewrite is preferred.

### Single-service alternative
Build both packages (`npm run build`), set `SERVE_CLIENT=true` on the API, and it serves `client/dist` from the same origin.

## 4. Integrations

Every integration is optional. The UI reports each one's real status under **Settings → Integrations** and in **Daily Job Alerts**, and never claims one is active before it is configured and tested.

### OpenAI (AI interview evaluation, question generation, resume rewriting, company profiles)
- `OPENAI_API_KEY`, plus optionally `OPENAI_MODEL` (default `gpt-4o-mini`).
- Calls are made only from the server. If a call fails, the feature falls back to the offline engine and the UI shows which evaluator was used.

### Email digest (SMTP)
- `EMAIL_TRANSPORT=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`.
- Any SMTP provider works (SES, SendGrid, Brevo, Mailgun, Gmail with an app password, …).
- **Activation:** each user opens **Daily Job Alerts → Alert settings → Email digest → Send test**. Email digests are sent only after that test succeeds.
- `EMAIL_TRANSPORT=json` is a test transport that records messages in the delivery history without delivering them. It is used by the E2E suite and is labelled as such in the UI.

### Telegram (optional)
1. Create a bot with **@BotFather** and set `TELEGRAM_BOT_TOKEN`.
2. Each user starts a chat with the bot, gets their chat ID (for example via @userinfobot), enters it in **Alert settings**, and clicks **Send test**.

### Job sources
| Variable | Source |
|---|---|
| `GREENHOUSE_BOARDS`, `LEVER_COMPANIES`, `ASHBY_ORGS`, `SMARTRECRUITERS_COMPANIES` | Optional comma-separated lists that **replace** the company catalog for that ATS (`server/src/sources/catalog.ts`). |
| `WORKDAY_SITES` | Optional `tenant:N:site` list replacing the Workday catalog, e.g. `salesforce:12:External_Career_Site`. |
| `JOOBLE_API_KEY` | Optional free Jooble API key. |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | Free key from https://developer.adzuna.com/ (India: Bengaluru & Hyderabad) |
| `JSEARCH_API_KEY` | RapidAPI key for JSearch (LinkedIn / Indeed / Naukri postings via Google for Jobs) |
| `ENABLE_LIVE_SOURCES` | `false` disables all network sources (tests/offline) |

Sources can be toggled in **Settings → Job sources**. Set `ADMIN_EMAILS` to restrict this, and the manual “Fetch latest jobs” button, to administrators.

### Adding a new job source
Add an object implementing `JobSourceAdapter` (`id, name, kind, website, description, requiresCredentials, isLive, unavailableReason(), fetch()`) to `ADAPTERS` in `server/src/sources/adapters.ts`. Normalisation, role classification, skills extraction, dedupe, matching and alerts are applied automatically.

## 5. Scheduling summary

| Job | Default | Purpose |
|---|---|---|
| Collection | `0 6 * * *` (Asia/Kolkata) | Fetch all enabled sources, upsert and dedupe, mark disappeared listings inactive, create alerts for every user |
| Digest check | `*/15 * * * *` | For each user whose local time has passed their delivery time and who has no digest yet today: match again, then send through active channels |

## 6. Production checklist
- [ ] `NODE_ENV=production`, strong `JWT_SECRET`, `COOKIE_SECURE=true`
- [ ] `DATABASE_URL` points to Supabase/Postgres (PGlite is for local development only)
- [ ] `CLIENT_ORIGIN` / `APP_URL` set to the real frontend URL
- [ ] RLS script applied (Supabase)
- [ ] SMTP configured, and a test email sent from the app
- [ ] At least one India-focused job API (Adzuna/JSearch) configured
- [ ] `ADMIN_EMAILS` set if more than one person uses the deployment
