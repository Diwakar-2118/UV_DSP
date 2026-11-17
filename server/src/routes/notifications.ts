import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { config } from '../config.js';
import { assertUuid, asyncH, parse, uid } from '../lib/http.js';
import { ROLE_CATEGORIES } from '../lib/taxonomy.js';
import { channelStatus, processAlertsForUser, sendDigestForUser, sendTestNotification } from '../services/notifications.js';
import { schedulerStatus } from '../services/scheduler.js';

const router = Router();

router.get(
  '/',
  asyncH(async (req, res) => {
    const db = await getDb();
    const { unreadOnly, limit } = parse(z.object({ unreadOnly: z.enum(['true', 'false']).optional(), limit: z.coerce.number().int().min(1).max(200).default(50) }), req.query);
    const rows = await db.query(
      `SELECT n.id, n.match_score, n.created_at, n.read_at, n.emailed_at, n.telegram_sent_at,
              j.id AS job_id, j.title, j.company, j.location, j.apply_url, j.source_site, j.posted_at
         FROM job_notifications n JOIN jobs j ON j.id=n.job_id
        WHERE n.user_id=$1 ${unreadOnly === 'true' ? 'AND n.read_at IS NULL' : ''}
        ORDER BY n.created_at DESC, n.match_score DESC LIMIT $2`,
      [uid(req), limit],
    );
    const [{ unread }] = await db.query<{ unread: number }>('SELECT count(*)::int AS unread FROM job_notifications WHERE user_id=$1 AND read_at IS NULL', [uid(req)]);
    res.json({ notifications: rows, unread });
  }),
);

router.post(
  '/read',
  asyncH(async (req, res) => {
    const { ids } = parse(z.object({ ids: z.array(z.string().uuid()).max(500).optional() }), req.body ?? {});
    const db = await getDb();
    if (ids?.length) await db.query('UPDATE job_notifications SET read_at=now() WHERE user_id=$1 AND id = ANY($2::uuid[]) AND read_at IS NULL', [uid(req), ids]);
    else await db.query('UPDATE job_notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL', [uid(req)]);
    res.json({ ok: true });
  }),
);

router.get(
  '/settings',
  asyncH(async (req, res) => {
    const db = await getDb();
    const [s] = await db.query('SELECT * FROM notification_settings WHERE user_id=$1', [uid(req)]);
    res.json({ settings: s, channels: await channelStatus(db, uid(req)), scheduler: schedulerStatus() });
  }),
);

const settingsSchema = z.object({
  enabled: z.boolean(),
  deliveryTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM (24h)'),
  timezone: z.string().max(60).refine((tz) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, 'Unknown timezone'),
  minMatchScore: z.coerce.number().int().min(0).max(100),
  roles: z.array(z.enum(ROLE_CATEGORIES)).max(10),
  locations: z.array(z.string().trim().min(1).max(60)).max(20),
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  telegramEnabled: z.boolean(),
  telegramChatId: z.string().trim().max(40).regex(/^-?\d*$|^@[\w]{4,}$/, 'Numeric chat ID or @channel').nullable(),
});

router.put(
  '/settings',
  asyncH(async (req, res) => {
    const p = parse(settingsSchema, req.body);
    const db = await getDb();
    const [prev] = await db.query('SELECT telegram_chat_id FROM notification_settings WHERE user_id=$1', [uid(req)]);
    const chatChanged = (prev?.telegram_chat_id ?? null) !== (p.telegramChatId || null);
    await db.query(
      `UPDATE notification_settings SET enabled=$2, delivery_time=$3, timezone=$4, min_match_score=$5, roles=$6, locations=$7,
         in_app_enabled=$8, email_enabled=$9, telegram_enabled=$10, telegram_chat_id=$11,
         telegram_verified_at = CASE WHEN $12 THEN NULL ELSE telegram_verified_at END
       WHERE user_id=$1`,
      [uid(req), p.enabled, p.deliveryTime, p.timezone, p.minMatchScore, p.roles, p.locations, p.inAppEnabled, p.emailEnabled,
        p.telegramEnabled, p.telegramChatId || null, chatChanged],
    );
    const [s] = await db.query('SELECT * FROM notification_settings WHERE user_id=$1', [uid(req)]);
    res.json({ settings: s, channels: await channelStatus(db, uid(req)) });
  }),
);

const testLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: config.nodeEnv === 'test' ? 100 : 5, message: { error: 'Too many test messages – try again in a few minutes.' } });
router.post(
  '/test/:channel',
  testLimiter,
  asyncH(async (req, res) => {
    const { channel } = parse(z.object({ channel: z.enum(['email', 'telegram']) }), req.params);
    const db = await getDb();
    const r = await sendTestNotification(db, uid(req), channel);
    res.status(r.ok ? 200 : 502).json({ ...r, channels: await channelStatus(db, uid(req)) });
  }),
);

/** Manually run "check for new matching jobs now" + deliver digest for the current user. */
router.post(
  '/run',
  testLimiter,
  asyncH(async (req, res) => {
    const db = await getDb();
    const alerts = await processAlertsForUser(db, uid(req));
    const delivery = await sendDigestForUser(db, uid(req));
    res.json({ alerts, delivery });
  }),
);

router.get(
  '/history',
  asyncH(async (req, res) => {
    const db = await getDb();
    const rows = await db.query(
      'SELECT id, channel, kind, status, job_count, transport, detail, created_at FROM notification_log WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',
      [uid(req)],
    );
    res.json({ history: rows });
  }),
);

router.delete(
  '/:id',
  asyncH(async (req, res) => {
    const db = await getDb();
    await db.query('DELETE FROM job_notifications WHERE user_id=$1 AND id=$2', [uid(req), assertUuid(String(req.params.id))]);
    res.json({ ok: true });
  }),
);

export default router;
