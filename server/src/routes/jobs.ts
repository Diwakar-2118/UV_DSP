import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { config } from '../config.js';
import { assertAdmin, assertUuid, asyncH, HttpError, parse, uid } from '../lib/http.js';
import { buildSearchLinks } from '../sources/adapters.js';
import { getJob, ingestJobs, searchJobs } from '../services/jobs.js';
import { ALL_IT } from '../lib/roleFamilies.js';
import { discoverJobs } from '../services/discovery.js';
import { runCollectionCycle } from '../services/scheduler.js';

const router = Router();

const csv = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? undefined : (Array.isArray(v) ? v : v.split(',')).map((s) => s.trim()).filter(Boolean)));
const num = z.coerce.number().finite().optional();

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

/**
 * Live discovery from official sources: GET /api/jobs/discover?roles=QA%20Engineer,SDET&location=Hyderabad&top=20
 * Runs providers concurrently (40 s budget), de-duplicates, filters by role family + location, ranks against the
 * profile and returns the top N with matched / missing skills. Cached per user for 15 minutes.
 */
const discoverLimiter = rateLimit({ windowMs: 60 * 1000, limit: config.nodeEnv === 'test' ? 100 : 6, message: { error: 'Too many discovery requests – try again in a minute.' } });
router.get(
  '/discover',
  discoverLimiter,
  asyncH(async (req, res) => {
    const p = parse(
      z.object({
        roles: csv.transform((v) => v ?? []),
        location: z.string().max(120).default(''),
        top: z.coerce.number().int().min(1).max(100).default(20),
      }),
      req.query,
    );
    const db = await getDb();
    const prefs = await db.query<{ roles: string[]; locations: string[] }>('SELECT roles, locations FROM job_preferences WHERE user_id=$1', [uid(req)]);
    // roles: "IT" (all IT jobs), role family names ("Backend Development") or free text ("Java Developer").
    const roles = p.roles.length ? p.roles.slice(0, 10) : (prefs[0]?.roles ?? []);
    const location = p.location || (prefs[0]?.locations ?? []).join(', ');
    res.json(await discoverJobs(db, uid(req), { roles: roles.length ? roles : [ALL_IT], location, top: p.top }));
  }),
);

/** Add a job yourself (pasted text + optional link). The link is stored, never fetched. */
router.post(
  '/import',
  asyncH(async (req, res) => {
    const p = parse(
      z.object({
        title: z.string().trim().min(2).max(200),
        company: z.string().trim().min(1).max(200),
        location: z.string().trim().max(200).default(''),
        url: z.string().url().max(2000).refine((u) => /^https?:\/\//i.test(u), 'Must be an http(s) link').optional(),
        text: z.string().max(50_000).default(''),
      }),
      req.body,
    );
    const db = await getDb();
    const stats = await ingestJobs(db, 'manual', [
      {
        externalId: `${uid(req)}:${Date.now()}`,
        title: p.title,
        company: p.company,
        location: p.location,
        isRemote: /remote/i.test(p.location),
        description: p.text,
        applyUrl: p.url ?? null,
        sourceSite: 'Added by you',
        postedAt: new Date(),
      },
    ]);
    if (!stats.relevant) throw new HttpError(422, 'Only IT roles can be added – the title should name an IT job (e.g. Software Engineer, QA Engineer, Data Analyst, DevOps Engineer).');
    if (!stats.inserted) throw new HttpError(409, 'This job is already in your list.');
    res.status(201).json({ id: stats.insertedIds[0] });
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
    res.json(await searchJobs(await getDb(), uid(req), { savedOnly: true, pageSize: 100 }));
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
