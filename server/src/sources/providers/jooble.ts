import { queryTerms } from '../../lib/roleFamilies.js';
import { fetchJson } from '../http.js';
import { inferCountry, type JobSourceAdapter, type RawJob } from '../types.js';
import { htmlToText, toDate } from './util.js';

const key = () => process.env.JOOBLE_API_KEY ?? '';

export function parseJooble(data: { jobs?: any[] }): RawJob[] {
  return (data.jobs ?? []).map((j) => ({
    externalId: String(j.id),
    title: htmlToText(j.title),
    company: j.company || 'Unknown company',
    location: j.location ?? '',
    isRemote: /remote|work from home/i.test(`${j.title} ${j.location ?? ''}`),
    country: inferCountry(j.location ?? ''),
    description: htmlToText(j.snippet),
    postedAt: toDate(j.updated),
    applyUrl: j.link ?? null,
    sourceSite: j.source ? `Jooble (${j.source})` : 'Jooble',
    salaryText: j.salary || null,
    jobType: j.type || null,
  }));
}

export const jooble: JobSourceAdapter = {
  id: 'jooble',
  name: 'Jooble',
  kind: 'api',
  website: 'https://jooble.org/api/about',
  description: 'Official Jooble REST API (job aggregator). Optional: needs a free JOOBLE_API_KEY.',
  terms: 'Free API key on request; attribute Jooble and link to the job URL it returns.',
  requiresCredentials: true,
  isLive: true,
  minIntervalMinutes: 60,
  unavailableReason: () => (key() ? null : 'Missing JOOBLE_API_KEY'),
  async fetch(ctx) {
    const out: RawJob[] = [];
    for (const keywords of (ctx.roles.length ? queryTerms(ctx.roles) : ['Software Engineer']).slice(0, 4)) {
      const data = await fetchJson(`https://jooble.org/api/${encodeURIComponent(key())}`, { json: { keywords, location: ctx.location }, signal: ctx.signal });
      out.push(...parseJooble(data));
    }
    return out;
  },
};
