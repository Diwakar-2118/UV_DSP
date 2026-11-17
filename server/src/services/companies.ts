import type { Db } from '../db/index.js';
import { COMPANIES, TYPICAL_ROUNDS, type CompanyProfile } from '../data/companies.js';
import { aiConfigured, chatJson } from './ai.js';

const keyOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 60);

export function searchCompanies(q: string) {
  const k = keyOf(q);
  return COMPANIES.filter((c) => !k || keyOf(c.name).includes(k) || c.segment.toLowerCase().includes(q.toLowerCase())).map((c) => ({
    key: c.key, name: c.name, segment: c.segment, overview: c.overview,
  }));
}

async function practiceQuestions(db: Db, c: Pick<CompanyProfile, 'focusCategories' | 'domainTopics'>) {
  const domain = await db.query(
    `SELECT id, category, topic, difficulty, qtype, question FROM interview_questions
      WHERE source='curated' AND category='Fintech & Payments' AND topic = ANY($1::text[]) ORDER BY difficulty, id LIMIT 8`,
    [c.domainTopics],
  );
  const technical = await db.query(
    `SELECT DISTINCT ON (category) id, category, topic, difficulty, qtype, question FROM interview_questions
      WHERE source='curated' AND category = ANY($1::text[]) AND category <> 'Fintech & Payments' AND qtype IN ('scenario','practical','technical')
      ORDER BY category, md5(id)`,
    [c.focusCategories],
  );
  const technical2 = await db.query(
    `SELECT id, category, topic, difficulty, qtype, question FROM interview_questions
      WHERE source='curated' AND category = ANY($1::text[]) AND category <> 'Fintech & Payments' AND qtype <> 'mcq'
      ORDER BY md5(id || 'x') LIMIT 6`,
    [c.focusCategories],
  );
  const hr = await db.query(`SELECT id, category, topic, difficulty, qtype, question FROM interview_questions WHERE source='curated' AND category='HR' ORDER BY id LIMIT 5`);
  const seen = new Set<string>();
  const uniq = (rows: any[]) => rows.filter((r) => !seen.has(r.id) && seen.add(r.id));
  return { technical: uniq([...technical, ...technical2]).slice(0, 8), domain: uniq(domain), hr: uniq(hr) };
}

export async function companyPrep(db: Db, userId: string, nameOrKey: string) {
  const k = keyOf(nameOrKey);
  const known = COMPANIES.find((c) => c.key === k || keyOf(c.name) === k);
  const disclaimer =
    'Practice questions are curated/AI-generated for this type of role – they are NOT verified questions from this company. Interview rounds show a common industry pattern; confirm with the recruiter or official careers page.';
  if (known) {
    return {
      company: known,
      verified: false,
      interviewRounds: TYPICAL_ROUNDS,
      questions: await practiceQuestions(db, known),
      recommendations: [
        `Revise ${known.domainTopics.slice(0, 3).join(', ')} with transaction-level examples.`,
        `Be ready for hands-on ${known.focusCategories.slice(0, 2).join(' and ')} exercises.`,
        `Prepare 2 project stories showing ${known.skills.slice(0, 3).join(', ')} with measurable impact.`,
        `Read ${known.name}'s official product pages so you can relate test scenarios to their products.`,
      ],
      disclaimer,
      generatedBy: 'curated',
    };
  }
  // Unknown company: AI-generated practice profile when configured (clearly labelled), otherwise a generic fintech QA set.
  const name = nameOrKey.trim().slice(0, 80);
  const [cached] = await db.query('SELECT payload FROM company_prep_cache WHERE company_key=$1 AND user_id=$2 AND created_at > now() - interval \'14 days\'', [k, userId]);
  if (cached) return cached.payload;
  let profile: CompanyProfile = {
    key: k, name, segment: 'Unknown', website: '', overview: `No curated profile for "${name}". Showing a general QA / fintech practice set.`,
    typicalRoles: ['QA Engineer', 'SDET'], skills: ['Manual Testing', 'API Testing', 'SQL', 'Automation'],
    focusCategories: ['Manual Testing', 'API Testing', 'SQL', 'Automation Testing'],
    domainTopics: ['Payment Lifecycle', 'Payment Failure Scenarios', 'Refund and Void', 'Reconciliation'],
  };
  let generatedBy = 'generic';
  let aiQuestions: string[] = [];
  if (aiConfigured()) {
    try {
      const r = await chatJson<{ overview: string; likely_skills: string[]; focus_categories: string[]; practice_questions: string[] }>(
        'You help QA engineers prepare for interviews. Only state broadly known public facts about a company; if unsure, say the information is not available. Never claim to know the company\'s actual interview questions.',
        `Company: "${name}". Return JSON {"overview": string (1-2 sentences, or "Not enough public information" if unknown), "likely_skills": string[] (max 6), "focus_categories": string[] from [Manual Testing, API Testing, SQL, Automation Testing, Performance Testing, Fintech & Payments], "practice_questions": string[] (6 practice QA interview questions suited to this company's domain)}`,
        { maxTokens: 900 },
      );
      profile = { ...profile, overview: `${r.overview} (AI-generated summary – verify on the official website.)`, skills: r.likely_skills?.slice(0, 6) ?? profile.skills, focusCategories: r.focus_categories?.length ? r.focus_categories : profile.focusCategories };
      aiQuestions = (r.practice_questions ?? []).slice(0, 6).map(String);
      generatedBy = 'ai';
    } catch (e) {
      console.warn('[ai] company prep failed:', (e as Error).message);
    }
  }
  const payload = {
    company: profile,
    verified: false,
    interviewRounds: TYPICAL_ROUNDS,
    questions: { ...(await practiceQuestions(db, profile)), ai: aiQuestions },
    recommendations: ['Study the company\'s products and map them to test scenarios.', 'Prepare payment-domain stories (failures, refunds, reconciliation).', 'Practise API chaining and SQL validation exercises.'],
    disclaimer,
    generatedBy,
  };
  await db.query('INSERT INTO company_prep_cache (company_key, user_id, payload) VALUES ($1,$2,$3) ON CONFLICT (company_key, user_id) DO UPDATE SET payload=EXCLUDED.payload, created_at=now()', [k, userId, JSON.stringify(payload)]);
  return payload;
}
