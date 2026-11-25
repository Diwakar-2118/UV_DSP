import { catalogFor } from '../catalog.js';
import { fetchJson } from '../http.js';
import { inferCountry, type JobSourceAdapter, type RawJob } from '../types.js';
import { preFilter } from './greenhouse.js';
import { htmlToText, toDate } from './util.js';

export function parseLever(postings: any[], slug: string, companyName?: string): RawJob[] {
  const company = companyName ?? slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return postings.map((j) => {
    const loc: string = j.categories?.allLocations?.join(' / ') || j.categories?.location || '';
    const lists = (j.lists ?? []).map((l: any) => `${l.text}\n${htmlToText(l.content)}`).join('\n');
    return {
      externalId: `${slug}:${j.id}`,
      title: String(j.text ?? '').trim(),
      company,
      location: loc,
      isRemote: j.workplaceType === 'remote' || /remote/i.test(loc),
      country: j.country ?? inferCountry(loc),
      description: [j.descriptionPlain, lists, j.additionalPlain].filter(Boolean).join('\n\n'),
      postedAt: toDate(j.createdAt),
      applyUrl: j.hostedUrl ?? null,
      sourceSite: `${company} careers`,
      jobType: j.categories?.commitment ?? null,
      salaryText: j.salaryRange ? `${j.salaryRange.min}–${j.salaryRange.max} ${j.salaryRange.currency} ${j.salaryRange.interval ?? ''}`.trim() : null,
    };
  });
}

export const lever: JobSourceAdapter = {
  id: 'lever',
  name: 'Company career pages (Lever)',
  kind: 'career_page',
  website: 'https://jobs.lever.co',
  description: 'Official public Postings API (no key) for company career pages on Lever – Paytm, Meesho, Zeta, CRED and more.',
  terms: 'Public Postings API for listing a company\'s openings. Link to hostedUrl to apply.',
  requiresCredentials: false,
  isLive: true,
  unavailableReason: () => (catalogFor('lever').length ? null : 'No companies in the company catalog'),
  async fetch(ctx) {
    const out: RawJob[] = [];
    const errors: string[] = [];
    await Promise.all(
      catalogFor('lever').map(async (c) => {
        try {
          const data = await fetchJson<any[]>(`https://api.lever.co/v0/postings/${encodeURIComponent(c.id!)}?mode=json`, { signal: ctx.signal });
          const wanted = preFilter(data, ctx, (j) => j.text ?? '', (j) => j.categories?.allLocations?.join(' / ') || j.categories?.location || '', (j) => j.workplaceType === 'remote');
          out.push(...parseLever(wanted, c.id!, c.company));
        } catch (e) {
          errors.push(`${c.id}: ${(e as Error).message}`);
        }
      }),
    );
    if (errors.length && !out.length) throw new Error(errors.slice(0, 3).join('; '));
    return out;
  },
};
