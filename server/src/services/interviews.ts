import { randomUUID } from 'node:crypto';
import type { Db } from '../db/index.js';
import { HttpError } from '../lib/http.js';
import { QUESTION_BANK } from '../data/questionBank.js';
import { aiConfigured, chatJson } from './ai.js';
import { evaluateAnswer, type EvalQuestion } from './evaluator.js';

export const INTERVIEW_MODES = ['Mixed', 'MCQ', 'Technical', 'Scenario', 'Practical', 'HR', 'Fintech Domain'] as const;
export const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'] as const;
const MODE_QTYPE: Record<string, string | null> = { Mixed: null, MCQ: 'mcq', Technical: 'technical', Scenario: 'scenario', Practical: 'practical', HR: 'hr', 'Fintech Domain': null };

export async function seedQuestionBank(db: Db) {
  for (const q of QUESTION_BANK) {
    await db.query(
      `INSERT INTO interview_questions (id, category, topic, difficulty, qtype, question, options, correct_option, ideal_answer, key_points, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'curated')
       ON CONFLICT (id) DO UPDATE SET category=EXCLUDED.category, topic=EXCLUDED.topic, difficulty=EXCLUDED.difficulty, qtype=EXCLUDED.qtype,
         question=EXCLUDED.question, options=EXCLUDED.options, correct_option=EXCLUDED.correct_option, ideal_answer=EXCLUDED.ideal_answer, key_points=EXCLUDED.key_points`,
      [q.id, q.category, q.topic, q.difficulty, q.qtype, q.question, q.options ? JSON.stringify(q.options) : null, q.correctOption ?? null, q.idealAnswer, JSON.stringify(q.keyPoints)],
    );
  }
}

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

const DIFF_RANK: Record<string, number> = { Beginner: 0, Intermediate: 1, Advanced: 2 };

async function generateAiQuestions(db: Db, userId: string, category: string, difficulty: string, qtype: string | null, n: number) {
  const r = await chatJson<{ questions: any[] }>(
    'You write accurate technical interview questions for QA engineers with 3-5 years of experience in Indian fintech/product companies.',
    `Write ${n} new ${difficulty} ${qtype ?? 'technical or scenario'} interview questions for the category "${category}".
Return JSON {"questions":[{"topic":string,"qtype":"${qtype ?? 'technical'}"|"scenario"|"practical"|"mcq"|"hr","question":string,"options":string[4]|null,"correct_option":number|null,"ideal_answer":string,"key_points":[{"point":string,"keywords":string[] (lowercase, 1-3 words)}]}]}`,
    { maxTokens: 2500, temperature: 0.6 },
  );
  const ids: string[] = [];
  for (const q of (r.questions ?? []).slice(0, n)) {
    if (!q?.question || !q?.ideal_answer) continue;
    const id = `ai-${randomUUID()}`;
    const type = ['mcq', 'technical', 'scenario', 'practical', 'hr'].includes(q.qtype) ? q.qtype : 'technical';
    const isMcq = type === 'mcq' && Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.correct_option);
    await db.query(
      `INSERT INTO interview_questions (id, category, topic, difficulty, qtype, question, options, correct_option, ideal_answer, key_points, source, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'ai_generated',$11)`,
      [id, category, String(q.topic ?? category), difficulty, isMcq ? 'mcq' : type === 'mcq' ? 'technical' : type, q.question,
        isMcq ? JSON.stringify(q.options) : null, isMcq ? q.correct_option : null, q.ideal_answer,
        JSON.stringify((q.key_points ?? []).filter((k: any) => k?.point && Array.isArray(k.keywords))), userId],
    );
    ids.push(id);
  }
  return ids;
}

export interface CreateInterviewInput {
  category: string; // a bank category or 'Mixed'
  mode: string;
  difficulty: string;
  experienceLevel: string;
  count: number;
  durationMinutes: number | null;
}

export async function createInterview(db: Db, userId: string, input: CreateInterviewInput) {
  const qtype = MODE_QTYPE[input.mode] ?? null;
  const category = input.mode === 'Fintech Domain' ? 'Fintech & Payments' : input.mode === 'HR' ? 'HR' : input.category;
  const args: unknown[] = [userId];
  const where = ['(source = \'curated\' OR created_by = $1)'];
  if (category !== 'Mixed') {
    args.push(category);
    where.push(`category = $${args.length}`);
  } else if (input.mode !== 'HR') where.push(`category <> 'HR'`);
  if (qtype) {
    args.push(qtype);
    where.push(`qtype = $${args.length}`);
  }
  const pool = await db.query<{ id: string; difficulty: string }>(`SELECT id, difficulty FROM interview_questions WHERE ${where.join(' AND ')}`, args);
  const recent = new Set(
    (await db.query<{ question_id: string }>(
      `SELECT a.question_id FROM interview_attempts a JOIN interviews i ON i.id=a.interview_id WHERE i.user_id=$1 AND i.started_at > now() - interval '3 days'`,
      [userId],
    )).map((r) => r.question_id),
  );
  const target = DIFF_RANK[input.difficulty] ?? 1;
  const ranked = shuffle(pool).sort(
    (a, b) => Math.abs(DIFF_RANK[a.difficulty] - target) + (recent.has(a.id) ? 2 : 0) - (Math.abs(DIFF_RANK[b.difficulty] - target) + (recent.has(b.id) ? 2 : 0)),
  );
  let ids = ranked.slice(0, input.count).map((r) => r.id);
  let generated = 0;
  if (ids.length < input.count && aiConfigured() && category !== 'Mixed') {
    try {
      const extra = await generateAiQuestions(db, userId, category, input.difficulty, qtype, input.count - ids.length);
      generated = extra.length;
      ids = [...ids, ...extra];
    } catch (e) {
      console.warn('[ai] question generation failed:', (e as Error).message);
    }
  }
  if (ids.length === 0) throw new HttpError(400, 'No questions available for this combination. Try another mode or category.');
  const [iv] = await db.query(
    `INSERT INTO interviews (user_id, category, mode, difficulty, experience_level, question_count, duration_minutes, question_ids, ends_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, CASE WHEN $7::int IS NULL THEN NULL ELSE now() + ($7::int * interval '1 minute') END) RETURNING id`,
    [userId, category, input.mode, input.difficulty, input.experienceLevel, ids.length, input.durationMinutes, ids],
  );
  return { id: iv.id as string, questionCount: ids.length, requested: input.count, aiGenerated: generated };
}

async function loadInterview(db: Db, userId: string, id: string) {
  const [iv] = await db.query('SELECT * FROM interviews WHERE id=$1 AND user_id=$2', [id, userId]);
  if (!iv) throw new HttpError(404, 'Interview not found');
  return iv;
}

const publicQuestion = (q: any, position: number, total: number) => ({
  id: q.id,
  position,
  total,
  category: q.category,
  topic: q.topic,
  difficulty: q.difficulty,
  qtype: q.qtype,
  question: q.question,
  options: q.options,
  source: q.source,
});

async function expireIfNeeded(db: Db, iv: any) {
  if (iv.status === 'in_progress' && iv.ends_at && Date.now() > new Date(iv.ends_at).getTime() + 15000) {
    await finishInterview(db, iv, 'expired');
    return true;
  }
  return false;
}

export async function getInterviewState(db: Db, userId: string, id: string) {
  const iv = await loadInterview(db, userId, id);
  if (await expireIfNeeded(db, iv)) return getInterviewState(db, userId, id);
  const [{ n }] = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM interview_attempts WHERE interview_id=$1', [id]);
  let current = null;
  if (iv.status === 'in_progress' && n < iv.question_ids.length) {
    const [q] = await db.query('SELECT * FROM interview_questions WHERE id=$1', [iv.question_ids[n]]);
    current = publicQuestion(q, n + 1, iv.question_ids.length);
  }
  return {
    interview: {
      id: iv.id, category: iv.category, mode: iv.mode, difficulty: iv.difficulty, experienceLevel: iv.experience_level,
      questionCount: iv.question_count, durationMinutes: iv.duration_minutes, status: iv.status, startedAt: iv.started_at,
      endsAt: iv.ends_at, completedAt: iv.completed_at, totalScore: iv.total_score, maxScore: iv.max_score, summary: iv.summary, answered: n,
    },
    current,
  };
}

export async function answerQuestion(db: Db, userId: string, id: string, body: { questionId: string; answer: string; selectedOption?: number | null }) {
  const iv = await loadInterview(db, userId, id);
  if (await expireIfNeeded(db, iv)) throw new HttpError(409, 'Time is up – this interview has ended.');
  if (iv.status !== 'in_progress') throw new HttpError(409, 'This interview is already finished.');
  const [{ n }] = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM interview_attempts WHERE interview_id=$1', [id]);
  if (n >= iv.question_ids.length) throw new HttpError(409, 'All questions already answered.');
  if (iv.question_ids[n] !== body.questionId) throw new HttpError(409, 'Out-of-order answer – reload the interview.');
  const [q] = await db.query('SELECT * FROM interview_questions WHERE id=$1', [body.questionId]);
  const evaluation = await evaluateAnswer(q as EvalQuestion, body.answer, body.selectedOption);
  await db.tx(async (t) => {
    const [a] = await t.query(
      'INSERT INTO interview_attempts (interview_id, question_id, position, answer, selected_option) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [id, q.id, n + 1, body.answer, body.selectedOption ?? null],
    );
    await t.query(
      `INSERT INTO interview_feedback (attempt_id, score, is_correct, covered_points, missing_points, suggestions, feedback, evaluator)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [a.id, evaluation.score, evaluation.isCorrect, JSON.stringify(evaluation.coveredPoints), JSON.stringify(evaluation.missingPoints),
        JSON.stringify(evaluation.suggestions), evaluation.feedback, evaluation.evaluator],
    );
  });
  const isLast = n + 1 >= iv.question_ids.length;
  if (isLast) await finishInterview(db, iv, 'completed');
  const state = await getInterviewState(db, userId, id);
  return {
    evaluation,
    idealAnswer: q.ideal_answer,
    correctOption: q.correct_option,
    keyPoints: (q.key_points ?? []).map((k: any) => k.point),
    ...state,
  };
}

export async function finishInterview(db: Db, iv: any, status: 'completed' | 'expired') {
  const rows = await db.query(
    `SELECT q.category, q.topic, f.score, f.is_correct FROM interview_attempts a JOIN interview_feedback f ON f.attempt_id=a.id
       JOIN interview_questions q ON q.id=a.question_id WHERE a.interview_id=$1`,
    [iv.id],
  );
  const total = rows.reduce((s, r) => s + Number(r.score), 0);
  const max = iv.question_ids.length * 10;
  const byTopic = new Map<string, { category: string; topic: string; sum: number; n: number }>();
  for (const r of rows) {
    const k = `${r.category}::${r.topic}`;
    const e = byTopic.get(k) ?? { category: r.category, topic: r.topic, sum: 0, n: 0 };
    e.sum += Number(r.score);
    e.n++;
    byTopic.set(k, e);
  }
  const topics = [...byTopic.values()].map((t) => ({ category: t.category, topic: t.topic, avg: Math.round((t.sum / t.n) * 10) / 10 }));
  const weak = topics.filter((t) => t.avg < 6).sort((a, b) => a.avg - b.avg);
  const strong = topics.filter((t) => t.avg >= 7.5).sort((a, b) => b.avg - a.avg);
  const pct = max ? Math.round((total / max) * 100) : 0;
  const unanswered = iv.question_ids.length - rows.length;
  const suggestions: string[] = [];
  if (weak.length) suggestions.push(`Revise ${weak.slice(0, 3).map((t) => t.topic).join(', ')} in Interview Preparation, then retry.`);
  if (unanswered) suggestions.push(`${unanswered} question(s) were not answered – practise with a timer to improve pacing.`);
  if (pct >= 80) suggestions.push('Great score – move up a difficulty level next time.');
  else if (pct < 50) suggestions.push('Focus on the ideal answers and key points; aim to cover each key point explicitly.');
  suggestions.push('Use the STAR format and real project examples for scenario questions.');
  const nextDifficulty = pct >= 80 ? (iv.difficulty === 'Beginner' ? 'Intermediate' : 'Advanced') : pct < 40 && iv.difficulty !== 'Beginner' ? (iv.difficulty === 'Advanced' ? 'Intermediate' : 'Beginner') : iv.difficulty;
  const summary = {
    percentage: pct,
    answered: rows.length,
    unanswered,
    correct: rows.filter((r) => r.is_correct).length,
    topics,
    weakTopics: weak,
    strongTopics: strong,
    suggestions,
    recommendedNext: { category: weak[0]?.category ?? iv.category, topic: weak[0]?.topic ?? null, difficulty: nextDifficulty, mode: iv.mode },
  };
  await db.query(
    `UPDATE interviews SET status=$2, completed_at=now(), total_score=$3, max_score=$4, summary=$5 WHERE id=$1 AND status='in_progress'`,
    [iv.id, status, Math.round(total * 10) / 10, max, JSON.stringify(summary)],
  );
}

export async function interviewReview(db: Db, userId: string, id: string) {
  await loadInterview(db, userId, id);
  return db.query(
    `SELECT a.position, a.answer, a.selected_option, q.question, q.qtype, q.options, q.correct_option, q.topic, q.ideal_answer,
            f.score, f.is_correct, f.covered_points, f.missing_points, f.suggestions, f.feedback, f.evaluator
       FROM interview_attempts a JOIN interview_questions q ON q.id=a.question_id JOIN interview_feedback f ON f.attempt_id=a.id
      WHERE a.interview_id=$1 ORDER BY a.position`,
    [id],
  );
}

/** Average score per category/topic for the last 60 days – feeds weak-area detection. */
export async function topicPerformance(db: Db, userId: string) {
  return db.query<{ category: string; topic: string; avg: number; attempts: number }>(
    `SELECT q.category, q.topic, round(avg(f.score)::numeric, 1)::float AS avg, count(*)::int AS attempts
       FROM interview_attempts a JOIN interviews i ON i.id=a.interview_id JOIN interview_feedback f ON f.attempt_id=a.id
       JOIN interview_questions q ON q.id=a.question_id
      WHERE i.user_id=$1 AND a.answered_at > now() - interval '60 days'
      GROUP BY q.category, q.topic ORDER BY avg ASC`,
    [userId],
  );
}
