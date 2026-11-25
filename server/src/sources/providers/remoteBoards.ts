/**
 * Keyless remote-job boards: Remotive, Arbeitnow, Himalayas, Jobicy.
 * Each is a separate provider; they share this module because each is only a parser plus one GET.
 */
import { fetchJson } from '../http.js';
import { inferCountry, type JobSourceAdapter, type RawJob } from '../types.js';
import { htmlToText, primaryRole, toDate } from './util.js';

const OPEN_WORLDWIDE = /worldwide|anywhere|global/i;

// ---------------- Remotive ----------------
export function parseRemotive(data: { jobs?: any[] }): RawJob[] {
  return (data.jobs ?? []).map((j) => {
    const where: string = j.candidate_required_location || 'Worldwide';
    return {
      externalId: String(j.id),
      title: j.title,
      company: j.company_name,
      location: `Remote (${where})`,
      isRemote: true,
      country: OPEN_WORLDWIDE.test(where) ? null : inferCountry(where),
      description: htmlToText(j.description),
      postedAt: toDate(j.publication_date),
      applyUrl: j.url,
      sourceSite: 'Remotive',
      salaryText: j.salary || null,
      jobType: j.job_type ? String(j.job_type).replace(/_/g, ' ') : null,
    };
  });
}

export const remotive: JobSourceAdapter = {
  id: 'remotive',
  name: 'Remotive',
  kind: 'api',
  website: 'https://remotive.com/api-documentation',
  description: 'Public remote-jobs API. Off by default: its terms forbid showing its jobs behind a sign-up, and this app requires a login.',
  terms: 'Link back to Remotive and name it as the source; max ~4 requests/day; not to be used to collect sign-ups. Jobs are delayed 24 h.',
  requiresCredentials: false,
  isLive: true,
  defaultEnabled: false,
  minIntervalMinutes: 360,
  unavailableReason: () => null,
  async fetch(ctx) {
    return parseRemotive(await fetchJson(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(primaryRole(ctx.roles))}&limit=100`, { signal: ctx.signal }));
  },
};

// ---------------- Arbeitnow ----------------
export function parseArbeitnow(data: { data?: any[] }): RawJob[] {
  return (data.data ?? []).map((j) => ({
    externalId: String(j.slug),
    title: j.title,
    company: j.company_name,
    location: j.remote ? `Remote${j.location ? ` (${j.location})` : ''}` : j.location ?? '',
    isRemote: !!j.remote,
    country: inferCountry(j.location ?? '') ?? 'DE',
    description: htmlToText(j.description),
    postedAt: toDate(j.created_at),
    applyUrl: j.url,
    sourceSite: 'Arbeitnow',
    jobType: (j.job_types ?? []).join(', ') || null,
  }));
}

export const arbeitnow: JobSourceAdapter = {
  id: 'arbeitnow',
  name: 'Arbeitnow',
  kind: 'api',
  website: 'https://www.arbeitnow.com/api',
  description: 'Free public job-board API (mostly Europe, many remote roles). No key.',
  terms: 'Free public API; link to the Arbeitnow job URL.',
  requiresCredentials: false,
  isLive: true,
  minIntervalMinutes: 60,
  unavailableReason: () => null,
  async fetch(ctx) {
    return parseArbeitnow(await fetchJson('https://www.arbeitnow.com/api/job-board-api', { signal: ctx.signal }));
  },
};

// ---------------- Himalayas ----------------
export function parseHimalayas(data: { jobs?: any[] }): RawJob[] {
  return (data.jobs ?? []).map((j) => {
    const restrictions: string[] = j.locationRestrictions ?? [];
    const where = restrictions.length === 0 ? 'Worldwide' : restrictions.includes('India') ? 'India' : restrictions.slice(0, 4).join(', ') + (restrictions.length > 4 ? '…' : '');
    return {
      externalId: String(j.guid ?? j.applicationLink),
      title: j.title,
      company: j.companyName,
      location: `Remote (${where})`,
      isRemote: true,
      country: restrictions.includes('India') ? 'IN' : restrictions.length === 0 ? null : inferCountry(restrictions[0]),
      description: htmlToText(j.description ?? j.excerpt),
      postedAt: toDate(j.pubDate),
      applyUrl: j.applicationLink ?? j.guid ?? null,
      sourceSite: 'Himalayas',
      salaryText: j.minSalary || j.maxSalary ? `${j.minSalary ?? '?'}–${j.maxSalary ?? '?'} ${j.currency ?? ''} ${j.salaryPeriod ?? ''}`.trim() : null,
      jobType: j.employmentType ?? null,
    };
  });
}

export const himalayas: JobSourceAdapter = {
  id: 'himalayas',
  name: 'Himalayas',
  kind: 'api',
  website: 'https://himalayas.app/api',
  description: 'Free public remote-jobs API with location restrictions (only roles open to India are kept). No key.',
  terms: 'Free public API; credit Himalayas and link to the job page.',
  requiresCredentials: false,
  isLive: true,
  minIntervalMinutes: 60,
  unavailableReason: () => null,
  async fetch(ctx) {
    return parseHimalayas(await fetchJson(`https://himalayas.app/jobs/api/search?q=${encodeURIComponent(primaryRole(ctx.roles))}`, { signal: ctx.signal }));
  },
};

// ---------------- Jobicy ----------------
export function parseJobicy(data: { jobs?: any[] }): RawJob[] {
  return (data.jobs ?? []).map((j) => {
    const geo: string = j.jobGeo || 'Anywhere';
    return {
      externalId: String(j.id),
      title: htmlToText(j.jobTitle),
      company: j.companyName,
      location: `Remote (${geo})`,
      isRemote: true,
      country: OPEN_WORLDWIDE.test(geo) ? null : inferCountry(geo),
      description: htmlToText(j.jobDescription ?? j.jobExcerpt),
      postedAt: toDate(j.pubDate),
      applyUrl: j.url,
      sourceSite: 'Jobicy',
      salaryText: j.annualSalaryMin || j.annualSalaryMax ? `${j.annualSalaryMin ?? '?'}–${j.annualSalaryMax ?? '?'} ${j.salaryCurrency ?? ''}/yr`.trim() : null,
      jobType: (j.jobType ?? []).join(', ') || null,
    };
  });
}

export const jobicy: JobSourceAdapter = {
  id: 'jobicy',
  name: 'Jobicy',
  kind: 'api',
  website: 'https://jobicy.com/jobs-rss-feed',
  description: 'Free public remote-jobs API. No key.',
  terms: 'Credit Jobicy with a direct link; application buttons must go to the original job URL from the feed.',
  requiresCredentials: false,
  isLive: true,
  minIntervalMinutes: 60,
  unavailableReason: () => null,
  async fetch(ctx) {
    const tag = primaryRole(ctx.roles).toLowerCase().includes('qa') || /test|sdet/i.test(primaryRole(ctx.roles)) ? 'qa' : primaryRole(ctx.roles);
    return parseJobicy(await fetchJson(`https://jobicy.com/api/v2/remote-jobs?count=50&tag=${encodeURIComponent(tag)}`, { signal: ctx.signal }));
  },
};
