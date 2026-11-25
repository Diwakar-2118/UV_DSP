import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { assertUuid, asyncH, HttpError, parse, uid } from '../lib/http.js';
import { CATEGORIES, PREP_TOPICS } from '../data/prepTopics.js';
import { generatePlan, getActivePlan } from '../services/study.js';
import { companyPrep, searchCompanies } from '../services/companies.js';
import { topicPerformance } from '../services/interviews.js';
import { roleSkills } from '../services/resume.js';
import { canonicalSkills } from '../lib/taxonomy.js';

// ---------------- Interview preparation (topics + question bank) ----------------
export const prepRouter = Router();

prepRouter.get(
  '/topics',
  asyncH(async (req, res) => {
    const db = await getDb();
    const counts = await db.query<{ category: string; topic: string; n: number }>(
      `SELECT category, topic, count(*)::int AS n FROM interview_questions WHERE source='curated' OR created_by=$1 GROUP BY category, topic`,
      [uid(req)],
    );
    const perf = await topicPerformance(db, uid(req));
    res.json({
      categories: CATEGORIES.map((c) => ({
        category: c,
        topics: PREP_TOPICS[c].map((t) => ({
          ...t,
          questionCount: counts.find((x) => x.category === c && x.topic === t.topic)?.n ?? 0,
          performance: perf.find((p) => p.category === c && p.topic === t.topic) ?? null,
        })),
      })),
    });
  }),
);

prepRouter.get(
  '/questions',
  asyncH(async (req, res) => {
    const p = parse(
      z.object({ category: z.enum(CATEGORIES).optional(), topic: z.string().max(80).optional(), difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(), q: z.string().max(100).optional() }),
      req.query,
    );
    const args: unknown[] = [uid(req)];
    const where = ["(source='curated' OR created_by=$1)"];
    for (const [col, v] of [['category', p.category], ['topic', p.topic], ['difficulty', p.difficulty]] as const) {
      if (v) {
        args.push(v);
        where.push(`${col}=$${args.length}`);
      }
    }
    if (p.q) {
      args.push(`%${p.q}%`);
      where.push(`question ILIKE $${args.length}`);
    }
    const rows = await (await getDb()).query(
      `SELECT id, category, topic, difficulty, qtype, question, options, correct_option, ideal_answer, key_points, source
         FROM interview_questions WHERE ${where.join(' AND ')} ORDER BY category, topic, CASE difficulty WHEN 'Beginner' THEN 0 WHEN 'Intermediate' THEN 1 ELSE 2 END, id LIMIT 300`,
      args,
    );
    res.json({ questions: rows });
  }),
);

// ---------------- Study plan ----------------
export const studyRouter = Router();

studyRouter.get(
  '/plan',
  asyncH(async (req, res) => {
    res.json(await getActivePlan(await getDb(), uid(req)));
  }),
);

studyRouter.post(
  '/plan',
  asyncH(async (req, res) => {
    const p = parse(
      z.object({ days: z.coerce.number().int().min(1).max(60).default(14), dailyGoalMinutes: z.coerce.number().int().min(15).max(600).default(90), startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }),
      req.body ?? {},
    );
    const db = await getDb();
    await generatePlan(db, uid(req), p);
    res.status(201).json(await getActivePlan(db, uid(req)));
  }),
);

studyRouter.patch(
  '/items/:id',
  asyncH(async (req, res) => {
    const p = parse(z.object({ completed: z.boolean().optional(), notes: z.string().max(2000).optional() }), req.body);
    const db = await getDb();
    const [row] = await db.query(
      `UPDATE study_progress SET completed_at = CASE WHEN $3::boolean IS NULL THEN completed_at WHEN $3 THEN COALESCE(completed_at, now()) ELSE NULL END,
         notes = COALESCE($4, notes) WHERE id=$1 AND user_id=$2 RETURNING *`,
      [assertUuid(String(req.params.id)), uid(req), p.completed ?? null, p.notes ?? null],
    );
    if (!row) throw new HttpError(404, 'Study item not found');
    res.json({ item: row });
  }),
);

studyRouter.patch(
  '/plan/goal',
  asyncH(async (req, res) => {
    const { dailyGoalMinutes } = parse(z.object({ dailyGoalMinutes: z.coerce.number().int().min(15).max(600) }), req.body);
    const db = await getDb();
    const r = await db.query('UPDATE study_plans SET daily_goal_minutes=$2 WHERE user_id=$1 AND is_active RETURNING id', [uid(req), dailyGoalMinutes]);
    if (!r.length) throw new HttpError(404, 'No active plan');
    res.json(await getActivePlan(db, uid(req)));
  }),
);

// ---------------- Companies ----------------
export const companyRouter = Router();
companyRouter.get('/', (req, res) => {
  const { q } = parse(z.object({ q: z.string().max(80).default('') }), req.query);
  res.json({ companies: searchCompanies(q) });
});
companyRouter.get(
  '/:name',
  asyncH(async (req, res) => {
    const name = parse(z.string().trim().min(2).max(80), req.params.name);
    res.json(await companyPrep(await getDb(), uid(req), name));
  }),
);

// ---------------- Dashboard + roadmap ----------------
export const dashboardRouter = Router();

dashboardRouter.get(
  '/',
  asyncH(async (req, res) => {
    const db = await getDb();
    const id = uid(req);
    const [jobs] = await db.query(
      `SELECT count(*) FILTER (WHERE NOT is_demo)::int AS live_total,
              count(*) FILTER (WHERE NOT is_demo AND first_seen_at > now() - interval '24 hours')::int AS new_today
         FROM jobs WHERE is_active`,
    );
    const [saved] = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM saved_jobs WHERE user_id=$1', [id]);
    const [notif] = await db.query<{ unread: number; total: number }>('SELECT count(*) FILTER (WHERE read_at IS NULL)::int AS unread, count(*)::int AS total FROM job_notifications WHERE user_id=$1', [id]);
    const apps = await db.query<{ status: string; n: number }>('SELECT status, count(*)::int AS n FROM applications WHERE user_id=$1 GROUP BY status', [id]);
    const upcoming = await db.query(
      `SELECT id, company, role_title, status, interview_at FROM applications WHERE user_id=$1 AND interview_at > now() AND status NOT IN ('Selected','Rejected') ORDER BY interview_at LIMIT 5`,
      [id],
    );
    const scores = await db.query(
      `SELECT id, category, completed_at, (summary->>'percentage')::int AS percentage FROM interviews WHERE user_id=$1 AND status<>'in_progress' ORDER BY completed_at DESC LIMIT 12`,
      [id],
    );
    const recentNotifications = await db.query(
      `SELECT n.id, n.match_score, n.created_at, n.read_at, j.title, j.company, j.location, j.apply_url FROM job_notifications n JOIN jobs j ON j.id=n.job_id
        WHERE n.user_id=$1 ORDER BY n.created_at DESC LIMIT 5`,
      [id],
    );
    const plan = await getActivePlan(db, id);
    const today = new Date().toISOString().slice(0, 10);
    res.json({
      jobs,
      savedJobs: saved.n,
      notifications: notif,
      applications: { total: apps.reduce((a, r) => a + r.n, 0), byStatus: Object.fromEntries(apps.map((r) => [r.status, r.n])) },
      upcomingInterviews: upcoming,
      interviewScores: scores.reverse(),
      recentNotifications,
      study: plan ? { ...plan.stats, today: plan.items.filter((i: any) => i.plan_date === today) } : null,
    });
  }),
);

const TARGETS = [
  { role: 'QA Engineer (Manual + API)', level: 'Current', skills: ['Manual Testing', 'Functional Testing', 'Regression Testing', 'API Testing', 'Postman', 'SQL', 'Jira', 'Agile'] },
  { role: 'Fintech QA Engineer', level: 'Next 6–12 months', skills: ['Payments', 'Payment Gateway Testing', 'UPI', 'Settlement', 'Reconciliation', 'ISO 8583', 'SQL', 'API Testing'] },
  { role: 'QA Automation Engineer / SDET', level: 'Next 6–12 months', skills: ['Playwright', 'Selenium', 'TypeScript', 'Java', 'Cucumber', 'CI/CD', 'Git', 'API Testing'] },
  { role: 'Performance Test Engineer', level: 'Specialisation', skills: ['JMeter', 'Performance Testing', 'SQL', 'CI/CD', 'API Testing'] },
  { role: 'Senior QA / QA Lead (Fintech)', level: '2–3 years', skills: ['Test Planning', 'Payments', 'Settlement', 'Reconciliation', 'Playwright', 'CI/CD', 'Performance Testing', 'Agile'] },
];

dashboardRouter.get(
  '/roadmap',
  asyncH(async (req, res) => {
    const db = await getDb();
    const [p] = await db.query('SELECT technical_skills, total_experience_years FROM user_profiles WHERE user_id=$1', [uid(req)]);
    const have = new Set(canonicalSkills(p?.technical_skills ?? []));
    const perf = await topicPerformance(db, uid(req));
    const catAvg = new Map<string, number>();
    for (const c of CATEGORIES) {
      const rows = perf.filter((x) => x.category === c);
      if (rows.length) catAvg.set(c, Math.round((rows.reduce((a, r) => a + r.avg, 0) / rows.length) * 10) / 10);
    }
    const stages = TARGETS.map((t) => {
      const owned = t.skills.filter((s) => have.has(s));
      return { ...t, owned, missing: t.skills.filter((s) => !have.has(s)), readiness: Math.round((owned.length / t.skills.length) * 100) };
    });
    res.json({
      experienceYears: Number(p?.total_experience_years ?? 0),
      stages,
      interviewReadiness: CATEGORIES.filter((c) => c !== 'HR').map((c) => ({ category: c, avgScore: catAvg.get(c) ?? null })),
      roleSkillMap: roleSkills,
      nextActions: [
        ...stages.filter((s) => s.missing.length).slice(0, 3).map((s) => `Close gaps for ${s.role}: ${s.missing.slice(0, 3).join(', ')}`),
        ...[...catAvg.entries()].filter(([, v]) => v < 6).map(([c]) => `Improve ${c} interview score (currently below 6/10)`),
      ],
    });
  }),
);
