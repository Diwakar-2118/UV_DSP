import type { Db } from '../db/index.js';
import { PREP_TOPICS, type Category } from '../data/prepTopics.js';
import { topicPerformance } from './interviews.js';

const STUDY_CATEGORIES: Category[] = ['Manual Testing', 'API Testing', 'SQL', 'Fintech & Payments', 'Automation Testing', 'Performance Testing'];

const TASK_VERB: Record<string, (topic: string) => string> = {
  'Manual Testing': (t) => `Revise ${t}; write 5 test scenarios for a payment checkout using it`,
  'API Testing': (t) => `Study ${t}; practise in Postman against a public API and note 3 negative cases`,
  SQL: (t) => `Practise ${t}: solve 5 queries on a transactions/orders table`,
  'Fintech & Payments': (t) => `Learn ${t}; explain it aloud in 2 minutes with a real transaction example`,
  'Automation Testing': (t) => `Hands-on ${t}: automate one flow and push to Git`,
  'Performance Testing': (t) => `JMeter prep – ${t}: build or review a test plan and interpret results`,
};

export async function generatePlan(db: Db, userId: string, opts: { days: number; dailyGoalMinutes: number; startDate?: string }) {
  const perf = await topicPerformance(db, userId);
  const weak = perf.filter((p) => p.avg < 6 && p.category !== 'HR');
  // Category weight: base 1, +2 for each weak topic in it → weak areas appear more often.
  const weight = new Map<Category, number>(STUDY_CATEGORIES.map((c) => [c, 1]));
  for (const w of weak) if (weight.has(w.category as Category)) weight.set(w.category as Category, weight.get(w.category as Category)! + 2);
  weight.set('Fintech & Payments', weight.get('Fintech & Payments')! + 1); // target domain

  const start = opts.startDate ?? new Date().toISOString().slice(0, 10);
  const focusAreas = weak.length ? [...new Set(weak.map((w) => w.topic))].slice(0, 6) : ['Fintech & Payments', 'API Testing', 'SQL'];

  // Weighted round-robin over categories; within a category, weak topics first, then the topic list in order.
  const queue: Category[] = [];
  const credits = new Map(weight);
  const totalWeight = [...weight.values()].reduce((a, b) => a + b, 0);
  for (let i = 0; i < opts.days * 3; i++) {
    let best: Category = STUDY_CATEGORIES[0];
    for (const c of STUDY_CATEGORIES) if (credits.get(c)! > credits.get(best)!) best = c;
    queue.push(best);
    credits.set(best, credits.get(best)! - totalWeight);
    for (const c of STUDY_CATEGORIES) credits.set(c, credits.get(c)! + weight.get(c)!);
  }
  const topicCursor = new Map<Category, number>();
  const weakByCat = new Map<string, string[]>();
  for (const w of weak) weakByCat.set(w.category, [...(weakByCat.get(w.category) ?? []), w.topic]);
  const nextTopic = (c: Category) => {
    const i = topicCursor.get(c) ?? 0;
    topicCursor.set(c, i + 1);
    const ordered = [...new Set([...(weakByCat.get(c) ?? []), ...PREP_TOPICS[c].map((t) => t.topic)])];
    return ordered[i % ordered.length];
  };

  return db.tx(async (t) => {
    await t.query('UPDATE study_plans SET is_active=false WHERE user_id=$1', [userId]);
    const [plan] = await t.query(
      `INSERT INTO study_plans (user_id, title, start_date, days, daily_goal_minutes, focus_areas) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [userId, `${opts.days}-day interview plan`, start, opts.days, opts.dailyGoalMinutes, focusAreas],
    );
    let qi = 0;
    for (let d = 1; d <= opts.days; d++) {
      const date = new Date(`${start}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + d - 1);
      const iso = date.toISOString().slice(0, 10);
      const isMockDay = d % 3 === 0;
      const studyTasks = isMockDay ? 2 : 3;
      const mockMinutes = isMockDay ? Math.max(20, Math.round(opts.dailyGoalMinutes * 0.35)) : 0;
      const per = Math.max(10, Math.round((opts.dailyGoalMinutes - mockMinutes) / studyTasks));
      for (let k = 0; k < studyTasks; k++) {
        const c = queue[qi++ % queue.length];
        const topic = nextTopic(c);
        await t.query(
          `INSERT INTO study_progress (plan_id, user_id, day_number, plan_date, category, topic, task, minutes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [plan.id, userId, d, iso, c, topic, TASK_VERB[c](topic), per],
        );
      }
      if (isMockDay) {
        const c = queue[(qi + d) % queue.length];
        await t.query(
          `INSERT INTO study_progress (plan_id, user_id, day_number, plan_date, category, topic, task, minutes) VALUES ($1,$2,$3,$4,'Mock Interview',$5,$6,$7)`,
          [plan.id, userId, d, iso, c, `Take a 5-question ${c} mock interview and review the ideal answers`, mockMinutes],
        );
      }
    }
    return plan;
  });
}

export async function getActivePlan(db: Db, userId: string) {
  const [plan] = await db.query('SELECT * FROM study_plans WHERE user_id=$1 AND is_active ORDER BY created_at DESC LIMIT 1', [userId]);
  if (!plan) return null;
  const items = await db.query('SELECT * FROM study_progress WHERE plan_id=$1 ORDER BY day_number, category, id', [plan.id]);
  const done = items.filter((i) => i.completed_at).length;
  const byCategory = new Map<string, { total: number; done: number }>();
  for (const i of items) {
    const e = byCategory.get(i.category) ?? { total: 0, done: 0 };
    e.total++;
    if (i.completed_at) e.done++;
    byCategory.set(i.category, e);
  }
  const doneDays = new Set(items.filter((i) => i.completed_at).map((i) => String(i.completed_at).slice(0, 10)));
  let streak = 0;
  const d = new Date();
  for (;;) {
    const iso = d.toISOString().slice(0, 10);
    if (!doneDays.has(iso)) {
      if (streak === 0 && iso === new Date().toISOString().slice(0, 10)) {
        d.setUTCDate(d.getUTCDate() - 1);
        if (!doneDays.has(d.toISOString().slice(0, 10))) break;
        continue;
      }
      break;
    }
    streak++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return {
    plan,
    items,
    stats: {
      total: items.length,
      completed: done,
      percent: items.length ? Math.round((done / items.length) * 100) : 0,
      streakDays: streak,
      byCategory: [...byCategory.entries()].map(([category, v]) => ({ category, ...v })),
    },
  };
}
