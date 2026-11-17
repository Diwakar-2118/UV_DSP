import type { Db } from '../db/index.js';
import { emailStatus, renderDigest, sendEmail, sendTelegram, telegramConfigured } from './delivery.js';
import { loadMatchProfile } from './jobs.js';
import { scoreJob } from './matching.js';

export function localClock(timeZone: string, now = new Date()) {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
  } catch {
    parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
  }
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  const hour = g('hour') === '24' ? '00' : g('hour');
  return { date: `${g('year')}-${g('month')}-${g('day')}`, time: `${hour}:${g('minute')}` };
}

/** Find newly discovered live jobs that match the user's alert preferences and record them (never twice). */
export async function processAlertsForUser(db: Db, userId: string): Promise<{ created: number; considered: number }> {
  const [s] = await db.query('SELECT * FROM notification_settings WHERE user_id=$1', [userId]);
  if (!s || !s.enabled) return { created: 0, considered: 0 };
  const [prefs] = await db.query('SELECT min_experience, max_experience FROM job_preferences WHERE user_id=$1', [userId]);
  const args: unknown[] = [userId];
  const where = [
    'j.is_active',
    'NOT j.is_demo', // demo data is never sent as an alert
    "j.first_seen_at > now() - interval '7 days'",
    "j.posted_at > now() - interval '30 days'",
    'NOT EXISTS (SELECT 1 FROM job_notifications n WHERE n.user_id=$1 AND n.job_id=j.id)',
  ];
  if (s.roles?.length) {
    args.push(s.roles);
    where.push(`j.roles && $${args.length}::text[]`);
  }
  if (s.locations?.length) {
    args.push(s.locations);
    where.push(`j.location_tags && $${args.length}::text[]`);
  }
  if (prefs) {
    args.push(prefs.max_experience);
    where.push(`(j.exp_min IS NULL OR j.exp_min <= $${args.length})`);
    args.push(prefs.min_experience);
    where.push(`(j.exp_max IS NULL OR j.exp_max >= $${args.length})`);
  }
  const jobs = await db.query(`SELECT j.* FROM jobs j WHERE ${where.join(' AND ')}`, args);
  const profile = await loadMatchProfile(db, userId);
  let created = 0;
  for (const j of jobs) {
    const { score } = scoreJob(profile, j);
    if (score < s.min_match_score) continue;
    const r = await db.query(
      'INSERT INTO job_notifications (user_id, job_id, match_score) VALUES ($1,$2,$3) ON CONFLICT (user_id, job_id) DO NOTHING RETURNING id',
      [userId, j.id, score],
    );
    created += r.length;
  }
  await db.query('UPDATE notification_settings SET last_alert_run_at=now() WHERE user_id=$1', [userId]);
  return { created, considered: jobs.length };
}

export async function processAllAlerts(db: Db) {
  const users = await db.query<{ user_id: string }>('SELECT user_id FROM notification_settings WHERE enabled');
  let created = 0;
  for (const u of users) created += (await processAlertsForUser(db, u.user_id)).created;
  return { users: users.length, created };
}

async function log(db: Db, userId: string, channel: string, kind: string, status: string, jobCount: number, transport: string | null, detail: string, payload?: unknown) {
  await db.query(
    'INSERT INTO notification_log (user_id, channel, kind, status, job_count, transport, detail, payload) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    [userId, channel, kind, status, jobCount, transport, detail.slice(0, 1000), payload ? JSON.stringify(payload) : null],
  );
}

/** Channel status – a channel is "active" only once configured on the server AND verified with a successful test. */
export async function channelStatus(db: Db, userId: string) {
  const [s] = await db.query('SELECT * FROM notification_settings WHERE user_id=$1', [userId]);
  const email = emailStatus();
  const tg = telegramConfigured();
  return {
    inApp: { configured: true, verified: true, enabled: s.in_app_enabled, active: s.enabled && s.in_app_enabled, detail: 'Built in' },
    email: {
      configured: email.configured,
      transport: email.transport,
      verified: Boolean(s.email_verified_at),
      verifiedAt: s.email_verified_at,
      enabled: s.email_enabled,
      active: s.enabled && s.email_enabled && email.configured && Boolean(s.email_verified_at),
      detail: email.detail,
    },
    telegram: {
      configured: tg,
      verified: Boolean(s.telegram_verified_at),
      verifiedAt: s.telegram_verified_at,
      enabled: s.telegram_enabled,
      chatIdSet: Boolean(s.telegram_chat_id),
      active: s.enabled && s.telegram_enabled && tg && Boolean(s.telegram_chat_id) && Boolean(s.telegram_verified_at),
      detail: tg ? 'Bot token configured on server' : 'Telegram is not configured. Set TELEGRAM_BOT_TOKEN on the server.',
    },
  };
}

export async function sendTestNotification(db: Db, userId: string, channel: 'email' | 'telegram') {
  const [u] = await db.query('SELECT u.email, s.telegram_chat_id FROM users u JOIN notification_settings s ON s.user_id=u.id WHERE u.id=$1', [userId]);
  try {
    if (channel === 'email') {
      const r = await sendEmail(u.email, 'CareerPilot AI – test notification', '<p>Your CareerPilot AI email alerts are working. 🎉</p>', 'Your CareerPilot AI email alerts are working.');
      await db.query('UPDATE notification_settings SET email_verified_at=now() WHERE user_id=$1', [userId]);
      await log(db, userId, 'email', 'test', r.transport === 'json' ? 'recorded' : 'sent', 0, r.transport, r.transport === 'json' ? 'Recorded by test transport (not delivered)' : `Delivered to SMTP server (${r.messageId})`);
      return { ok: true, transport: r.transport };
    }
    if (!u.telegram_chat_id) throw new Error('Set your Telegram chat ID first.');
    await sendTelegram(u.telegram_chat_id, '✅ CareerPilot AI Telegram alerts are working.');
    await db.query('UPDATE notification_settings SET telegram_verified_at=now() WHERE user_id=$1', [userId]);
    await log(db, userId, 'telegram', 'test', 'sent', 0, 'telegram', 'Test message sent');
    return { ok: true, transport: 'telegram' };
  } catch (e) {
    const msg = (e as Error).message;
    await log(db, userId, channel, 'test', 'failed', 0, null, msg);
    return { ok: false, error: msg };
  }
}

/** Deliver pending notifications through every active channel and record history. */
export async function sendDigestForUser(db: Db, userId: string) {
  const [s] = await db.query('SELECT s.*, u.email, p.full_name FROM notification_settings s JOIN users u ON u.id=s.user_id JOIN user_profiles p ON p.user_id=s.user_id WHERE s.user_id=$1', [userId]);
  const status = await channelStatus(db, userId);
  const today = localClock(s.timezone).date;
  const result: Record<string, string> = {};

  const pending = async (col: 'emailed_at' | 'telegram_sent_at') =>
    db.query(
      `SELECT n.id, n.match_score, j.title, j.company, j.location, j.apply_url, j.source_site, j.posted_at
         FROM job_notifications n JOIN jobs j ON j.id=n.job_id WHERE n.user_id=$1 AND n.${col} IS NULL
        ORDER BY n.match_score DESC, j.posted_at DESC LIMIT 50`,
      [userId],
    );

  if (status.email.active) {
    const jobs = await pending('emailed_at');
    if (jobs.length) {
      const d = renderDigest(s.full_name, jobs);
      try {
        const r = await sendEmail(s.email, `CareerPilot AI: ${jobs.length} new matching job${jobs.length === 1 ? '' : 's'}`, d.html, d.text);
        await db.query('UPDATE job_notifications SET emailed_at=now() WHERE id = ANY($1::uuid[])', [jobs.map((j: any) => j.id)]);
        await log(db, userId, 'email', 'digest', r.transport === 'json' ? 'recorded' : 'sent', jobs.length, r.transport, r.transport === 'json' ? 'Recorded by test transport (not delivered)' : `Sent to ${s.email}`, r.transport === 'json' ? { subject: 'digest', text: d.text } : undefined);
        result.email = `sent ${jobs.length}`;
      } catch (e) {
        await log(db, userId, 'email', 'digest', 'failed', jobs.length, status.email.transport, (e as Error).message);
        result.email = `failed: ${(e as Error).message}`;
      }
    } else result.email = 'nothing new';
  } else result.email = 'inactive';

  if (status.telegram.active) {
    const jobs = await pending('telegram_sent_at');
    if (jobs.length) {
      try {
        await sendTelegram(s.telegram_chat_id, renderDigest(s.full_name, jobs).telegram);
        await db.query('UPDATE job_notifications SET telegram_sent_at=now() WHERE id = ANY($1::uuid[])', [jobs.map((j: any) => j.id)]);
        await log(db, userId, 'telegram', 'digest', 'sent', jobs.length, 'telegram', 'Digest sent');
        result.telegram = `sent ${jobs.length}`;
      } catch (e) {
        await log(db, userId, 'telegram', 'digest', 'failed', jobs.length, 'telegram', (e as Error).message);
        result.telegram = `failed: ${(e as Error).message}`;
      }
    } else result.telegram = 'nothing new';
  } else result.telegram = 'inactive';

  await db.query('UPDATE notification_settings SET last_digest_on=$2 WHERE user_id=$1', [userId, today]);
  return result;
}

/** Called by the scheduler every few minutes: send each user's digest once per local day after their delivery time. */
export async function runDueDigests(db: Db, now = new Date(), opts: { ignoreDeliveryTime?: boolean } = {}) {
  const rows = await db.query('SELECT user_id, timezone, delivery_time, last_digest_on FROM notification_settings WHERE enabled');
  let sent = 0;
  for (const r of rows) {
    const { date, time } = localClock(r.timezone, now);
    // Once-a-day cron hosts (e.g. Vercel Hobby) can't honour per-user times, so they deliver every enabled user's digest.
    if ((!opts.ignoreDeliveryTime && time < r.delivery_time) || r.last_digest_on === date) continue;
    await processAlertsForUser(db, r.user_id);
    await sendDigestForUser(db, r.user_id);
    sent++;
  }
  return { processed: sent };
}
