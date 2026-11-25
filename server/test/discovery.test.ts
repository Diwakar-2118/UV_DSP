import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createDb, migrate, setDb, type Db } from '../src/db/index.js';
import { expandRoles, isBroadSearch, matchesLocation, matchesRoleFamily, parseLocation, queryTerms } from '../src/lib/roleFamilies.js';
import { careerLinks, catalogFor, COMPANY_CATALOG } from '../src/sources/catalog.js';
import { toNormalized, type JobSourceAdapter, type RawJob } from '../src/sources/types.js';
import { clearDiscoveryCache, dedupe, discoverJobs, filterCandidates, rankCandidates, titleSimilarity, type Candidate } from '../src/services/discovery.js';
import { syncSourceRegistry } from '../src/services/jobs.js';
import { clearProviderCache, runProviders, type ProviderRun } from '../src/services/providerRunner.js';
import { createDefaultsForUser } from '../src/services/profile.js';

const raw = (over: Partial<RawJob> = {}): RawJob => ({
  externalId: 'x1',
  title: 'QA Engineer',
  company: 'Acme',
  location: 'Hyderabad, Telangana, India',
  description: 'Manual and API testing with Postman and SQL. Jira. 3-5 years of experience.',
  postedAt: new Date('2026-11-20T00:00:00Z'),
  applyUrl: 'https://jobs.example.com/acme/1',
  ...over,
});
const cand = (over: Partial<RawJob> = {}, source = 'greenhouse'): Candidate => {
  const r = raw(over);
  return { raw: r, job: toNormalized(r, source) };
};

describe('role families', () => {
  it('expands roles to synonyms and keeps unknown roles literal', () => {
    expect(matchesRoleFamily('Software Development Engineer in Test II', ['QA Engineer'])).toBe(true);
    expect(matchesRoleFamily('Senior SDET', ['QA Automation'])).toBe(true);
    expect(matchesRoleFamily('Performance Test Engineer - JMeter', ['Performance Testing'])).toBe(true);
    expect(matchesRoleFamily('Backend Engineer', ['QA Engineer'])).toBe(false);
    expect(matchesRoleFamily('Data Engineer', ['Data Engineer'])).toBe(true);
    expect(matchesRoleFamily('Anything', [])).toBe(true);
    expect(expandRoles(['QA Engineer', 'SDET']).length).toBeGreaterThan(5);
  });
  it('"IT" matches any IT job; family names match their family', () => {
    expect(matchesRoleFamily('Senior Data Engineer', ['IT'])).toBe(true);
    expect(matchesRoleFamily('Android Developer', ['IT'])).toBe(true);
    expect(matchesRoleFamily('Relationship Manager', ['IT'])).toBe(false);
    expect(matchesRoleFamily('Senior Frontend Developer (React)', ['Frontend Development'])).toBe(true);
    expect(matchesRoleFamily('Senior Frontend Developer (React)', ['Data Engineering'])).toBe(false);
    expect(matchesRoleFamily('Java Developer', ['Java Developer'])).toBe(true);
    expect(queryTerms(['Backend Development', 'IT'])).toEqual(expect.arrayContaining(['Backend Developer', 'Software Engineer', 'QA Engineer']));
    expect(isBroadSearch(['IT'])).toBe(true);
    expect(isBroadSearch(['QA Engineer'])).toBe(false);
  });
  it('rejects non-software QA titles', () => {
    expect(matchesRoleFamily('AML QA Specialist, Swedish, Account Compliance Quality', ['QA Engineer'])).toBe(false);
    expect(matchesRoleFamily('Call Quality QA Analyst', ['QA Engineer'])).toBe(false);
    expect(matchesRoleFamily('QA Engineer - Compliance Automation Software', ['QA Engineer'])).toBe(true);
  });
});

describe('location matching', () => {
  const job = (location: string, remote = false, country: string | null = 'IN') => ({ location, remote, country });
  it('matches city aliases, country and remote-open-to-India', () => {
    const hyd = parseLocation('Hyderabad');
    expect(matchesLocation(job('Secunderabad, Telangana'), hyd)).toBe(true);
    expect(matchesLocation(job('India - Hyderabad'), hyd)).toBe(true);
    expect(matchesLocation(job('Bengaluru, India'), hyd)).toBe(false);
    const blr = parseLocation('Bangalore');
    expect(matchesLocation(job('Bengaluru, Karnataka'), blr)).toBe(true);
    const india = parseLocation('India');
    expect(matchesLocation(job('Pune, India'), india)).toBe(true);
    expect(matchesLocation(job('Berlin', false, 'DE'), india)).toBe(false);
    const remote = parseLocation('Hyderabad, Remote');
    expect(matchesLocation(job('Remote (Worldwide)', true, null), remote)).toBe(true);
    expect(matchesLocation(job('Remote - USA', true, 'US'), remote)).toBe(false);
    expect(matchesLocation(job('Anywhere'), parseLocation(''))).toBe(true);
  });
});

describe('merge, dedupe, filter, rank', () => {
  it('dedupes by canonical URL, else by company + title + location', () => {
    const out = dedupe([
      cand({ externalId: 'a' }),
      cand({ externalId: 'b', applyUrl: 'https://www.jobs.example.com/acme/1/?utm_source=x' }, 'jooble'), // same URL
      cand({ externalId: 'c', applyUrl: 'https://other.example/9', company: 'ACME', title: 'QA  Engineer' }, 'adzuna'), // same fingerprint
      cand({ externalId: 'd', applyUrl: null, title: 'SDET' }),
    ]);
    expect(out.map((c) => c.raw.externalId)).toEqual(['a', 'd']);
  });

  it('filters by role family and location', () => {
    const out = filterCandidates(
      [cand({ externalId: '1' }), cand({ externalId: '2', title: 'Product Manager' }), cand({ externalId: '3', location: 'Berlin, Germany' }), cand({ externalId: '4', title: 'SDET', location: 'Remote (Worldwide)', isRemote: true })],
      ['QA Engineer'],
      'Hyderabad, Remote',
    );
    expect(out.map((c) => c.raw.externalId)).toEqual(['1', '4']);
  });

  it('"IT" keeps every IT job in the location and drops non-IT jobs', () => {
    const out = filterCandidates(
      [cand({ externalId: 'qa' }), cand({ externalId: 'be', title: 'Backend Engineer' }), cand({ externalId: 'ds', title: 'Data Scientist' }), cand({ externalId: 'rm', title: 'Relationship Manager' }), cand({ externalId: 'pune', title: 'DevOps Engineer', location: 'Pune' })],
      ['IT'],
      'Hyderabad',
    );
    expect(out.map((c) => c.raw.externalId)).toEqual(['qa', 'be', 'ds']);
    const fam = filterCandidates([cand({ externalId: 'be', title: 'Backend Engineer' }), cand({ externalId: 'qa' })], ['Backend Development'], 'Hyderabad');
    expect(fam.map((c) => c.raw.externalId)).toEqual(['be']);
  });

  it('title similarity favours closer titles', () => {
    expect(titleSimilarity('QA Engineer', ['QA Engineer'])).toBeGreaterThan(titleSimilarity('Senior Test Analyst', ['QA Engineer']));
    expect(titleSimilarity('Marketing Lead', ['QA Engineer'])).toBe(0);
  });

  it('ranks against the profile; why/missing never invent skills', () => {
    const profile = { skills: ['Postman', 'SQL', 'Jira'], experienceYears: 4, industries: ['Fintech'], locations: ['Hyderabad'], roles: ['Manual QA', 'API Testing'] };
    const ranked = rankCandidates(
      [cand({ externalId: 'good' }), cand({ externalId: 'far', title: 'Senior QA Engineer', location: 'Pune', description: 'Selenium, Cypress and Kafka. 10-14 years.' })],
      profile,
      ['QA Engineer'],
      10,
    );
    expect(ranked[0].id).toBe('greenhouse:good');
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    expect(ranked[0].why).toEqual(expect.arrayContaining(['Postman', 'SQL', 'Jira']));
    for (const r of ranked) for (const s of r.why) expect(profile.skills).toContain(s);
    expect(ranked[1].missing).toEqual(expect.arrayContaining(['Selenium', 'Cypress', 'Kafka']));
    expect(rankCandidates([cand(), cand({ externalId: 'z', applyUrl: 'https://x/2' })], profile, ['QA'], 1)).toHaveLength(1);
  });
});

describe('company catalog', () => {
  it('has unique entries, env overrides and deep links for companies without APIs', () => {
    const keys = COMPANY_CATALOG.map((e) => `${e.ats}:${e.id ?? e.workday?.tenant ?? e.company}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(catalogFor('greenhouse').some((e) => e.id === 'highradius')).toBe(true);
    process.env.GREENHOUSE_BOARDS = 'highradius,newco';
    expect(catalogFor('greenhouse').map((e) => e.id)).toEqual(['highradius', 'newco']);
    delete process.env.GREENHOUSE_BOARDS;
    const links = careerLinks('QA Engineer', 'Hyderabad');
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) expect(l.url).not.toMatch(/\{q\}|\{loc\}/);
  });
});

describe('provider runner and discovery service', () => {
  let db: Db;
  let userId: string;
  const fake = (id: string, impl: JobSourceAdapter['fetch'], extra: Partial<JobSourceAdapter> = {}): JobSourceAdapter => ({
    id, name: id, kind: 'api', website: '', description: '', requiresCredentials: false, isLive: true, unavailableReason: () => null, fetch: impl, ...extra,
  });

  beforeAll(async () => {
    db = await createDb({ url: '', pgliteDir: null });
    await migrate(db);
    setDb(db);
    await syncSourceRegistry(db);
    for (const id of ['ok', 'boom', 'slow', 'nokey', 'limited']) {
      await db.query(`INSERT INTO job_sources (id, name, kind) VALUES ($1,$1,'api') ON CONFLICT DO NOTHING`, [id]);
    }
    const [u] = await db.query("INSERT INTO users (email, password_hash) VALUES ('d@example.com','x') RETURNING id");
    userId = u.id;
    await createDefaultsForUser(db, userId, 'Disco User');
  });
  afterAll(async () => db.close());
  beforeEach(() => {
    clearDiscoveryCache();
    clearProviderCache();
  });

  it('skips providers without keys, isolates failures and returns partial results within the budget', async () => {
    const runs = await runProviders(db, { roles: ['QA Engineer'], location: 'Hyderabad' }, {
      includeLive: true,
      budgetMs: 300,
      adapters: [
        fake('ok', async () => [raw()]),
        fake('boom', async () => { throw new Error('HTTP 500 from example'); }),
        fake('slow', (ctx) => new Promise((resolve) => ctx.signal?.addEventListener('abort', () => resolve([raw({ externalId: 'partial' })])))),
        fake('nokey', async () => [raw()], { unavailableReason: () => 'Missing EXAMPLE_KEY' }),
      ],
    });
    const by = Object.fromEntries(runs.map((r) => [r.source, r]));
    expect(by.ok).toMatchObject({ status: 'ok' });
    expect(by.ok.jobs).toHaveLength(1);
    expect(by.boom).toMatchObject({ status: 'error', detail: 'HTTP 500 from example' });
    expect(by.slow.status).toBe('ok');
    expect(by.slow.detail).toMatch(/partial/i);
    expect(by.slow.jobs[0].externalId).toBe('partial');
    expect(by.nokey).toMatchObject({ status: 'skipped', detail: 'Missing EXAMPLE_KEY' });
  });

  it('respects a provider minimum interval by reusing its last results', async () => {
    let calls = 0;
    const limited = fake('limited', async () => { calls++; return [raw()]; }, { minIntervalMinutes: 60 });
    const ctx = { roles: ['QA Engineer'], location: 'Hyderabad' };
    await runProviders(db, ctx, { includeLive: true, adapters: [limited] });
    const second = await runProviders(db, ctx, { includeLive: true, adapters: [limited] });
    expect(calls).toBe(1);
    expect(second[0].cached).toBe(true);
  });

  it('discovers, stores, ranks and caches per user for 15 minutes', async () => {
    let runCalls = 0;
    let clock = Date.parse('2026-11-25T10:00:00Z');
    const run = async (): Promise<ProviderRun[]> => {
      runCalls++;
      return [
        { source: 'greenhouse', status: 'ok', jobs: [raw({ externalId: 'gh1', title: 'Senior QA Engineer', applyUrl: 'https://jobs.example.com/gh1' })] },
        { source: 'amazon', status: 'ok', jobs: [raw({ externalId: 'az1', title: 'Quality Assurance Engineer II', company: 'Amazon', applyUrl: 'https://www.amazon.jobs/en/jobs/1' }), raw({ externalId: 'az2', title: 'Recruiter', applyUrl: 'https://www.amazon.jobs/en/jobs/2' })] },
        { source: 'jooble', status: 'ok', jobs: [raw({ externalId: 'jb1', title: 'Senior QA Engineer', applyUrl: 'https://jobs.example.com/gh1?utm_source=jooble' })] },
        { source: 'adzuna', status: 'skipped', detail: 'Missing ADZUNA_APP_ID / ADZUNA_APP_KEY', jobs: [] },
      ];
    };
    const deps = { run, now: () => clock };
    const first: any = await discoverJobs(db, userId, { roles: ['QA Engineer'], location: 'Hyderabad', top: 10 }, deps);
    expect(first.cached).toBe(false);
    expect(first.counts).toEqual({ fetched: 4, unique: 3, matched: 2, returned: 2 });
    expect(first.jobs.map((j: any) => j.id).sort()).toEqual(['amazon:az1', 'greenhouse:gh1']);
    for (const j of first.jobs) {
      expect(j).toHaveProperty('why');
      expect(j).toHaveProperty('missing');
      expect(j.score).toBeGreaterThan(0);
    }
    expect(first.sources.find((s: any) => s.source === 'adzuna').status).toBe('skipped');
    expect(first.deepLinks.boards.length).toBeGreaterThan(0);
    // Stored for Find Jobs / alerts
    const [{ n }] = await db.query("SELECT count(*)::int n FROM jobs WHERE external_id IN ('gh1','az1')");
    expect(n).toBe(2);

    clock += 5 * 60_000;
    const again: any = await discoverJobs(db, userId, { roles: ['QA Engineer'], location: 'Hyderabad', top: 10 }, deps);
    expect(again.cached).toBe(true);
    expect(runCalls).toBe(1);

    clock += 11 * 60_000; // > 15 min
    await discoverJobs(db, userId, { roles: ['QA Engineer'], location: 'Hyderabad', top: 10 }, deps);
    expect(runCalls).toBe(2);
  });
});
