import { config } from '../../config.js';
import { parseLocation, queryTerms } from '../../lib/roleFamilies.js';
import { fetchJson } from '../http.js';
import { type JobSourceAdapter, type RawJob } from '../types.js';
import { htmlToText, toDate } from './util.js';

const SUPPORTED = new Set(['in', 'gb', 'us', 'de', 'fr', 'au', 'ca', 'nl', 'sg', 'za', 'nz', 'pl', 'br', 'at', 'it', 'es', 'mx', 'be', 'ch']);

export function parseAdzuna(data: { results?: any[] }, country = 'in'): RawJob[] {
  return (data.results ?? []).map((j) => ({
    externalId: String(j.id),
    title: htmlToText(j.title),
    company: j.company?.display_name ?? 'Unknown company',
    location: j.location?.display_name ?? '',
    isRemote: /remote|work from home/i.test(`${j.title} ${j.location?.display_name ?? ''}`),
    country: country.toUpperCase(),
    description: htmlToText(j.description),
    postedAt: toDate(j.created),
    applyUrl: j.redirect_url ?? null,
    sourceSite: 'Adzuna',
    salaryMinLpa: country === 'in' && j.salary_min ? Math.round(j.salary_min / 1000) / 100 : null,
    salaryMaxLpa: country === 'in' && j.salary_max ? Math.round(j.salary_max / 1000) / 100 : null,
    jobType: j.contract_time ? String(j.contract_time).replace(/_/g, ' ') : null,
  }));
}

export const adzuna: JobSourceAdapter = {
  id: 'adzuna',
  name: 'Adzuna',
  kind: 'api',
  website: 'https://developer.adzuna.com',
  description: 'Official Adzuna job search API. Optional: needs a free ADZUNA_APP_ID and ADZUNA_APP_KEY.',
  terms: 'Free developer tier with daily call limits; attribution to Adzuna required; link to redirect_url.',
  requiresCredentials: true,
  isLive: true,
  minIntervalMinutes: 60,
  unavailableReason: () => (config.sources.adzunaAppId && config.sources.adzunaAppKey ? null : 'Missing ADZUNA_APP_ID / ADZUNA_APP_KEY'),
  async fetch(ctx) {
    const loc = parseLocation(ctx.location);
    const country = (loc.country ?? 'IN').toLowerCase();
    if (!SUPPORTED.has(country)) return [];
    const where = ctx.location.split(/[,;|]/).map((s) => s.trim()).find((s) => s && !/^(remote|india|anywhere)$/i.test(s)) ?? '';
    const out: RawJob[] = [];
    for (const what of (ctx.roles.length ? queryTerms(ctx.roles) : ['Software Engineer']).slice(0, 4)) {
      const qs = new URLSearchParams({ app_id: config.sources.adzunaAppId, app_key: config.sources.adzunaAppKey, what, results_per_page: '50', max_days_old: '30', ...(where ? { where } : {}) });
      out.push(...parseAdzuna(await fetchJson(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${qs}`, { signal: ctx.signal }), country));
    }
    return out;
  },
};
