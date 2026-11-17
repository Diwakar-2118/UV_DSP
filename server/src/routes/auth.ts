import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getDb } from '../db/index.js';
import { config } from '../config.js';
import { asyncH, clearSession, HttpError, issueSession, parse, requireAuth, uid } from '../lib/http.js';
import { createDefaultsForUser, getFullProfile } from '../services/profile.js';

const router = Router();
let dummyHash: string | undefined;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.nodeEnv === 'test' ? 1000 : 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later.' },
});

const credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});
const registerSchema = credentials.extend({ fullName: z.string().trim().min(1).max(120) });

function supabase() {
  if (!config.supabaseUrl || !config.supabaseAnonKey) throw new HttpError(500, 'Supabase auth selected but SUPABASE_URL / SUPABASE_ANON_KEY are not set');
  return createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

router.post(
  '/register',
  authLimiter,
  asyncH(async (req, res) => {
    const body = parse(registerSchema, req.body);
    const db = await getDb();
    const exists = await db.query('SELECT 1 FROM users WHERE lower(email)=$1', [body.email]);
    if (exists.length) throw new HttpError(409, 'An account with this email already exists');

    let externalId: string | null = null;
    let passwordHash: string | null = null;
    let needsConfirmation = false;
    if (config.authProvider === 'supabase') {
      const { data, error } = await supabase().auth.signUp({ email: body.email, password: body.password, options: { data: { full_name: body.fullName } } });
      if (error) throw new HttpError(400, error.message);
      externalId = data.user?.id ?? null;
      needsConfirmation = !data.session;
    } else {
      passwordHash = await bcrypt.hash(body.password, config.bcryptRounds);
    }
    const userId = await db.tx(async (q) => {
      const [u] = await q.query<{ id: string }>(
        `INSERT INTO users (email, password_hash, auth_provider, external_auth_id) VALUES ($1,$2,$3,$4) RETURNING id`,
        [body.email, passwordHash, config.authProvider, externalId],
      );
      await createDefaultsForUser(q, u.id, body.fullName);
      return u.id;
    });
    if (needsConfirmation) {
      res.status(201).json({ needsEmailConfirmation: true, message: 'Check your inbox to confirm your email, then sign in.' });
      return;
    }
    issueSession(res, userId);
    res.status(201).json({ user: await getFullProfile(db, userId) });
  }),
);

router.post(
  '/login',
  authLimiter,
  asyncH(async (req, res) => {
    const body = parse(credentials, req.body);
    const db = await getDb();
    let userId: string | undefined;
    if (config.authProvider === 'supabase') {
      const { data, error } = await supabase().auth.signInWithPassword({ email: body.email, password: body.password });
      if (error || !data.user) throw new HttpError(401, 'Invalid email or password');
      const [u] = await db.query<{ id: string }>('SELECT id FROM users WHERE external_auth_id=$1 OR lower(email)=$2 LIMIT 1', [data.user.id, body.email]);
      if (u) userId = u.id;
      else {
        userId = await db.tx(async (q) => {
          const [nu] = await q.query<{ id: string }>(
            `INSERT INTO users (email, auth_provider, external_auth_id) VALUES ($1,'supabase',$2) RETURNING id`,
            [body.email, data.user.id],
          );
          await createDefaultsForUser(q, nu.id, (data.user.user_metadata?.full_name as string) ?? '');
          return nu.id;
        });
      }
    } else {
      const [u] = await db.query<{ id: string; password_hash: string | null }>('SELECT id, password_hash FROM users WHERE lower(email)=$1', [body.email]);
      // Always run bcrypt to keep timing similar for unknown emails.
      dummyHash ??= await bcrypt.hash('timing-equaliser', config.bcryptRounds);
      const ok = await bcrypt.compare(body.password, u?.password_hash ?? dummyHash);
      if (!u || !ok) throw new HttpError(401, 'Invalid email or password');
      userId = u.id;
    }
    await db.query('UPDATE users SET last_login_at=now() WHERE id=$1', [userId]);
    issueSession(res, userId!);
    res.json({ user: await getFullProfile(db, userId!) });
  }),
);

router.post('/logout', (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.get(
  '/me',
  requireAuth,
  asyncH(async (req, res) => {
    const db = await getDb();
    const user = await getFullProfile(db, uid(req));
    if (!user) {
      clearSession(res);
      throw new HttpError(401, 'Account no longer exists');
    }
    res.json({ user });
  }),
);

router.delete(
  '/account',
  requireAuth,
  asyncH(async (req, res) => {
    const db = await getDb();
    await db.query('DELETE FROM users WHERE id=$1', [uid(req)]);
    clearSession(res);
    res.json({ ok: true });
  }),
);

export default router;
