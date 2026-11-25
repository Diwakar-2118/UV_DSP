import { parseLocation } from '../../lib/roleFamilies.js';
import { catalogFor } from '../catalog.js';
import { fetchJson } from '../http.js';
import { type JobSourceAdapter, type RawJob } from '../types.js';
import { preFilter } from './greenhouse.js';
import { htmlToText, toDate } from './util.js';

const API = 'https://api.smartrecruiters.com/v1/companies';
const srLocation = (j: any) => [j.location?.city, j.location?.region, j.location?.country === 'in' ? 'India' : j.location?.country?.toUpperCase()].filter(Boolean).join(', ');

/** Parse SmartRecruiters posting documents (list items or full postings with jobAd sections). */
export function parseSmartRecruiters(postings: any[], companyId: string): RawJob[] {
  return postings.map((j) => {
    const loc = srLocation(j);
    const s = j.jobAd?.sections ?? {};
    const description = [s.jobDescription?.text, s.qualifications?.text, s.additionalInformation?.text].filter(Boolean).map(htmlToText).join('\n\n');
    const company = j.company?.name ?? companyId;
    return {
      externalId: `${companyId}:${j.id}`,
      title: String(j.name ?? '').trim(),
      company,
      location: j.location?.remote ? `Remote (${loc})` : loc,
      isRemote: !!j.location?.remote,
      country: j.location?.country ? String(j.location.country).toUpperCase() : null,
      description,
      postedAt: toDate(j.releasedDate),
      applyUrl: j.postingUrl ?? `https://jobs.smartrecruiters.com/${companyId}/${j.id}`,
      sourceSite: `${company} careers`,
      jobType: j.typeOfEmployment?.label ?? null,
    };
  });
}

export const smartrecruiters: JobSourceAdapter = {
  id: 'smartrecruiters',
  name: 'Company career pages (SmartRecruiters)',
  kind: 'career_page',
  website: 'https://jobs.smartrecruiters.com',
  description: 'Official public Posting API (no key) for company career pages on SmartRecruiters – Bosch, Experian and more.',
  terms: 'Public Posting API for listing a company\'s openings. Link to postingUrl to apply.',
  requiresCredentials: false,
  isLive: true,
  unavailableReason: () => (catalogFor('smartrecruiters').length ? null : 'No companies in the company catalog'),
  async fetch(ctx) {
    const out: RawJob[] = [];
    const errors: string[] = [];
    const country = parseLocation(ctx.location).country?.toLowerCase();
    await Promise.all(
      catalogFor('smartrecruiters').map(async (c) => {
        try {
          const base = `${API}/${encodeURIComponent(c.id!)}/postings`;
          const seen = new Map<string, any>();
          // One keyword search per role, filtered to the user's country when known.
          for (const role of ctx.roles.length ? ctx.roles : ['QA']) {
            const qs = new URLSearchParams({ q: role, limit: '100', ...(country ? { country } : {}) });
            const page = await fetchJson<{ content: any[] }>(`${base}?${qs}`, { signal: ctx.signal });
            for (const j of page.content ?? []) seen.set(j.id, j);
          }
          const wanted = preFilter([...seen.values()], ctx, (j) => j.name ?? '', srLocation, (j) => !!j.location?.remote);
          const full = await Promise.all(wanted.map((j) => fetchJson<any>(`${base}/${j.id}`, { signal: ctx.signal }).catch(() => j)));
          out.push(...parseSmartRecruiters(full, c.id!));
        } catch (e) {
          errors.push(`${c.id}: ${(e as Error).message}`);
        }
      }),
    );
    if (errors.length && !out.length) throw new Error(errors.slice(0, 3).join('; '));
    return out;
  },
};
