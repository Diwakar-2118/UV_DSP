import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { config } from '../config.js';
import { assertAdmin, assertUuid, asyncH, HttpError, parse, uid } from '../lib/http.js';
import { buildSearchLinks } from '../sources/adapters.js';
import { getJob, searchJobs } from '../services/jobs.js';
import { runCollectionCycle } from '../services/scheduler.js';

const router = Router();

const csv = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? undefined : (Array.isArray(v) ? v : v.split(',')).map((s) => s.trim()).filter(Boolean)));
const num = z.coerce.number().finite().optional();
const boolish = z.enum(['true', 'false', 'auto']).optional().transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined));

const searchSchema = z.object({
  q: z.string().max(100).optional(),
  roles: csv,
  locations: csv,
  skills: csv,
  expMin: num,
  expMax: num,
  company: z.string().max(100).optional(),
  industry: z.string().max(60).optional(),
  salaryMin: num,
  jobType: z.string().max(40).optional(),
  postedWithinDays: z.coerce.number().int().refine((n) => [1, 3, 7, 30].includes(n), 'Must be 1, 3, 7 or 30').optional(),
  minMatch: z.coerce.number().int().min(0).max(100).optional(),
  sort: z.enum(['latest', 'match', 'experience', 'company']).optional(),
  includeDemo: boolish,
  savedOnly: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

router.get(
  '/',
  asyncH(async (req, res) => {
    const p = parse(searchSchema, req.query);
    res.json(await searchJobs(await getDb(), uid(req), p));
  }),
);

router.get('/search-links', (req, res) => {
  const p = parse(z.object({ keywords: z.string().max(80).default('QA Engineer'), location: z.string().max(60).default('Bengaluru'), days: z.coerce.number().int().min(1).max(30).default(7), expMin: z.coerce.number().int().min(0).max(30).default(3) }), req.query);
  res.json({ links: buildSearchLinks(p) });
});

router.get(
  '/sources',
  asyncH(async (_req, res) => {
    const db = await getDb();
    const rows = await db.query(
      `SELECT s.*, (SELECT count(*)::int FROM jobs j WHERE j.source_id=s.id AND j.is_active) AS active_jobs FROM job_sources s ORDER BY s.kind, s.name`,
    );
    res.json({ sources: rows, liveSourcesEnabled: config.sources.liveEnabled });
  }),
);

router.patch(
  '/sources/:id',
  asyncH(async (req, res) => {
    const { enabled } = parse(z.object({ enabled: z.boolean() }), req.body);
    const db = await getDb();
    await assertAdmin(req, db);
    const r = await db.query(`UPDATE job_sources SET enabled=$2 WHERE id=$1 AND kind <> 'search_link' RETURNING id, enabled`, [req.params.id, enabled]);
    if (!r.length) throw new HttpError(404, 'Source not found');
    res.json(r[0]);
  }),
);

const refreshLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: config.nodeEnv === 'test' ? 100 : 3, message: { error: 'Job refresh is limited to 3 runs per 10 minutes.' } });
router.post(
  '/refresh',
  refreshLimiter,
  asyncH(async (req, res) => {
    const db = await getDb();
    await assertAdmin(req, db);
    res.json(await runCollectionCycle(db));
  }),
);

router.get(
  '/saved',
  asyncH(async (req, res) => {
    res.json(await searchJobs(await getDb(), uid(req), { savedOnly: true, includeDemo: true, pageSize: 100 }));
  }),
);

router.get(
  '/:id',
  asyncH(async (req, res) => {
    const job = await getJob(await getDb(), uid(req), assertUuid(String(req.params.id)));
    if (!job) throw new HttpError(404, 'Job not found');
    res.json({ job });
  }),
);

router.post(
  '/:id/save',
  asyncH(async (req, res) => {
    const db = await getDb();
    const id = assertUuid(String(req.params.id));
    const exists = await db.query('SELECT 1 FROM jobs WHERE id=$1', [id]);
    if (!exists.length) throw new HttpError(404, 'Job not found');
    await db.query('INSERT INTO saved_jobs (user_id, job_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [uid(req), id]);
    res.json({ saved: true });
  }),
);

router.delete(
  '/:id/save',
  asyncH(async (req, res) => {
    const db = await getDb();
    await db.query('DELETE FROM saved_jobs WHERE user_id=$1 AND job_id=$2', [uid(req), assertUuid(String(req.params.id))]);
    res.json({ saved: false });
  }),
);

export default router;
