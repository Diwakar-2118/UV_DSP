import 'dotenv/config';

const bool = (v: string | undefined, d = false) => (v === undefined || v === '' ? d : /^(1|true|yes|on)$/i.test(v));
const list = (v: string | undefined, d: string[] = []) =>
  v !== undefined ? v.split(',').map((s) => s.trim()).filter(Boolean) : d;

const nodeEnv = process.env.NODE_ENV ?? 'development';
const jwtSecret = process.env.JWT_SECRET ?? (nodeEnv === 'production' ? '' : 'dev-only-insecure-secret-change-me');
if (!jwtSecret) throw new Error('JWT_SECRET must be set in production');

export const config = {
  nodeEnv,
  isProd: nodeEnv === 'production',
  port: Number(process.env.PORT ?? 4000),
  clientOrigins: list(process.env.CLIENT_ORIGIN, ['http://localhost:5173']),
  jwtSecret,
  /** bcrypt cost factor (12 recommended in production; lower only for automated tests). */
  bcryptRounds: Math.min(14, Math.max(nodeEnv === 'production' ? 10 : 4, Number(process.env.BCRYPT_ROUNDS ?? 12))),
  /** Emails allowed to toggle job sources / trigger global collection. Empty = any signed-in user (single-user deployment). */
  adminEmails: list(process.env.ADMIN_EMAILS, []).map((e) => e.toLowerCase()),
  cookieSameSite: (process.env.COOKIE_SAMESITE ?? 'lax') as 'lax' | 'strict' | 'none',
  cookieSecure: bool(process.env.COOKIE_SECURE, nodeEnv === 'production'),
  /** postgres://... (Supabase or any PostgreSQL). When empty, an embedded PGlite database is used. */
  // POSTGRES_URL is what Vercel's Postgres/Neon integration sets.
  databaseUrl: process.env.DATABASE_URL || process.env.POSTGRES_URL || '',
  databaseSsl: bool(
    process.env.DATABASE_SSL,
    /sslmode=require|supabase\.(co|com)|neon\.tech|pooler\./i.test(process.env.DATABASE_URL || process.env.POSTGRES_URL || ''),
  ),
  pgliteDir: process.env.PGLITE_DIR ?? '.data/pglite',
  authProvider: (process.env.AUTH_PROVIDER ?? 'local') as 'local' | 'supabase',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  openaiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  openaiBaseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
  /** smtp | json (test transport: records messages but does NOT deliver) | '' (disabled) */
  emailTransport: process.env.EMAIL_TRANSPORT ?? (process.env.SMTP_HOST ? 'smtp' : ''),
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: bool(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.EMAIL_FROM ?? 'CareerPilot AI <no-reply@careerpilot.local>',
  },
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  scheduler: {
    enabled: bool(process.env.SCHEDULER_ENABLED, true),
    timezone: process.env.SCHEDULER_TIMEZONE ?? 'Asia/Kolkata',
    collectCron: process.env.JOB_COLLECTION_CRON ?? '0 6 * * *',
    digestCheckCron: process.env.DIGEST_CHECK_CRON ?? '*/15 * * * *',
  },
  sources: {
    liveEnabled: bool(process.env.ENABLE_LIVE_SOURCES, true),
    greenhouseBoards: list(process.env.GREENHOUSE_BOARDS, ['razorpaysoftwareprivatelimited', 'groww']),
    leverCompanies: list(process.env.LEVER_COMPANIES, []),
    adzunaAppId: process.env.ADZUNA_APP_ID ?? '',
    adzunaAppKey: process.env.ADZUNA_APP_KEY ?? '',
    jsearchApiKey: process.env.JSEARCH_API_KEY ?? '',
  },
  seedDemoJobs: bool(process.env.SEED_DEMO_JOBS, true),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_MB ?? 5) * 1024 * 1024,
};
export type Config = typeof config;
