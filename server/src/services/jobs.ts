import type { Db } from '../db/index.js';
import {
  classifyRoles,
  extractSkills,
  fingerprint,
  inferIndustry,
  normalizeLocations,
  normalizeUrl,
  parseExperience,
} from '../lib/taxonomy.js';
import { ALL_IT } from '../lib/roleFamilies.js';
import { ADAPTERS, SEARCH_LINK_SOURCES } from '../sources/adapters.js';
import type { FetchContext, RawJob } from '../sources/types.js';
import { scoreJob, type MatchProfile, type MatchResult } from './matching.js';
import { runProviders, type ProviderRun } from './providerRunner.js';

export interface IngestStats {
  fetched: number;
  relevant: number;
  inserted: number;
  updated: number;
  duplicates: number;
  insertedIds: string[];
}

/** Register all providers + search-link boards in job_sources (idempotent). */
export async function syncSourceRegistry(db: Db) {
  for (const a of ADAPTERS) {
    await db.query(
      `INSERT INTO job_sources (id, name, kind, website, description, requires_credentials, is_live, enabled)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, kind=EXCLUDED.kind, website=EXCLUDED.website,
         description=EXCLUDED.description, requires_credentials=EXCLUDED.requires_credentials, is_live=EXCLUDED.is_live`,
      [a.id, a.name, a.kind, a.website, a.description, a.requiresCredentials, a.isLive, a.defaultEnabled ?? true],
    );
  }
  for (const s of SEARCH_LINK_SOURCES) {
    await db.query(
      `INSERT INTO job_sources (id, name, kind, website, description, is_live)
       VALUES ($1,$2,'search_link',$3,$4,true)
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, website=EXCLUDED.website, description=EXCLUDED.description`,
      [s.id, s.name, s.website, `No public jobs API. CareerPilot builds deep-links to ${s.name}'s own search page using your filters (no scraping).`],
    );
  }
}

/** Normalise raw jobs, drop non-IT roles, de-duplicate and upsert. */
export async function ingestJobs(db: Db, sourceId: string, raws: RawJob[]): Promise<IngestStats> {
  const stats: IngestStats = { fetched: raws.length, relevant: 0, inserted: 0, updated: 0, duplicates: 0, insertedIds: [] };
  const seenInBatch = new Set<string>();
  for (const r of raws) {
    if (!r.title || !r.company) continue;
    const text = `${r.title}\n${r.description}`;
    const roles = classifyRoles(r.title, r.description);
    if (roles.length === 0) continue; // not an IT role (sales, HR, finance, operations…)
    stats.relevant++;

    const normalizedUrl = normalizeUrl(r.applyUrl);
    const fp = fingerprint(r.title, r.company, r.location);
    const batchKey = normalizedUrl ?? fp;
    if (seenInBatch.has(batchKey)) {
      stats.duplicates++;
      continue;
    }
    seenInBatch.add(batchKey);

    const exp = r.expMin != null || r.expMax != null ? { min: r.expMin ?? null, max: r.expMax ?? null } : parseExperience(text);
    const skills = extractSkills(text);
    const locationTags = normalizeLocations(r.location, r.isRemote);
    const industry = inferIndustry(r.company, text);
    const postedAt = r.postedAt && !Number.isNaN(r.postedAt.getTime()) ? r.postedAt : new Date();
    const notice = r.noticePeriod ?? (text.match(/notice period[^.\n]{0,60}/i)?.[0] ?? null);

    const existing = await db.query<{ id: string }>('SELECT id FROM jobs WHERE source_id=$1 AND external_id=$2', [sourceId, r.externalId]);
    if (existing.length) {
      await db.query(
        `UPDATE jobs SET title=$2, company=$3, location=$4, location_tags=$5, exp_min=$6, exp_max=$7, skills=$8, roles=$9,
           description=$10, industry=$11, salary_text=$12, salary_min_lpa=$13, salary_max_lpa=$14, job_type=$15,
           last_seen_at=now(), is_active=true
         WHERE id=$1`,
        [existing[0].id, r.title, r.company, r.location, locationTags, exp.min, exp.max, skills, roles, r.description,
          industry, r.salaryText ?? null, r.salaryMinLpa ?? null, r.salaryMaxLpa ?? null, r.jobType ?? null],
      );
      stats.updated++;
      continue;
    }

    // Cross-source duplicate: same canonical URL, or same title+company+city seen recently from another source.
    const dup = await db.query(
      `SELECT id FROM jobs WHERE (normalized_url IS NOT NULL AND normalized_url=$1)
          OR (fingerprint=$2 AND source_id<>$3 AND first_seen_at > now() - interval '45 days') LIMIT 1`,
      [normalizedUrl, fp, sourceId],
    );
    if (dup.length) {
      stats.duplicates++;
      continue;
    }

    const rows = await db.query<{ id: string }>(
      `INSERT INTO jobs (source_id, external_id, source_site, title, company, location, location_tags, exp_min, exp_max,
         salary_min_lpa, salary_max_lpa, salary_text, job_type, industry, skills, roles, notice_period, description,
         posted_at, apply_url, normalized_url, fingerprint, is_demo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,false)
       ON CONFLICT DO NOTHING RETURNING id`,
      [sourceId, r.externalId, r.sourceSite ?? '', r.title, r.company, r.location, locationTags, exp.min, exp.max,
        r.salaryMinLpa ?? null, r.salaryMaxLpa ?? null, r.salaryText ?? null, r.jobType ?? null, industry, skills, roles,
        notice, r.description, postedAt, r.applyUrl ?? null, normalizedUrl, fp],
    );
    if (rows.length) {
      stats.inserted++;
      stats.insertedIds.push(rows[0].id);
    } else stats.duplicates++;
  }
  return stats;
}

export interface SourceRunResult {
  source: string;
  status: 'ok' | 'error' | 'skipped';
  detail?: string;
  stats?: Omit<IngestStats, 'insertedIds'>;
}

/**
 * Search context for the scheduled run: every IT role family, in every location users prefer.
 * (Each user's own role preferences decide what they are alerted about – collection covers all IT jobs.)
 */
export async function scheduledContext(db: Db): Promise<Omit<FetchContext, 'signal'>> {
  const rows = await db.query<{ locations: string[] }>('SELECT locations FROM job_preferences');
  const locations = [...new Set(rows.flatMap((r) => r.locations ?? []))];
  return { roles: [ALL_IT], location: (locations.length ? locations : ['Bengaluru', 'Hyderabad', 'Remote']).join(', ') };
}

/** Record a provider run in job_sources and ingest its jobs. */
export async function recordRun(db: Db, run: ProviderRun): Promise<SourceRunResult> {
  if (run.status === 'skipped') {
    await db.query(`UPDATE job_sources SET last_status='skipped', last_error=$2 WHERE id=$1`, [run.source, run.detail ?? null]);
    return { source: run.source, status: 'skipped', detail: run.detail };
  }
  if (run.status === 'error' && !run.jobs.length) {
    await db.query(`UPDATE job_sources SET last_run_at=now(), last_status='error', last_error=$2 WHERE id=$1`, [run.source, (run.detail ?? '').slice(0, 500)]);
    return { source: run.source, status: 'error', detail: run.detail };
  }
  const stats = await ingestJobs(db, run.source, run.jobs);
  if (!run.cached) {
    await db.query(
      `UPDATE job_sources SET last_run_at=now(), last_status='ok', last_error=$2, last_fetched=$3, last_relevant=$4, last_inserted=$5 WHERE id=$1`,
      [run.source, run.status === 'error' ? `Partial: ${(run.detail ?? '').slice(0, 450)}` : null, stats.fetched, stats.relevant, stats.inserted],
    );
  }
  const { insertedIds: _ids, ...rest } = stats;
  return { source: run.source, status: 'ok', detail: run.detail, stats: rest };
}

let collecting: Promise<SourceRunResult[]> | null = null;

/** Run every enabled + configured provider concurrently (40 s budget). Concurrent calls share the same run. */
export function collectJobs(db: Db, opts: { includeLive?: boolean; budgetMs?: number } = {}): Promise<SourceRunResult[]> {
  if (collecting) return collecting;
  collecting = (async () => {
    await syncSourceRegistry(db);
    const ctx = await scheduledContext(db);
    const runs = await runProviders(db, ctx, { includeLive: opts.includeLive, budgetMs: opts.budgetMs });
    const results: SourceRunResult[] = [];
    for (const run of runs) results.push(await recordRun(db, run));
    // Listings not seen by any run for 21 days are treated as closed.
    await db.query(`UPDATE jobs SET is_active=false WHERE is_active AND last_seen_at < now() - interval '21 days'`);
    return results;
  })().finally(() => {
    collecting = null;
  });
  return collecting;
}

export async function hasLiveJobs(db: Db): Promise<boolean> {
  const r = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM jobs WHERE NOT is_demo AND is_active');
  return r[0].n > 0;
}

export async function loadMatchProfile(db: Db, userId: string): Promise<MatchProfile> {
  const [p] = await db.query(
    `SELECT p.technical_skills, p.total_experience_years, p.industries, jp.locations, jp.roles, jp.industries AS pref_industries
       FROM user_profiles p JOIN job_preferences jp ON jp.user_id = p.user_id WHERE p.user_id=$1`,
    [userId],
  );
  if (!p) return { skills: [], experienceYears: 0, industries: [], locations: [], roles: [] };
  return {
    skills: p.technical_skills,
    experienceYears: Number(p.total_experience_years),
    industries: [...new Set([...(p.pref_industries ?? []), ...(p.industries ?? [])])],
    locations: p.locations,
    roles: p.roles,
  };
}

export interface JobSearchParams {
  q?: string;
  roles?: string[];
  locations?: string[];
  expMin?: number;
  expMax?: number;
  company?: string;
  industry?: string;
  skills?: string[];
  salaryMin?: number;
  jobType?: string;
  postedWithinDays?: number;
  minMatch?: number;
  sort?: 'latest' | 'match' | 'experience' | 'company';
  savedOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export async function searchJobs(db: Db, userId: string, p: JobSearchParams) {
  const where: string[] = ['j.is_active'];
  const args: unknown[] = [userId];
  const add = (sql: string, v: unknown) => {
    args.push(v);
    where.push(sql.replace('?', `$${args.length}`));
  };
  where.push('NOT j.is_demo'); // demo data is never shown
  const liveAvailable = await hasLiveJobs(db);
  if (p.q) add(`(j.title ILIKE ? OR j.company ILIKE $${args.length + 1} OR j.description ILIKE $${args.length + 1})`, `%${p.q}%`);
  if (p.roles?.length) add('j.roles && ?::text[]', p.roles);
  if (p.locations?.length) add('j.location_tags && ?::text[]', p.locations);
  // Experience overlap: job range [exp_min, exp_max] must intersect requested range. Unknown experience is kept.
  if (p.expMax != null) add('(j.exp_min IS NULL OR j.exp_min <= ?)', p.expMax);
  if (p.expMin != null) add('(j.exp_max IS NULL OR j.exp_max >= ?)', p.expMin);
  if (p.company) add('j.company ILIKE ?', `%${p.company}%`);
  if (p.industry) add('j.industry = ?', p.industry);
  if (p.skills?.length) add('j.skills @> ?::text[]', p.skills);
  if (p.salaryMin != null) add('(j.salary_max_lpa IS NOT NULL AND j.salary_max_lpa >= ?)', p.salaryMin);
  if (p.jobType) add('j.job_type ILIKE ?', `%${p.jobType}%`);
  if (p.postedWithinDays) add(`j.posted_at >= now() - (? || ' days')::interval`, String(p.postedWithinDays));
  if (p.savedOnly) where.push('s.job_id IS NOT NULL');

  const rows = await db.query(
    `SELECT j.id, j.source_id, js.name AS source_name, j.source_site, j.title, j.company, j.location, j.location_tags,
            j.exp_min, j.exp_max, j.salary_min_lpa, j.salary_max_lpa, j.salary_text, j.job_type, j.industry, j.skills,
            j.roles, j.notice_period, j.description, j.posted_at, j.apply_url, j.first_seen_at,
            (s.job_id IS NOT NULL) AS saved
       FROM jobs j JOIN job_sources js ON js.id = j.source_id
       LEFT JOIN saved_jobs s ON s.job_id = j.id AND s.user_id = $1
      WHERE ${where.join(' AND ')}
      ORDER BY j.posted_at DESC
      LIMIT 2000`,
    args,
  );

  const profile = await loadMatchProfile(db, userId);
  let scored = rows.map((r: any) => ({ ...r, match: scoreJob(profile, r) as MatchResult }));
  if (p.minMatch) scored = scored.filter((r) => r.match.score >= p.minMatch!);
  const sort = p.sort ?? 'latest';
  const expDistance = (r: any) => {
    const y = profile.experienceYears;
    if (r.exp_min == null && r.exp_max == null) return 2;
    const lo = r.exp_min ?? 0;
    const hi = r.exp_max ?? lo + 4;
    return y < lo ? lo - y : y > hi ? y - hi : 0;
  };
  scored.sort((a, b) => {
    if (sort === 'match') return b.match.score - a.match.score || +new Date(b.posted_at) - +new Date(a.posted_at);
    if (sort === 'experience') return expDistance(a) - expDistance(b) || b.match.score - a.match.score;
    if (sort === 'company') return a.company.localeCompare(b.company);
    return +new Date(b.posted_at) - +new Date(a.posted_at);
  });
  const pageSize = Math.min(Math.max(p.pageSize ?? 20, 1), 100);
  const page = Math.max(p.page ?? 1, 1);
  return {
    total: scored.length,
    page,
    pageSize,
    liveAvailable,
    jobs: scored.slice((page - 1) * pageSize, page * pageSize).map(({ description, ...j }) => ({
      ...j,
      description: description.length > 1200 ? `${description.slice(0, 1200)}…` : description,
    })),
  };
}

export async function getJob(db: Db, userId: string, id: string) {
  const [j] = await db.query(
    `SELECT j.*, js.name AS source_name, (s.job_id IS NOT NULL) AS saved FROM jobs j JOIN job_sources js ON js.id=j.source_id
       LEFT JOIN saved_jobs s ON s.job_id=j.id AND s.user_id=$1 WHERE j.id=$2`,
    [userId, id],
  );
  if (!j) return null;
  const profile = await loadMatchProfile(db, userId);
  const { fingerprint: _f, normalized_url: _n, ...rest } = j;
  return { ...rest, match: scoreJob(profile, j) };
}
