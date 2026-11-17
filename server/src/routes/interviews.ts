import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { config } from '../config.js';
import { assertUuid, asyncH, parse, uid } from '../lib/http.js';
import { CATEGORIES } from '../data/prepTopics.js';
import { answerQuestion, createInterview, DIFFICULTIES, getInterviewState, INTERVIEW_MODES, interviewReview, topicPerformance } from '../services/interviews.js';

const router = Router();
const aiLimiter = rateLimit({ windowMs: 60 * 1000, limit: config.nodeEnv === 'test' ? 1000 : 20, message: { error: 'Slow down – too many answers per minute.' } });

router.get('/options', (_req, res) => {
  res.json({ categories: ['Mixed', ...CATEGORIES], modes: INTERVIEW_MODES, difficulties: DIFFICULTIES, experienceLevels: ['0-2 years', '3-5 years', '5-8 years'] });
});

const createSchema = z.object({
  category: z.enum(['Mixed', ...CATEGORIES] as [string, ...string[]]),
  mode: z.enum(INTERVIEW_MODES),
  difficulty: z.enum(DIFFICULTIES),
  experienceLevel: z.string().max(30).default('3-5 years'),
  count: z.coerce.number().int().min(1).max(20),
  durationMinutes: z.coerce.number().int().min(1).max(180).nullable().default(null),
});

router.post(
  '/',
  aiLimiter,
  asyncH(async (req, res) => {
    const p = parse(createSchema, req.body);
    const db = await getDb();
    const created = await createInterview(db, uid(req), p);
    res.status(201).json({ ...created, ...(await getInterviewState(db, uid(req), created.id)) });
  }),
);

router.get(
  '/',
  asyncH(async (req, res) => {
    const db = await getDb();
    const rows = await db.query(
      `SELECT id, category, mode, difficulty, question_count, status, started_at, completed_at, total_score, max_score,
              (summary->>'percentage')::int AS percentage
         FROM interviews WHERE user_id=$1 ORDER BY started_at DESC LIMIT 50`,
      [uid(req)],
    );
    res.json({ interviews: rows });
  }),
);

router.get(
  '/performance',
  asyncH(async (req, res) => {
    res.json({ topics: await topicPerformance(await getDb(), uid(req)) });
  }),
);

router.get(
  '/:id',
  asyncH(async (req, res) => {
    res.json(await getInterviewState(await getDb(), uid(req), assertUuid(String(req.params.id))));
  }),
);

router.get(
  '/:id/review',
  asyncH(async (req, res) => {
    res.json({ attempts: await interviewReview(await getDb(), uid(req), assertUuid(String(req.params.id))) });
  }),
);

router.post(
  '/:id/answer',
  aiLimiter,
  asyncH(async (req, res) => {
    const body = parse(
      z.object({ questionId: z.string().min(1).max(80), answer: z.string().max(6000).default(''), selectedOption: z.number().int().min(0).max(9).nullable().optional() }),
      req.body,
    );
    res.json(await answerQuestion(await getDb(), uid(req), assertUuid(String(req.params.id)), body));
  }),
);

/** End early: remaining questions count as unanswered. */
router.post(
  '/:id/finish',
  asyncH(async (req, res) => {
    const db = await getDb();
    const id = assertUuid(String(req.params.id));
    const [iv] = await db.query('SELECT * FROM interviews WHERE id=$1 AND user_id=$2', [id, uid(req)]);
    if (iv?.status === 'in_progress') {
      const { finishInterview } = await import('../services/interviews.js');
      await finishInterview(db, iv, 'completed');
    }
    res.json(await getInterviewState(db, uid(req), id));
  }),
);

export default router;
