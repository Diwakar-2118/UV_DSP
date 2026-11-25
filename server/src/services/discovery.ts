/**
 * Job discovery: run providers -> normalise -> de-duplicate -> filter by role family and location
 * -> score against the user's profile -> top N with "why it fits" and "missing skills".
 * Results are cached per user for 15 minutes and also stored, so they appear in Find Jobs and alerts.
 */
import type { Db } from '../db/index.js';
import { matchesLocation, matchesRoleFamily, parseLocation } from '../lib/roleFamilies.js';
import { classifyRoles, extractSkills, inferIndustry, normalizeLocations, normalizeUrl, parseExperience } from '../lib/taxonomy.js';
import { buildSearchLinks } from '../sources/adapters.js';
import { careerLinks } from '../sources/catalog.js';
import { toNormalized, type NormalizedJob, type RawJob } from '../sources/types.js';
import { loadMatchProfile, recordRun } from './jobs.js';
import { scoreJob, type MatchProfile, type MatchResult } from './matching.js';
import { runProviders, type ProviderRun } from './providerRunner.js';

export const CACHE_TTL_MS = 15 * 60_000;

export interface Candidate {
  job: NormalizedJob;
  raw: RawJob;
}

export interface RankedJob extends NormalizedJob {
  score: number;
  match: MatchResult;
  titleSimilarity: number;
  /** Skills from the user's profile that this job asks for. */
  why: string[];
  /** Skills the job asks for that the profile does not list. */
  missing: string[];
  reasons: string[];
}

// ---------------- merge / dedupe ----------------

const norm = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
export const dedupeKey = (j: NormalizedJob) => normalizeUrl(j.url) ?? `${norm(j.company)}|${norm(j.title)}|${norm(j.location)}`;

/** De-duplicate by canonical URL, else by normalised company + title + location. First occurrence wins. */
export function dedupe(cands: Candidate[]): Candidate[] {
  const seenUrl = new Set<string>();
  const seenFp = new Set<string>();
  const out: Candidate[] = [];
  for (const c of cands) {
    const url = normalizeUrl(c.job.url);
    const fp = `${norm(c.job.company)}|${norm(c.job.title)}|${norm(c.job.location)}`;
    if ((url && seenUrl.has(url)) || seenFp.has(fp)) continue;
    if (url) seenUrl.add(url);
    seenFp.add(fp);
    out.push(c);
  }
  return out;
}

export function toCandidates(runs: ProviderRun[], fetchedAt = new Date()): Candidate[] {
  return runs.flatMap((r) => r.jobs.map((raw) => ({ raw, job: toNormalized(raw, r.source, `${r.source}:${raw.externalId}`, fetchedAt) })));
}

export function filterCandidates(cands: Candidate[], roles: string[], location: string): Candidate[] {
  const loc = parseLocation(location);
  // Role names go through matchesRoleFamily as-is so "IT" and family names ("Backend Development") work.
  return cands.filter((c) => matchesRoleFamily(c.job.title, roles) && matchesLocation(c.job, loc));
}

// ---------------- ranking ----------------

const tokens = (s: string) => new Set(norm(s).split(' ').filter((w) => w.length > 1 && !['and', 'the', 'for', 'of', 'in', 'ii', 'iii', 'sr', 'senior', 'lead'].includes(w)));

/** Best Jaccard similarity between the job title and any of the requested roles (0..1). */
export function titleSimilarity(title: string, roles: string[]): number {
  const t = tokens(title);
  let best = 0;
  for (const r of roles) {
    const q = tokens(r);
    if (!q.size || !t.size) continue;
    const inter = [...q].filter((w) => t.has(w)).length;
    best = Math.max(best, inter / new Set([...q, ...t]).size, inter === q.size ? 0.8 : 0);
  }
  return Math.round(best * 100) / 100;
}

/**
 * Score = 85% profile compatibility (skills 40 / experience 25 / industry 20 / location 15, see matching.ts)
 * + 15 points of title similarity. Matched / missing skills come only from the job text and the user's own
 * profile – nothing is invented.
 */
export function rankCandidates(cands: Candidate[], profile: MatchProfile, roles: string[], top: number): RankedJob[] {
  const ranked = cands.map(({ job, raw }) => {
    const text = `${raw.title}\n${raw.description}`;
    const exp = raw.expMin != null || raw.expMax != null ? { min: raw.expMin ?? null, max: raw.expMax ?? null } : parseExperience(text);
    const match = scoreJob(profile, {
      title: raw.title,
      company: raw.company,
      description: raw.description,
      skills: extractSkills(text),
      roles: classifyRoles(raw.title, raw.description),
      exp_min: exp.min,
      exp_max: exp.max,
      industry: inferIndustry(raw.company, text),
      location_tags: normalizeLocations(raw.location, raw.isRemote),
    });
    const sim = titleSimilarity(raw.title, roles);
    return {
      ...job,
      score: Math.round(match.score * 0.85 + sim * 15),
      match,
      titleSimilarity: sim,
      why: match.matchingSkills,
      missing: match.missingSkills,
      reasons: match.reasons,
    };
  });
  ranked.sort((a, b) => b.score - a.score || (b.posted_date ?? '').localeCompare(a.posted_date ?? ''));
  return ranked.slice(0, top);
}

// ---------------- service ----------------

export interface DiscoverParams {
  roles: string[];
  location: string;
  top: number;
}

const cache = new Map<string, { at: number; value: unknown }>();
export const clearDiscoveryCache = () => cache.clear();

export async function discoverJobs(db: Db, userId: string, p: DiscoverParams, deps: { run?: typeof runProviders; now?: () => number } = {}) {
  const now = deps.now ?? Date.now;
  const key = `${userId}|${p.roles.map((r) => r.toLowerCase()).sort().join(',')}|${p.location.toLowerCase()}|${p.top}`;
  const hit = cache.get(key);
  if (hit && now() - hit.at < CACHE_TTL_MS) return { ...(hit.value as object), cached: true };

  const runs = await (deps.run ?? runProviders)(db, { roles: p.roles, location: p.location });
  const fetchedAt = new Date(now());
  const all = toCandidates(runs, fetchedAt);
  const unique = dedupe(all);
  const filtered = filterCandidates(unique, p.roles, p.location);

  // Store matches so they show up in Find Jobs, Saved and daily alerts (re-uses ingest de-duplication).
  const bySource = new Map<string, RawJob[]>();
  for (const c of filtered) bySource.set(c.job.source, [...(bySource.get(c.job.source) ?? []), c.raw]);
  for (const run of runs) {
    if (run.status === 'skipped') continue;
    await recordRun(db, { ...run, jobs: bySource.get(run.source) ?? [], cached: true });
  }

  const profile = await loadMatchProfile(db, userId);
  const jobs = rankCandidates(filtered, profile, p.roles, p.top);
  const city = p.location.split(/[,;|]/)[0]?.trim() || 'India';
  const value = {
    roles: p.roles,
    location: p.location,
    fetchedAt: fetchedAt.toISOString(),
    counts: { fetched: all.length, unique: unique.length, matched: filtered.length, returned: jobs.length },
    sources: runs.map((r) => ({ source: r.source, status: r.status, detail: r.detail ?? null, fetched: r.jobs.length, ms: r.ms ?? null, cached: !!r.cached })),
    jobs,
    // Boards and companies without a permitted API: deep links only, opened in the user's browser.
    deepLinks: {
      boards: buildSearchLinks({ keywords: p.roles[0] ?? 'QA Engineer', location: city }),
      companies: careerLinks(p.roles[0] ?? 'QA Engineer', city),
    },
  };
  cache.set(key, { at: now(), value });
  return { ...value, cached: false };
}
