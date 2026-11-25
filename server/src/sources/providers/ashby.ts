import { catalogFor } from '../catalog.js';
import { fetchJson } from '../http.js';
import { inferCountry, type JobSourceAdapter, type RawJob } from '../types.js';
import { preFilter } from './greenhouse.js';
import { toDate } from './util.js';

const ashbyLocation = (j: any) =>
  [j.location, ...(j.secondaryLocations ?? []).map((s: any) => s.location ?? s)].filter((x) => typeof x === 'string' && x).join(' / ');

export function parseAshby(data: { jobs?: any[] }, org: string, companyName?: string): RawJob[] {
  const company = companyName ?? org;
  return (data.jobs ?? [])
    .filter((j) => j.isListed !== false)
    .map((j) => {
      const loc = ashbyLocation(j);
      const country = j.address?.postalAddress?.addressCountry ?? '';
      return {
        externalId: `${org}:${j.id}`,
        title: String(j.title ?? '').trim(),
        company,
        location: loc,
        isRemote: !!j.isRemote || j.workplaceType === 'Remote',
        country: inferCountry(`${loc}, ${country}`),
        description: j.descriptionPlain ?? '',
        postedAt: toDate(j.publishedAt),
        applyUrl: j.jobUrl ?? j.applyUrl ?? null,
        sourceSite: `${company} careers`,
        jobType: j.employmentType ?? null,
        salaryText: j.compensation?.compensationTierSummary ?? j.compensation?.scrapeableCompensationSalarySummary ?? null,
      };
    });
}

export const ashby: JobSourceAdapter = {
  id: 'ashby',
  name: 'Company career pages (Ashby)',
  kind: 'career_page',
  website: 'https://jobs.ashbyhq.com',
  description: 'Official public Job Postings API (no key) for company career pages on Ashby.',
  terms: 'Public posting API for embedding a company\'s job board. Link to jobUrl to apply.',
  requiresCredentials: false,
  isLive: true,
  unavailableReason: () => (catalogFor('ashby').length ? null : 'No organisations in the company catalog'),
  async fetch(ctx) {
    const out: RawJob[] = [];
    const errors: string[] = [];
    await Promise.all(
      catalogFor('ashby').map(async (c) => {
        try {
          const data = await fetchJson<{ jobs: any[] }>(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(c.id!)}?includeCompensation=true`, { signal: ctx.signal });
          const wanted = preFilter(data.jobs ?? [], ctx, (j) => j.title ?? '', ashbyLocation, (j) => !!j.isRemote);
          out.push(...parseAshby({ jobs: wanted }, c.id!, c.company));
        } catch (e) {
          errors.push(`${c.id}: ${(e as Error).message}`);
        }
      }),
    );
    if (errors.length && !out.length) throw new Error(errors.slice(0, 3).join('; '));
    return out;
  },
};
