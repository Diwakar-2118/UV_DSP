import { config } from '../../config.js';
import { fetchJson } from '../http.js';
import { inferCountry, type JobSourceAdapter, type RawJob } from '../types.js';
import { toDate } from './util.js';

export function parseJSearch(data: { data?: any[] }): RawJob[] {
  return (data.data ?? []).map((j) => {
    const months: number | null = j.job_required_experience?.required_experience_in_months ?? null;
    const loc = [j.job_city, j.job_state, j.job_country].filter(Boolean).join(', ') || (j.job_is_remote ? 'Remote' : '');
    return {
      externalId: String(j.job_id),
      title: j.job_title,
      company: j.employer_name,
      location: loc,
      isRemote: !!j.job_is_remote,
      country: j.job_country ?? inferCountry(loc),
      description: j.job_description ?? '',
      postedAt: toDate(j.job_posted_at_datetime_utc),
      applyUrl: j.job_apply_link ?? null,
      sourceSite: j.job_publisher ?? 'JSearch',
      salaryMinLpa: j.job_min_salary && j.job_salary_period === 'YEAR' ? Math.round(j.job_min_salary / 1000) / 100 : null,
      salaryMaxLpa: j.job_max_salary && j.job_salary_period === 'YEAR' ? Math.round(j.job_max_salary / 1000) / 100 : null,
      jobType: j.job_employment_type ?? null,
      expMin: months ? Math.floor(months / 12) : null,
    };
  });
}

export const jsearch: JobSourceAdapter = {
  id: 'jsearch',
  name: 'JSearch (Google for Jobs)',
  kind: 'api',
  website: 'https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch',
  description: 'Licensed aggregator API over Google for Jobs listings. Optional: needs a JSEARCH_API_KEY (RapidAPI).',
  terms: 'RapidAPI subscription terms; free tier has a small monthly quota. Link to job_apply_link.',
  requiresCredentials: true,
  isLive: true,
  minIntervalMinutes: 360,
  unavailableReason: () => (config.sources.jsearchApiKey ? null : 'Missing JSEARCH_API_KEY'),
  async fetch(ctx) {
    const out: RawJob[] = [];
    for (const role of (ctx.roles.length ? ctx.roles : ['QA Engineer']).slice(0, 3)) {
      const qs = new URLSearchParams({ query: `${role} in ${ctx.location || 'India'}`, page: '1', num_pages: '1', date_posted: 'month' });
      const data = await fetchJson(`https://jsearch.p.rapidapi.com/search?${qs}`, {
        headers: { 'X-RapidAPI-Key': config.sources.jsearchApiKey, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' },
        signal: ctx.signal,
      });
      out.push(...parseJSearch(data));
    }
    return out;
  },
};
