# CareerPilot AI

**Find Opportunities. Prepare Smarter. Get Hired.**

CareerPilot AI is a full-stack AI career assistant for QA engineers (manual, API, fintech, automation and performance testing) looking for roles in **Bengaluru, Hyderabad and Remote**. It discovers jobs from authorised sources, scores them against your profile with a transparent formula, sends daily alerts, runs AI mock interviews, analyses resumes and tracks applications.

| Area | What it does |
|---|---|
| **Find Jobs** | Aggregates listings from official APIs and career-page feeds, with filters for role, location, experience, company, industry, skills, salary, job type and date posted (Today / 3 / 7 / 30 days). Sort by latest, match, experience or company. Duplicates are removed by source ID, normalised URL and title+company+city fingerprint. Only real listings – there is no demo data. |
| **AI Job Matching** | Explainable score: **skills 40 % · experience 25 % · industry 20 % · location 15 %**. Shows matching and missing skills, experience fit and the reasons for each recommendation. Filters for 70 / 80 / 90 %+. |
| **Daily Job Alerts** | A cron job collects jobs daily and matches *new live* jobs per user (role, location, experience, minimum score). Each job is stored once (unique `user_id, job_id`) and delivered by in-app inbox, email digest or Telegram. Email and Telegram show as **active only after the server is configured and a test message succeeds**. Full delivery history is kept. |
| **Interview Preparation** | 86 topics across Manual, API, SQL, Automation, Performance, Fintech & Payments (ISO 8583, settlement, UPI, MDR, chargebacks…) and HR, each with notes, key concepts and examples, plus 101 curated questions with ideal answers. |
| **AI Mock Interview** | Choose category, mode (MCQ / Technical / Scenario / Practical / HR / Fintech Domain / Mixed), difficulty, experience level, number of questions and an optional timer. The interviewer asks one question at a time, then scores the answer, lists missing points, suggests improvements and shows the ideal answer. You finish with a summary of weak and strong topics and a recommended next session. Uses OpenAI when configured, otherwise a deterministic key-point grader. |
| **Company Interview Questions** | Curated profiles of fintech companies with a *typical* interview-round pattern and practice questions. Clearly labelled as practice material, not verified company questions. |
| **Resume Analyzer** | PDF/DOCX upload with magic-byte validation. Reports experience (from date ranges), skills, ATS checks, role compatibility, and JD match with missing skills and keywords. Suggests an improved summary and stronger bullet rewrites. Exports an **improved .docx** for download. |
| **Application Tracker** | Pipeline from Interested → Applied → Resume Shortlisted → Interview Scheduled → Technical Round → HR Round → Selected / Rejected. Stores recruiter details, interview dates and notes. Shows stats: total, interviews, shortlisted, selection rate. |
| **Career Roadmap & Study Plan** | Readiness per career stage and a daily study plan weighted towards your weakest mock-interview topics. Mark tasks complete, set a daily goal, track your streak. |
| **Profile & Settings** | New profiles are pre-filled from the primary user profile (3–5 yrs, QA/fintech skills, preferred cities). Settings cover light/dark mode, integration status, job-source toggles and account deletion. |

## Tech stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS v4, Recharts, lucide icons (`client/`)
- **Backend:** Node.js + Express 5 + TypeScript, Zod validation, Helmet, rate limiting (`server/`)
- **Database:** PostgreSQL / Supabase via `DATABASE_URL`. With no URL set, it falls back to an **embedded PGlite (real Postgres in WASM)**, so the app runs locally with zero setup. Both use the same SQL migrations.
- **Auth:** email/password (bcrypt) **or Supabase Auth** (`AUTH_PROVIDER=supabase`). Sessions are httpOnly, SameSite JWT cookies.
- **AI:** OpenAI Chat Completions, called **only from the server**, with an offline fallback for every AI feature.
- **Scheduling:** `node-cron` (job collection + digest checks), or `npm run collect -w server` from an external cron.
- **Notifications:** Nodemailer (SMTP), Telegram Bot API, in-app inbox.
- **Testing:** Vitest (server unit/integration) + **Playwright** E2E (desktop + mobile).

## Quick start (local)

Requires **Node.js 20+**.

```bash
cd careerpilot-ai
npm install
cp server/.env.example server/.env      # optional – defaults work for local dev
npm run dev                             # API on :4000, web on http://localhost:5173
```

Open http://localhost:5173 and create an account. Your QA/fintech preferences are pre-filled.

With no API keys configured:
- Jobs come from keyless sources: public company career-page APIs (Greenhouse, Lever, Ashby, SmartRecruiters, Workday), Amazon Jobs and free remote-job APIs. No API keys are needed, and there is no demo data. Click **Fetch latest jobs** on Find Jobs to collect.
- Mock-interview grading and resume analysis use the built-in offline engines.
- Email and Telegram are reported as **Not configured**. Alerts still collect in the in-app inbox.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | API (tsx watch) + Vite dev server |
| `npm run build` | Compile server to `server/dist` and bundle client to `client/dist` |
| `npm start` | Run the compiled API (`server/dist`) |
| `npm run migrate` | Apply database migrations |
| `npm test` | Server unit/integration tests (Vitest, in-memory Postgres) |
| `npm run test:e2e` | Playwright E2E suite (starts its own API + built client on ports 4400/5400) |
| `npm run typecheck` | TypeScript checks for server and client |
| `npm run collect -w server` | One job-collection + alert cycle (add `-- --digests` to also send due digests) |

## Project structure

```
careerpilot-ai/
├── client/                React app (pages/, components/, lib/)
├── server/
│   ├── src/db/migrations/ SQL schema (users, jobs, job_sources, notifications, interviews, resumes, study_* …)
│   ├── src/sources/       Job providers (providers/), company catalog, polite HTTP client, deep-link builders
│   ├── src/services/      matching, jobs, notifications, scheduler, evaluator, interviews, resume, study, companies, ai
│   ├── src/routes/        REST API
│   ├── src/data/          Curated prep topics, question bank, company profiles
│   └── test/              Vitest suite
├── e2e/                   Playwright tests (desktop + mobile)
├── supabase/              Optional RLS hardening for Supabase
├── docs/                  API.md, DEPLOYMENT.md
└── render.yaml            Render blueprint (API)
```

## Job sources and compliance

CareerPilot collects jobs **only from official, public or licensed sources**. It never scrapes LinkedIn, Naukri, Indeed or any site that forbids automated access, never automates logins or solves CAPTCHAs, and never stores third-party passwords. There is **no demo data**: every listing is a real posting that links to the original.

### How discovery works

- Each source is a provider module in [`server/src/sources/providers/`](server/src/sources/providers/) with a common interface, `fetch({ roles, location }) → RawJob[]`, plus a pure `parse…()` function covered by unit tests against saved sample JSON ([`server/test/fixtures/`](server/test/fixtures/)).
- Companies for the ATS providers come from the **company catalog**, [`server/src/sources/catalog.ts`](server/src/sources/catalog.ts). Companies without a public API are listed there as deep links to their own careers search.
- [`providerRunner.ts`](server/src/services/providerRunner.ts) runs providers **concurrently** within a **40 s budget**. Each request times out at about 10 s, uses a descriptive User-Agent, is limited per host (Workday strictly one at a time), and is retried once on HTTP 429. A provider with a missing key is skipped, and a failing or slow provider never fails the run; partial results are kept. Each provider's minimum interval between live calls (per its terms or quota) is enforced with a result cache.
- [`discovery.ts`](server/src/services/discovery.ts) normalises every job to `id, title, company, location, remote, country, url, source, posted_date, salary, description, fetched_at`. It then de-duplicates by canonical URL, else by normalised company + title + location, and filters by **role family** (title keywords and synonyms) and **location** (city aliases, country, remote roles open to India). Finally it ranks against your profile: 85% compatibility (skills 40 / experience 25 / industry 20 / location 15) plus 15% title similarity. Each job lists **why it fits** (matched skills from your profile) and **missing skills**; skills are never invented.
- **Endpoint:** `GET /api/jobs/discover?roles=QA%20Engineer,SDET&location=Hyderabad&top=20`. It defaults to the roles and locations in your profile, is cached per user for 15 minutes, and stores matches so they also appear in Find Jobs and alerts. The scheduled run (Vercel Cron, daily) uses everyone's saved preferences.
- **Add a job yourself:** `POST /api/jobs/import` with `{ title, company, location, url?, text }`. The link is stored and **never fetched**.

### Sources

| Source | What it is | Key needed | Terms of use (summary) |
|---|---|---|---|
| **Greenhouse** | Official public Job Board API: `GET boards-api.greenhouse.io/v1/boards/{token}/jobs` (job list first, then full content only for matching roles) | No | Public API for displaying a company's openings; apply on the original posting |
| **Lever** | Official public Postings API: `GET api.lever.co/v0/postings/{company}?mode=json` | No | Public API for listing a company's openings; apply via `hostedUrl` |
| **Ashby** | Official public Job Postings API: `GET api.ashbyhq.com/posting-api/job-board/{org}?includeCompensation=true` | No | Public API for embedding a job board; apply via `jobUrl` |
| **SmartRecruiters** | Official public Posting API: `GET api.smartrecruiters.com/v1/companies/{id}/postings?q={role}` (+ posting detail) | No | Public API for listing openings; apply via `postingUrl` |
| **Workday** | Public career-site search endpoint: `POST {tenant}.wd{N}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs` | No | Strictly rate-limited: requests are sequential with a delay and capped per company; jobs link to the company's own posting |
| **Amazon Jobs** | Public search endpoint: `GET amazon.jobs/en/search.json?base_query={role}` with country/city filters | No | Low request volume; every job links to its amazon.jobs page |
| **Adzuna** | Official job search API: `GET api.adzuna.com/v1/api/jobs/{country}/search/1?what={role}&where={location}` | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` (free) | Developer-tier call limits; attribute Adzuna; apply via `redirect_url` |
| **Jooble** | Official REST API: `POST jooble.org/api/{key}` with `{ keywords, location }` | `JOOBLE_API_KEY` (free on request) | Attribute Jooble; apply via the returned link |
| **JSearch** | Licensed Google-for-Jobs aggregator on RapidAPI | `JSEARCH_API_KEY` | RapidAPI plan quota; apply via `job_apply_link` |
| **Himalayas** | Public remote-jobs API: `GET himalayas.app/jobs/api/search?q={role}` | No | Credit Himalayas and link to the job page; only roles open to India are kept |
| **Jobicy** | Public remote-jobs API: `GET jobicy.com/api/v2/remote-jobs?tag={role}` | No | Credit Jobicy with a link; apply buttons go to the original job URL |
| **Arbeitnow** | Public job-board API: `GET arbeitnow.com/api/job-board-api` (mostly Europe) | No | Link to the Arbeitnow job page |
| **Remotive** | Public remote-jobs API: `GET remotive.com/api/remote-jobs?search={role}` | No | **Off by default**: its terms forbid showing its jobs behind a sign-up (this app needs a login), allow about 4 calls/day, and require a link back |
| LinkedIn, Naukri, Indeed, Wellfound, Foundit | No permitted API → **deep links** to each site's own search, pre-filled with your filters | – | Opened in your browser; nothing is fetched |
| Microsoft, Google, Apple, Infosys, TCS, Deloitte… | No public API → **deep links** to their careers search (from the catalog) | – | Opened in your browser; nothing is fetched |

**Not built (optional in the spec):** reading your own job-alert emails via the Gmail API (`gmail.readonly`) needs a Google OAuth client and consent screen. The browser extension isn't built either; pasting a job via `POST /api/jobs/import` covers that use case without reading any page automatically.

## Documentation

- [docs/API.md](docs/API.md): REST API reference
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): **one-project Vercel deployment** (frontend + API + daily cron), the Render/Supabase alternative, and integration setup (OpenAI, SMTP, Telegram, job APIs)

## Security

- Secrets live only in server environment variables. The browser never receives API keys.
- Passwords are hashed with bcrypt (cost 12). Sessions use httpOnly, SameSite cookies, with `Secure` in production.
- Every query is scoped to the session user, and cross-user access returns 404 (covered by E2E tests).
- Inputs are validated with Zod, uploads are limited by size and type (with magic-number checks), and each user's resumes are served only to that user.
- Helmet headers, global and per-feature rate limits (auth, AI, uploads, test sends), and centralised error handling.
- Optional Supabase RLS policies in [supabase/rls_policies.sql](supabase/rls_policies.sql).
