import { matchesLocation, matchesRoleFamily, parseLocation } from '../../lib/roleFamilies.js';
import { catalogFor } from '../catalog.js';
import { fetchJson } from '../http.js';
import { inferCountry, type FetchContext, type JobSourceAdapter, type RawJob } from '../types.js';
import { htmlToText, toDate } from './util.js';

const API = 'https://boards-api.greenhouse.io/v1/boards';

export const cleanCompany = (name: string) =>
  name.replace(/\s+(software\s+)?private\s+limited$/i, '').replace(/\s+(job board|careers?|jobs)$/i, '').trim();

/** Parse Greenhouse job objects (list items or full job documents with `content`). */
export function parseGreenhouse(jobs: any[], board: string, companyName?: string): RawJob[] {
  return jobs.map((j) => {
    const loc: string = j.location?.name ?? '';
    const remoteMeta = (j.metadata ?? []).find((m: any) => /remote/i.test(m.name ?? ''))?.value === true;
    return {
      externalId: `${board}:${j.id}`,
      title: String(j.title ?? '').trim(),
      company: cleanCompany(companyName ?? j.company_name ?? board),
      location: loc,
      isRemote: remoteMeta || /remote/i.test(loc),
      country: inferCountry(loc),
      description: htmlToText(j.content),
      postedAt: toDate(j.first_published ?? j.updated_at),
      applyUrl: j.absolute_url ?? null,
      sourceSite: `${cleanCompany(companyName ?? j.company_name ?? board)} careers`,
    };
  });
}

/** Keeps list items whose title is in the role family and whose location fits, before fetching full content. */
export function preFilter<T>(items: T[], ctx: FetchContext, title: (t: T) => string, location: (t: T) => string, remote: (t: T) => boolean = () => false) {
  const q = parseLocation(ctx.location);
  return items.filter((i) => {
    const loc = location(i);
    return matchesRoleFamily(title(i), ctx.roles) && matchesLocation({ location: loc, remote: remote(i) || /remote/i.test(loc), country: inferCountry(loc) }, q);
  });
}

export const greenhouse: JobSourceAdapter = {
  id: 'greenhouse',
  name: 'Company career pages (Greenhouse)',
  kind: 'career_page',
  website: 'https://boards.greenhouse.io',
  description: 'Official public Job Board API (no key) for company career pages on Greenhouse – HackerRank, Netskope, HighRadius, Rubrik, Zscaler, Okta, Databricks and more.',
  terms: 'Public Job Board API intended for displaying a company\'s openings. Link to the original posting (absolute_url) to apply.',
  requiresCredentials: false,
  isLive: true,
  unavailableReason: () => (catalogFor('greenhouse').length ? null : 'No boards in the company catalog'),
  async fetch(ctx) {
    const out: RawJob[] = [];
    const errors: string[] = [];
    await Promise.all(
      catalogFor('greenhouse').map(async (c) => {
        try {
          // The list endpoint omits descriptions; fetch full content only for roles that match.
          // (Cheaper and politer than ?content=true, which returns every description on large boards.)
          const list = await fetchJson<{ jobs: any[] }>(`${API}/${encodeURIComponent(c.id!)}/jobs`, { signal: ctx.signal });
          const wanted = preFilter(list.jobs, ctx, (j) => j.title ?? '', (j) => j.location?.name ?? '');
          const full = await Promise.all(wanted.map((j) => fetchJson<any>(`${API}/${encodeURIComponent(c.id!)}/jobs/${j.id}`, { signal: ctx.signal }).catch(() => j)));
          out.push(...parseGreenhouse(full, c.id!, c.company));
        } catch (e) {
          errors.push(`${c.id}: ${(e as Error).message}`);
        }
      }),
    );
    if (errors.length && !out.length) throw new Error(errors.slice(0, 3).join('; '));
    return out;
  },
};
