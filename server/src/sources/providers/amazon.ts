import { parseLocation, queryTerms } from '../../lib/roleFamilies.js';
import { fetchJson } from '../http.js';
import { type JobSourceAdapter, type RawJob } from '../types.js';
import { htmlToText, toDate } from './util.js';

const ISO3_TO_2: Record<string, string> = { IND: 'IN', USA: 'US', GBR: 'GB', DEU: 'DE', CAN: 'CA', IRL: 'IE', JPN: 'JP' };

export function parseAmazon(data: { jobs?: any[] }): RawJob[] {
  return (data.jobs ?? []).map((j) => {
    const description = [htmlToText(j.description), j.basic_qualifications && `Basic qualifications\n${htmlToText(j.basic_qualifications)}`, j.preferred_qualifications && `Preferred qualifications\n${htmlToText(j.preferred_qualifications)}`]
      .filter(Boolean)
      .join('\n\n');
    return {
      externalId: String(j.id_icims ?? j.id),
      title: String(j.title ?? '').trim(),
      company: 'Amazon',
      location: j.normalized_location ?? j.location ?? '',
      isRemote: /virtual|remote/i.test(`${j.normalized_location ?? ''} ${j.location ?? ''}`),
      country: ISO3_TO_2[j.country_code] ?? null,
      description,
      postedAt: toDate(j.posted_date),
      applyUrl: j.job_path ? `https://www.amazon.jobs${j.job_path}` : null,
      sourceSite: 'Amazon Jobs',
      jobType: j.job_schedule_type ?? null,
    };
  });
}

export const amazon: JobSourceAdapter = {
  id: 'amazon',
  name: 'Amazon Jobs',
  kind: 'career_page',
  website: 'https://www.amazon.jobs',
  description: 'Amazon\'s public job search (no key), filtered to your city/country – includes Amazon Hyderabad and Bengaluru QA roles.',
  terms: 'Public search endpoint behind amazon.jobs. Low request volume; every job links to its amazon.jobs page to apply.',
  requiresCredentials: false,
  isLive: true,
  unavailableReason: () => null,
  async fetch(ctx) {
    const q = parseLocation(ctx.location);
    const cities = ctx.location
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter((s) => s && !/^(remote|india|anywhere|wfh)$/i.test(s))
      .map((s) => s.replace(/^bangalore$/i, 'Bengaluru'))
      .slice(0, 3);
    const out = new Map<string, RawJob>();
    for (const role of (ctx.roles.length ? queryTerms(ctx.roles) : ['Software Engineer']).slice(0, 4)) {
      const qs = new URLSearchParams({ base_query: role, result_limit: '50', sort: 'recent' });
      if (q.country === 'IN') qs.append('normalized_country_code[]', 'IND');
      for (const c of cities) qs.append('normalized_city_name[]', c);
      if (!q.country && !cities.length && ctx.location) qs.set('loc_query', ctx.location);
      const data = await fetchJson<{ jobs: any[] }>(`https://www.amazon.jobs/en/search.json?${qs}`, { signal: ctx.signal });
      for (const j of parseAmazon(data)) out.set(j.externalId, j);
    }
    return [...out.values()];
  },
};
