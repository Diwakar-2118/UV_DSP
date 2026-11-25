import { parseLocation } from '../../lib/roleFamilies.js';
import { workdayCatalog, type CatalogEntry } from '../catalog.js';
import { fetchJson } from '../http.js';
import { inferCountry, type JobSourceAdapter, type RawJob } from '../types.js';
import { preFilter } from './greenhouse.js';
import { htmlToText, parseRelativePosted, primaryRole } from './util.js';

const host = (w: NonNullable<CatalogEntry['workday']>) => `https://${w.tenant}.wd${w.wd}.myworkdayjobs.com`;
const MAX_DETAILS_PER_COMPANY = 6;

/** Parse a Workday career-site search response, optionally merged with job details keyed by externalPath. */
export function parseWorkday(data: { jobPostings?: any[] }, entry: CatalogEntry, details: Record<string, any> = {}, now = new Date()): RawJob[] {
  const w = entry.workday!;
  return (data.jobPostings ?? []).map((j) => {
    const info = details[j.externalPath]?.jobPostingInfo ?? {};
    const loc: string = info.location ?? j.locationsText ?? '';
    return {
      externalId: `${w.tenant}:${j.bulletFields?.[0] ?? j.externalPath}`,
      title: String(j.title ?? info.title ?? '').trim(),
      company: details[j.externalPath]?.hiringOrganization?.name ?? entry.company,
      location: loc,
      isRemote: /remote/i.test(`${loc} ${j.remoteType ?? ''}`),
      country: info.country?.descriptor ? inferCountry(info.country.descriptor) : inferCountry(loc),
      description: htmlToText(info.jobDescription),
      postedAt: info.startDate ? new Date(info.startDate) : parseRelativePosted(j.postedOn, now),
      applyUrl: info.externalUrl ?? `${host(w)}/en-US/${w.site}${j.externalPath}`,
      sourceSite: `${entry.company} careers`,
      jobType: info.timeType ?? null,
    };
  });
}

export const workday: JobSourceAdapter = {
  id: 'workday',
  name: 'Company career pages (Workday)',
  kind: 'career_page',
  website: 'https://www.workday.com',
  description: 'Public career-site search endpoint of companies on Workday (no key) – Salesforce, Thomson Reuters, State Street, Novartis, Amgen and more. Called one request at a time.',
  terms: 'The JSON endpoint behind each company\'s public career site. Rate-limited: requests are sequential with a delay; jobs link to the company\'s own posting.',
  requiresCredentials: false,
  isLive: true,
  unavailableReason: () => (workdayCatalog().length ? null : 'No Workday sites in the company catalog'),
  async fetch(ctx) {
    const out: RawJob[] = [];
    const errors: string[] = [];
    const q = parseLocation(ctx.location);
    // Narrow by city in the search text only when exactly one city was asked for; otherwise filter afterwards.
    const city = q.cities.length === 1 ? ctx.location.split(/[,;|]/).map((s) => s.trim()).find((s) => s && !/^(remote|india)$/i.test(s)) : undefined;
    const searchText = `${primaryRole(ctx.roles)}${city ? ` ${city}` : ''}`;
    // Sequential: Workday rate-limits per client across tenants (http.ts also enforces 1 at a time).
    for (const entry of workdayCatalog()) {
      if (ctx.signal?.aborted) break;
      const w = entry.workday!;
      try {
        const data = await fetchJson<{ jobPostings: any[] }>(`${host(w)}/wday/cxs/${w.tenant}/${w.site}/jobs`, {
          json: { appliedFacets: {}, limit: 20, offset: 0, searchText },
          signal: ctx.signal,
        });
        const wanted = preFilter(data.jobPostings ?? [], ctx, (j) => j.title ?? '', (j) => j.locationsText ?? '');
        const details: Record<string, any> = {};
        for (const j of wanted.slice(0, MAX_DETAILS_PER_COMPANY)) {
          if (ctx.signal?.aborted) break;
          details[j.externalPath] = await fetchJson(`${host(w)}/wday/cxs/${w.tenant}/${w.site}${j.externalPath}`, { signal: ctx.signal }).catch(() => undefined);
        }
        out.push(...parseWorkday({ jobPostings: wanted }, entry, details));
      } catch (e) {
        errors.push(`${w.tenant}: ${(e as Error).message}`);
      }
    }
    if (errors.length && !out.length) throw new Error(errors.slice(0, 3).join('; '));
    return out;
  },
};
