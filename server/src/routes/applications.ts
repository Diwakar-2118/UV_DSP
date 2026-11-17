import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { assertUuid, asyncH, HttpError, parse, uid } from '../lib/http.js';

export const APPLICATION_STATUSES = ['Interested', 'Applied', 'Resume Shortlisted', 'Interview Scheduled', 'Technical Round', 'HR Round', 'Selected', 'Rejected'] as const;

const router = Router();
const optUrl = z.union([z.literal(''), z.string().trim().url().max(1000).refine((u) => /^https?:\/\//i.test(u), 'Must be http(s)')]);
const appSchema = z.object({
  jobId: z.string().uuid().nullable().optional(),
  company: z.string().trim().min(1).max(120),
  roleTitle: z.string().trim().min(1).max(160),
  jobUrl: optUrl.default(''),
  location: z.string().trim().max(120).default(''),
  status: z.enum(APPLICATION_STATUSES).default('Interested'),
  appliedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  interviewAt: z.string().datetime({ offset: true, local: true }).nullable().optional(),
  recruiterName: z.string().trim().max(120).default(''),
  recruiterEmail: z.union([z.literal(''), z.string().trim().email().max(254)]).default(''),
  recruiterPhone: z.string().trim().max(30).regex(/^[+\d\s()-]*$/, 'Invalid phone').default(''),
  companyNotes: z.string().max(4000).default(''),
  notes: z.string().max(8000).default(''),
});

const toRow = (p: z.infer<typeof appSchema>) => [
  p.jobId ?? null, p.company, p.roleTitle, p.jobUrl, p.location, p.status, p.appliedOn ?? null, p.interviewAt ?? null,
  p.recruiterName, p.recruiterEmail, p.recruiterPhone, p.companyNotes, p.notes,
];

router.get(
  '/',
  asyncH(async (req, res) => {
    const { status, q } = parse(z.object({ status: z.enum(APPLICATION_STATUSES).optional(), q: z.string().max(100).optional() }), req.query);
    const db = await getDb();
    const args: unknown[] = [uid(req)];
    let where = 'user_id=$1';
    if (status) {
      args.push(status);
      where += ` AND status=$${args.length}`;
    }
    if (q) {
      args.push(`%${q}%`);
      where += ` AND (company ILIKE $${args.length} OR role_title ILIKE $${args.length})`;
    }
    const rows = await db.query(`SELECT * FROM applications WHERE ${where} ORDER BY updated_at DESC`, args);
    res.json({ applications: rows });
  }),
);

router.get(
  '/stats',
  asyncH(async (req, res) => {
    const db = await getDb();
    const rows = await db.query<{ status: string; n: number }>('SELECT status, count(*)::int AS n FROM applications WHERE user_id=$1 GROUP BY status', [uid(req)]);
    const by = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0])) as Record<string, number>;
    for (const r of rows) by[r.status] = r.n;
    const total = Object.values(by).reduce((a, b) => a + b, 0);
    const submitted = total - by.Interested;
    const interviewStages = by['Interview Scheduled'] + by['Technical Round'] + by['HR Round'];
    const shortlistedOrBeyond = by['Resume Shortlisted'] + interviewStages + by.Selected;
    const decided = by.Selected + by.Rejected;
    const [{ upcoming }] = await db.query<{ upcoming: number }>(
      `SELECT count(*)::int AS upcoming FROM applications WHERE user_id=$1 AND interview_at > now() AND status NOT IN ('Selected','Rejected')`,
      [uid(req)],
    );
    res.json({
      total,
      submitted,
      byStatus: by,
      pipeline: APPLICATION_STATUSES.map((s) => ({ status: s, count: by[s] })),
      interviewsScheduled: upcoming,
      inInterviewStages: interviewStages,
      shortlisted: shortlistedOrBeyond,
      selectionRate: decided ? Math.round((by.Selected / decided) * 100) : 0,
      responseRate: submitted ? Math.round((shortlistedOrBeyond / submitted) * 100) : 0,
    });
  }),
);

router.post(
  '/',
  asyncH(async (req, res) => {
    const p = parse(appSchema, req.body);
    const db = await getDb();
    if (p.jobId) {
      const dup = await db.query('SELECT id FROM applications WHERE user_id=$1 AND job_id=$2', [uid(req), p.jobId]);
      if (dup.length) throw new HttpError(409, 'This job is already in your tracker', { id: dup[0].id });
      const j = await db.query('SELECT 1 FROM jobs WHERE id=$1', [p.jobId]);
      if (!j.length) p.jobId = null;
    }
    const [row] = await db.query(
      `INSERT INTO applications (user_id, job_id, company, role_title, job_url, location, status, applied_on, interview_at, recruiter_name,
         recruiter_email, recruiter_phone, company_notes, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8::date, CASE WHEN $7 <> 'Interested' THEN current_date END),$9,$10,$11,$12,$13,$14) RETURNING *`,
      [uid(req), ...toRow(p)],
    );
    res.status(201).json({ application: row });
  }),
);

router.get(
  '/:id',
  asyncH(async (req, res) => {
    const db = await getDb();
    const [row] = await db.query('SELECT * FROM applications WHERE id=$1 AND user_id=$2', [assertUuid(String(req.params.id)), uid(req)]);
    if (!row) throw new HttpError(404, 'Application not found');
    res.json({ application: row });
  }),
);

router.put(
  '/:id',
  asyncH(async (req, res) => {
    const p = parse(appSchema, req.body);
    const db = await getDb();
    const [row] = await db.query(
      `UPDATE applications SET job_id=$3, company=$4, role_title=$5, job_url=$6, location=$7, status=$8, applied_on=$9, interview_at=$10,
         recruiter_name=$11, recruiter_email=$12, recruiter_phone=$13, company_notes=$14, notes=$15, updated_at=now()
       WHERE id=$1 AND user_id=$2 RETURNING *`,
      [assertUuid(String(req.params.id)), uid(req), ...toRow(p)],
    );
    if (!row) throw new HttpError(404, 'Application not found');
    res.json({ application: row });
  }),
);

router.patch(
  '/:id/status',
  asyncH(async (req, res) => {
    const { status } = parse(z.object({ status: z.enum(APPLICATION_STATUSES) }), req.body);
    const db = await getDb();
    const [row] = await db.query(
      `UPDATE applications SET status=$3, updated_at=now(), applied_on = COALESCE(applied_on, CASE WHEN $3 <> 'Interested' THEN current_date END)
        WHERE id=$1 AND user_id=$2 RETURNING *`,
      [assertUuid(String(req.params.id)), uid(req), status],
    );
    if (!row) throw new HttpError(404, 'Application not found');
    res.json({ application: row });
  }),
);

router.delete(
  '/:id',
  asyncH(async (req, res) => {
    const db = await getDb();
    const r = await db.query('DELETE FROM applications WHERE id=$1 AND user_id=$2 RETURNING id', [assertUuid(String(req.params.id)), uid(req)]);
    if (!r.length) throw new HttpError(404, 'Application not found');
    res.json({ ok: true });
  }),
);

export default router;
