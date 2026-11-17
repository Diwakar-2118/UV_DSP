# CareerPilot AI

**Find Opportunities. Prepare Smarter. Get Hired.**

CareerPilot AI is a full-stack AI career assistant for QA engineers (manual, API, fintech, automation and performance testing) looking for roles in **Bengaluru, Hyderabad and Remote**. It discovers jobs from authorised sources, scores them against your profile with a transparent formula, sends daily alerts, runs AI mock interviews, analyses resumes and tracks applications.

| Area | What it does |
|---|---|
| **Find Jobs** | Aggregates listings from official APIs and career-page feeds, with filters for role, location, experience, company, industry, skills, salary, job type and date posted (Today / 3 / 7 / 30 days). Sort by latest, match, experience or company. Duplicates are removed by source ID, normalised URL and title+company+city fingerprint. Live listings and demo data are labelled differently. |
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
- Jobs come from the keyless live sources (Remotive, Greenhouse company boards). Clearly-labelled **demo listings** (fictional "(Demo)" companies) appear only while no live jobs exist, and are never alerted.
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
│   ├── src/sources/       Job-source adapters (Remotive, Greenhouse, Lever, Adzuna, JSearch, demo) + deep-link builders
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

CareerPilot **never scrapes, bypasses logins or CAPTCHAs, or ignores website terms**. Each source is a small adapter (`server/src/sources/adapters.ts`) implementing `fetch()`, so adding a new one is a single object.

| Source | Type | Credentials |
|---|---|---|
| Remotive | Public remote-jobs API (links back to Remotive per their terms) | none |
| Greenhouse | Official public Job Board API for company career pages (`GREENHOUSE_BOARDS`) | none |
| Lever | Official public Postings API (`LEVER_COMPANIES`) | none |
| Adzuna India | Official Jobs API – Bengaluru & Hyderabad coverage | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` |
| JSearch (RapidAPI) | Licensed aggregator of Google-for-Jobs listings, incl. **LinkedIn, Indeed and Naukri** postings | `JSEARCH_API_KEY` |
| LinkedIn, Naukri, Indeed, Wellfound | No public jobs API → **deep links** to each site's own search, pre-filled with your filters | none |

For good India coverage, configure **Adzuna** and/or **JSearch**. The keyless sources mostly carry global or remote roles, and on any given day they may have no QA openings.

## Documentation

- [docs/API.md](docs/API.md): REST API reference
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): Supabase, Render and Vercel deployment, plus integration setup (OpenAI, SMTP, Telegram, job APIs)

## Security

- Secrets live only in server environment variables. The browser never receives API keys.
- Passwords are hashed with bcrypt (cost 12). Sessions use httpOnly, SameSite cookies, with `Secure` in production.
- Every query is scoped to the session user, and cross-user access returns 404 (covered by E2E tests).
- Inputs are validated with Zod, uploads are limited by size and type (with magic-number checks), and each user's resumes are served only to that user.
- Helmet headers, global and per-feature rate limits (auth, AI, uploads, test sends), and centralised error handling.
- Optional Supabase RLS policies in [supabase/rls_policies.sql](supabase/rls_policies.sql).
