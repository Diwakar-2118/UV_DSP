import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, migrate, setDb, type Db } from '../src/db/index.js';
import { classifyRoles, extractSkills, fingerprint, normalizeLocations, normalizeUrl, parseExperience } from '../src/lib/taxonomy.js';
import { scoreJob } from '../src/services/matching.js';
import { ingestJobs, searchJobs, syncSourceRegistry } from '../src/services/jobs.js';
import { createDefaultsForUser } from '../src/services/profile.js';
import { processAlertsForUser, runDueDigests, sendDigestForUser, localClock } from '../src/services/notifications.js';
import { evaluateOffline } from '../src/services/evaluator.js';
import { analyzeOffline, estimateExperience } from '../src/services/resume.js';
import { QUESTION_BANK } from '../src/data/questionBank.js';
import { PREP_TOPICS } from '../src/data/prepTopics.js';
import type { RawJob } from '../src/sources/types.js';

let db: Db;
let userId: string;

const raw = (over: Partial<RawJob> = {}): RawJob => ({
  externalId: 'x1',
  title: 'Senior QA Engineer - Payments',
  company: 'Acme Pay',
  location: 'Bengaluru, India',
  description: 'Test payment gateway APIs with Postman and SQL. ISO 8583, settlement and reconciliation. 3-5 years of experience.',
  postedAt: new Date(),
  applyUrl: 'https://boards.example.com/acme/jobs/1?utm_source=x',
  sourceSite: 'Acme careers',
  ...over,
});

beforeAll(async () => {
  db = await createDb({ url: '', pgliteDir: null });
  await migrate(db);
  setDb(db);
  await syncSourceRegistry(db);
  const [u] = await db.query("INSERT INTO users (email, password_hash) VALUES ('t@example.com','x') RETURNING id");
  userId = u.id;
  await createDefaultsForUser(db, userId, 'Test User');
});
afterAll(async () => db.close());

describe('taxonomy', () => {
  it('normalises URLs, removing tracking params, trailing slash and www', () => {
    expect(normalizeUrl('https://WWW.Example.com/jobs/1/?utm_source=li&b=2&a=1#x')).toBe('https://example.com/jobs/1?a=1&b=2');
    expect(normalizeUrl('not a url')).toBeNull();
  });
  it('parses experience ranges', () => {
    expect(parseExperience('Need 3-5 years of experience')).toEqual({ min: 3, max: 5 });
    expect(parseExperience('4+ years in QA')).toEqual({ min: 4, max: null });
    expect(parseExperience('minimum 2 years')).toEqual({ min: 2, max: null });
    expect(parseExperience('no numbers')).toEqual({ min: null, max: null });
  });
  it('classifies only QA roles', () => {
    expect(classifyRoles('Backend Engineer', 'Build APIs')).toEqual([]);
    expect(classifyRoles('SDET', '')).toContain('QA Automation');
    expect(classifyRoles('QA Engineer', 'payment gateway testing')).toEqual(expect.arrayContaining(['Fintech QA', 'Manual QA']));
    expect(classifyRoles('Performance Test Engineer', 'JMeter')).toContain('Performance Testing');
  });
  it('extracts skills without false Java/JavaScript overlap', () => {
    const s = extractSkills('JavaScript, Playwright and Postman; ISO8583');
    expect(s).toEqual(expect.arrayContaining(['JavaScript', 'Playwright', 'Postman', 'ISO 8583']));
    expect(s).not.toContain('Java');
  });
  it('normalises locations', () => {
    expect(normalizeLocations('Bangalore')).toEqual(['Bengaluru']);
    expect(normalizeLocations('Remote - India')).toEqual(['Remote']);
    expect(normalizeLocations('Pune')).toEqual(['Other']);
  });
  it('fingerprints are case/punctuation insensitive', () => {
    expect(fingerprint('QA Engineer!', 'Acme', 'Bengaluru, KA')).toBe(fingerprint('qa engineer', 'ACME', 'bengaluru ka'));
  });
});

describe('matching', () => {
  const profile = { skills: ['Postman', 'SQL', 'API Testing', 'Payments'], experienceYears: 4, industries: ['Fintech'], locations: ['Bengaluru', 'Remote'], roles: ['Fintech QA', 'API Testing'] };
  const job = { title: 'QA Engineer', company: 'Acme Pay', description: '', skills: ['Postman', 'SQL', 'Selenium', 'API Testing'], roles: ['Fintech QA'], exp_min: 3, exp_max: 5, industry: 'Fintech', location_tags: ['Bengaluru'] };
  it('scores with transparent 40/25/20/15 weights', () => {
    const r = scoreJob(profile, job);
    expect(r.breakdown.experience).toBe(25);
    expect(r.breakdown.industry).toBe(20);
    expect(r.breakdown.location).toBe(15);
    expect(r.breakdown.skills).toBe(34); // 3/4 + 0.1 role bonus = 0.85 * 40
    expect(r.score).toBe(94);
    expect(r.missingSkills).toEqual(['Selenium']);
    expect(r.reasons.length).toBeGreaterThan(0);
  });
  it('penalises location and experience mismatches', () => {
    const r = scoreJob(profile, { ...job, location_tags: ['Other'], exp_min: 8, exp_max: 12 });
    expect(r.breakdown.location).toBe(0);
    expect(r.breakdown.experience).toBe(0);
  });
});

describe('job ingestion & dedupe', () => {
  it('inserts, updates on re-fetch, and rejects cross-source duplicates', async () => {
    const first = await ingestJobs(db, 'greenhouse', [raw(), raw({ externalId: 'x2', title: 'Marketing Manager' })]);
    expect(first).toMatchObject({ fetched: 2, relevant: 1, inserted: 1 });
    const again = await ingestJobs(db, 'greenhouse', [raw()]);
    expect(again).toMatchObject({ inserted: 0, updated: 1 });
    // Same URL (different tracking params) from another source -> duplicate
    const viaUrl = await ingestJobs(db, 'remotive', [raw({ externalId: 'r1', applyUrl: 'https://www.boards.example.com/acme/jobs/1/?utm_medium=y' })]);
    expect(viaUrl).toMatchObject({ inserted: 0, duplicates: 1 });
    // Same title/company/location, different URL, another source -> duplicate
    const viaFp = await ingestJobs(db, 'adzuna', [raw({ externalId: 'a1', applyUrl: 'https://adzuna.example/123' })]);
    expect(viaFp).toMatchObject({ inserted: 0, duplicates: 1 });
    // Within a batch
    const batch = await ingestJobs(db, 'lever', [raw({ externalId: 'l1', applyUrl: 'https://l.example/1', title: 'API Test Engineer' }), raw({ externalId: 'l2', applyUrl: 'https://l.example/1', title: 'API Test Engineer' })]);
    expect(batch).toMatchObject({ inserted: 1, duplicates: 1 });
    const [{ n }] = await db.query("SELECT count(*)::int n FROM jobs WHERE NOT is_demo");
    expect(n).toBe(2);
  });

  it('search filters by location, date and min match; demo excluded when live exists', async () => {
    await ingestJobs(db, 'demo', [raw({ externalId: 'demo-1', company: 'Demo Co (Demo)', applyUrl: null, title: 'QA Analyst' })], true);
    await ingestJobs(db, 'greenhouse', [raw({ externalId: 'old', title: 'Old QA Tester', applyUrl: 'https://x.example/old', postedAt: new Date(Date.now() - 20 * 86400000) })]);
    await ingestJobs(db, 'greenhouse', [raw({ externalId: 'pune', title: 'QA Engineer Pune', location: 'Pune', applyUrl: 'https://x.example/pune' })]);
    const all = await searchJobs(db, userId, {});
    expect(all.liveAvailable).toBe(true);
    expect(all.jobs.every((j: any) => !j.is_demo)).toBe(true);
    const withDemo = await searchJobs(db, userId, { includeDemo: true });
    expect(withDemo.jobs.some((j: any) => j.is_demo)).toBe(true);
    const recent = await searchJobs(db, userId, { postedWithinDays: 7 });
    expect(recent.jobs.find((j: any) => j.title === 'Old QA Tester')).toBeUndefined();
    const blr = await searchJobs(db, userId, { locations: ['Bengaluru'] });
    expect(blr.jobs.find((j: any) => j.title === 'QA Engineer Pune')).toBeUndefined();
    const high = await searchJobs(db, userId, { minMatch: 90, sort: 'match' });
    expect(high.jobs.every((j: any) => j.match.score >= 90)).toBe(true);
  });
});

describe('notifications', () => {
  it('creates alerts once per job and never for demo jobs', async () => {
    const r1 = await processAlertsForUser(db, userId);
    expect(r1.created).toBeGreaterThan(0);
    const r2 = await processAlertsForUser(db, userId);
    expect(r2.created).toBe(0);
    const demo = await db.query('SELECT 1 FROM job_notifications n JOIN jobs j ON j.id=n.job_id WHERE j.is_demo AND n.user_id=$1', [userId]);
    expect(demo).toHaveLength(0);
    const pune = await db.query("SELECT 1 FROM job_notifications n JOIN jobs j ON j.id=n.job_id WHERE j.title='QA Engineer Pune'");
    expect(pune).toHaveLength(0);
  });
  it('does not email until the channel is configured and verified', async () => {
    const r = await sendDigestForUser(db, userId);
    expect(r.email).toBe('inactive');
    const emailed = await db.query('SELECT 1 FROM job_notifications WHERE emailed_at IS NOT NULL');
    expect(emailed).toHaveLength(0);
  });
  it('sends each due digest only once per local day', async () => {
    await db.query("UPDATE notification_settings SET delivery_time='00:00', last_digest_on=NULL WHERE user_id=$1", [userId]);
    const a = await runDueDigests(db);
    const b = await runDueDigests(db);
    expect(a.processed).toBe(1);
    expect(b.processed).toBe(0);
    const [s] = await db.query('SELECT last_digest_on FROM notification_settings WHERE user_id=$1', [userId]);
    expect(s.last_digest_on).toBe(localClock('Asia/Kolkata').date);
  });
});

describe('question bank & evaluator', () => {
  it('bank is consistent with prep topics', () => {
    for (const q of QUESTION_BANK) expect(PREP_TOPICS[q.category].some((t) => t.topic === q.topic)).toBe(true);
    expect(new Set(QUESTION_BANK.map((q) => q.id)).size).toBe(QUESTION_BANK.length);
  });
  it('grades MCQ exactly', () => {
    const q = QUESTION_BANK.find((x) => x.qtype === 'mcq')!;
    const as = { question: q.question, qtype: 'mcq', topic: q.topic, category: q.category, options: q.options!, correct_option: q.correctOption!, ideal_answer: q.idealAnswer, key_points: [] };
    expect(evaluateOffline(as, '', q.correctOption).score).toBe(10);
    expect(evaluateOffline(as, '', (q.correctOption! + 1) % 4).score).toBe(0);
  });
  it('grades open answers by key-point coverage', () => {
    const q = QUESTION_BANK.find((x) => x.qtype !== 'mcq' && x.keyPoints.length >= 3)!;
    const as = { question: q.question, qtype: q.qtype, topic: q.topic, category: q.category, options: null, correct_option: null, ideal_answer: q.idealAnswer, key_points: q.keyPoints };
    const full = evaluateOffline(as, `In my project, first ${q.keyPoints.map((k) => k.keywords[0]).join(', then ')}. Finally we validated everything carefully across many test cycles and releases for the team.`);
    const weak = evaluateOffline(as, 'I am not sure.');
    expect(full.score).toBeGreaterThanOrEqual(8);
    expect(weak.score).toBeLessThanOrEqual(2);
    expect(weak.missingPoints.length).toBe(q.keyPoints.length);
  });
});

describe('resume parsing', () => {
  it('rejects bytes that are not really PDF/DOCX (magic-number check)', async () => {
    const { extractResumeText } = await import('../src/services/resume.js');
    // Real PDF extraction is covered end-to-end with a Chromium-rendered PDF (e2e/tests/resume-study-company.spec.ts).
    await expect(extractResumeText(Buffer.from('hello'), 'pdf')).rejects.toThrow('not a valid PDF');
    await expect(extractResumeText(Buffer.from('hello'), 'docx')).rejects.toThrow('not a valid DOCX');
  });
});

describe('resume analysis', () => {
  const text = `Asha Rao\nasha@example.com | +91 98765 43210 | linkedin.com/in/asha\n\nProfessional Summary\nQA Engineer with 4 years of experience in payments testing.\n\nTechnical Skills\nManual Testing, Regression Testing, API Testing, Postman, SQL, Jira, Selenium, Agile\n\nProfessional Experience\nQA Engineer, PayCo — Jan 2021 – Present\n• Responsible for testing UPI and settlement flows\n• Wrote 300+ test cases and reduced regression time by 30%\n• Worked on API automation\nTest Engineer, SoftCo — Jun 2019 – Dec 2020\n• Did functional testing\n\nProjects\nProject: Merchant settlement reconciliation\n\nEducation\nB.Tech`;
  it('extracts experience from date ranges', () => {
    const y = estimateExperience(text)!;
    expect(y).toBeGreaterThan(5);
  });
  it('produces ATS checks, JD match and rewrites', () => {
    const a = analyzeOffline(text, 'We need a QA engineer with Playwright, Postman, SQL and JMeter. Playwright automation is a must. JMeter performance testing.');
    expect(a.skills).toEqual(expect.arrayContaining(['Postman', 'SQL', 'UPI']));
    expect(a.jobMatch!.missingSkills).toEqual(expect.arrayContaining(['Playwright', 'JMeter']));
    expect(a.atsScore).toBeGreaterThan(50);
    expect(a.projectRewrites.some((r) => r.improved.startsWith('Owned'))).toBe(true);
  });
});
