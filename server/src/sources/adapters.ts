import { config } from '../config.js';
import { stripHtml } from '../lib/taxonomy.js';
import { fetchJson, type JobSourceAdapter, type RawJob } from './types.js';
import { demoJobs } from './demo.js';

const decodeEntities = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

const SEARCH_TERMS = ['QA Engineer', 'Test Engineer', 'SDET', 'Performance Test Engineer', 'API Testing'];

/** Remotive – public remote-jobs API (https://remotive.com/api-documentation). Attribution: links back to Remotive. */
export const remotive: JobSourceAdapter = {
  id: 'remotive',
  name: 'Remotive',
  kind: 'api',
  website: 'https://remotive.com',
  description: 'Public remote-jobs API (QA category). Listings link back to Remotive as their terms require.',
  requiresCredentials: false,
  isLive: true,
  unavailableReason: () => null,
  async fetch() {
    const data = await fetchJson<{ jobs: any[] }>('https://remotive.com/api/remote-jobs?category=qa&limit=150');
    return data.jobs.map((j): RawJob => {
      const where: string = j.candidate_required_location || 'Worldwide';
      const openToIndia = /worldwide|anywhere|india|asia|apac|global/i.test(where);
      return {
        externalId: String(j.id),
        title: j.title,
        company: j.company_name,
        location: openToIndia ? `Remote (${where})` : `Remote – restricted to ${where}`,
        isRemote: openToIndia,
        description: stripHtml(j.description ?? ''),
        postedAt: j.publication_date ? new Date(j.publication_date) : null,
        applyUrl: j.url,
        sourceSite: 'Remotive',
        salaryText: j.salary || null,
        jobType: j.job_type ? String(j.job_type).replace(/_/g, ' ') : null,
      };
    });
  },
};

/** Greenhouse Job Board API – official public endpoint for company career pages. */
export const greenhouse: JobSourceAdapter = {
  id: 'greenhouse',
  name: 'Company career pages (Greenhouse)',
  kind: 'career_page',
  website: 'https://boards.greenhouse.io',
  description: 'Official public Job Board API for companies hosting careers on Greenhouse. Configure boards with GREENHOUSE_BOARDS.',
  requiresCredentials: false,
  isLive: true,
  unavailableReason: () => (config.sources.greenhouseBoards.length ? null : 'No boards configured (GREENHOUSE_BOARDS)'),
  async fetch() {
    const out: RawJob[] = [];
    const errors: string[] = [];
    for (const board of config.sources.greenhouseBoards) {
      try {
        const [meta, data] = await Promise.all([
          fetchJson<{ name: string }>(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}`).catch(() => ({ name: board })),
          fetchJson<{ jobs: any[] }>(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`),
        ]);
        const company = (meta.name || board).replace(/\s+(software\s+)?private\s+limited$/i, '').trim();
        for (const j of data.jobs) {
          const loc: string = j.location?.name ?? '';
          out.push({
            externalId: `${board}:${j.id}`,
            title: j.title,
            company,
            location: loc,
            isRemote: /remote/i.test(loc),
            description: stripHtml(decodeEntities(j.content ?? '')),
            postedAt: new Date(j.first_published ?? j.updated_at ?? Date.now()),
            applyUrl: j.absolute_url,
            sourceSite: `${company} careers`,
          });
        }
      } catch (e) {
        errors.push(`${board}: ${(e as Error).message}`);
      }
    }
    if (errors.length && out.length === 0) throw new Error(errors.join('; '));
    return out;
  },
};

/** Lever Postings API – official public endpoint for company career pages. */
export const lever: JobSourceAdapter = {
  id: 'lever',
  name: 'Company career pages (Lever)',
  kind: 'career_page',
  website: 'https://jobs.lever.co',
  description: 'Official public Postings API for companies hosting careers on Lever. Configure with LEVER_COMPANIES.',
  requiresCredentials: false,
  isLive: true,
  unavailableReason: () => (config.sources.leverCompanies.length ? null : 'No companies configured (LEVER_COMPANIES)'),
  async fetch() {
    const out: RawJob[] = [];
    for (const company of config.sources.leverCompanies) {
      const data = await fetchJson<any[]>(`https://api.lever.co/v0/postings/${encodeURIComponent(company)}?mode=json`);
      for (const j of data) {
        const loc: string = j.categories?.location ?? '';
        const lists = (j.lists ?? []).map((l: any) => `${l.text}\n${stripHtml(l.content ?? '')}`).join('\n');
        out.push({
          externalId: `${company}:${j.id}`,
          title: j.text,
          company: company.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          location: loc,
          isRemote: j.workplaceType === 'remote' || /remote/i.test(loc),
          description: [j.descriptionPlain, lists, j.additionalPlain].filter(Boolean).join('\n\n'),
          postedAt: j.createdAt ? new Date(j.createdAt) : null,
          applyUrl: j.hostedUrl,
          sourceSite: 'Lever',
          jobType: j.categories?.commitment ?? null,
        });
      }
    }
    return out;
  },
};

/** Adzuna – official job search API with India coverage (requires free app id/key). */
export const adzuna: JobSourceAdapter = {
  id: 'adzuna',
  name: 'Adzuna (India)',
  kind: 'api',
  website: 'https://www.adzuna.in',
  description: 'Official Adzuna Jobs API for India (Bengaluru & Hyderabad). Requires ADZUNA_APP_ID and ADZUNA_APP_KEY.',
  requiresCredentials: true,
  isLive: true,
  unavailableReason: () => (config.sources.adzunaAppId && config.sources.adzunaAppKey ? null : 'Missing ADZUNA_APP_ID / ADZUNA_APP_KEY'),
  async fetch() {
    const out: RawJob[] = [];
    for (const what of SEARCH_TERMS) {
      for (const where of ['Bangalore', 'Hyderabad']) {
        const qs = new URLSearchParams({
          app_id: config.sources.adzunaAppId,
          app_key: config.sources.adzunaAppKey,
          what,
          where,
          results_per_page: '50',
          max_days_old: '30',
        });
        const data = await fetchJson<{ results: any[] }>(`https://api.adzuna.com/v1/api/jobs/in/search/1?${qs}`);
        for (const j of data.results ?? []) {
          out.push({
            externalId: String(j.id),
            title: stripHtml(j.title ?? ''),
            company: j.company?.display_name ?? 'Unknown company',
            location: j.location?.display_name ?? where,
            description: stripHtml(j.description ?? ''),
            postedAt: j.created ? new Date(j.created) : null,
            applyUrl: j.redirect_url,
            sourceSite: 'Adzuna',
            salaryMinLpa: j.salary_min ? Math.round(j.salary_min / 1000) / 100 : null,
            salaryMaxLpa: j.salary_max ? Math.round(j.salary_max / 1000) / 100 : null,
            jobType: j.contract_time ? String(j.contract_time).replace(/_/g, ' ') : null,
          });
        }
      }
    }
    return out;
  },
};

/** JSearch (RapidAPI) – licensed aggregator of Google-for-Jobs listings incl. LinkedIn, Indeed, Naukri postings. */
export const jsearch: JobSourceAdapter = {
  id: 'jsearch',
  name: 'JSearch (LinkedIn / Indeed / Naukri via Google for Jobs)',
  kind: 'api',
  website: 'https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch',
  description: 'Authorised aggregator API returning listings published on LinkedIn, Indeed, Naukri and others. Requires JSEARCH_API_KEY.',
  requiresCredentials: true,
  isLive: true,
  unavailableReason: () => (config.sources.jsearchApiKey ? null : 'Missing JSEARCH_API_KEY'),
  async fetch() {
    const out: RawJob[] = [];
    const queries = ['QA engineer in Bengaluru', 'QA engineer in Hyderabad', 'Fintech QA engineer India', 'Automation test engineer in Bengaluru', 'Performance test engineer JMeter India', 'API testing engineer remote India'];
    for (const query of queries) {
      const qs = new URLSearchParams({ query, page: '1', num_pages: '1', date_posted: 'month', country: 'in' });
      const data = await fetchJson<{ data: any[] }>(`https://jsearch.p.rapidapi.com/search?${qs}`, {
        headers: { 'X-RapidAPI-Key': config.sources.jsearchApiKey, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' },
      });
      for (const j of data.data ?? []) {
        const req = j.job_required_experience ?? {};
        const months: number | null = req.required_experience_in_months ?? null;
        out.push({
          externalId: String(j.job_id),
          title: j.job_title,
          company: j.employer_name,
          location: [j.job_city, j.job_state, j.job_country].filter(Boolean).join(', ') || (j.job_is_remote ? 'Remote' : ''),
          isRemote: !!j.job_is_remote,
          description: j.job_description ?? '',
          postedAt: j.job_posted_at_datetime_utc ? new Date(j.job_posted_at_datetime_utc) : null,
          applyUrl: j.job_apply_link,
          sourceSite: j.job_publisher ?? 'JSearch',
          salaryMinLpa: j.job_min_salary && j.job_salary_period === 'YEAR' ? Math.round(j.job_min_salary / 1000) / 100 : null,
          salaryMaxLpa: j.job_max_salary && j.job_salary_period === 'YEAR' ? Math.round(j.job_max_salary / 1000) / 100 : null,
          jobType: j.job_employment_type ?? null,
          expMin: months ? Math.floor(months / 12) : null,
        });
      }
    }
    return out;
  },
};

export const demo: JobSourceAdapter = {
  id: 'demo',
  name: 'Demo data',
  kind: 'demo',
  website: '',
  description: 'Sample listings used only when no live source has returned jobs. Clearly labelled DEMO and never sent in alerts.',
  requiresCredentials: false,
  isLive: false,
  unavailableReason: () => (config.seedDemoJobs ? null : 'Disabled (SEED_DEMO_JOBS=false)'),
  fetch: async () => demoJobs(),
};

export const ADAPTERS: JobSourceAdapter[] = [remotive, greenhouse, lever, adzuna, jsearch, demo];

/** Job boards without a public API: we only build deep-links to their own search pages (no scraping). */
export const SEARCH_LINK_SOURCES = [
  { id: 'linkedin', name: 'LinkedIn', website: 'https://www.linkedin.com/jobs' },
  { id: 'naukri', name: 'Naukri', website: 'https://www.naukri.com' },
  { id: 'indeed', name: 'Indeed India', website: 'https://in.indeed.com' },
  { id: 'wellfound', name: 'Wellfound', website: 'https://wellfound.com' },
];

export function buildSearchLinks(params: { keywords: string; location: string; days?: number; expMin?: number }) {
  const kw = params.keywords || 'QA Engineer';
  const loc = params.location || 'Bengaluru';
  const days = params.days ?? 7;
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const isRemote = /remote/i.test(loc);
  const naukriLoc = loc.toLowerCase().startsWith('beng') ? 'bengaluru' : slug(loc);
  return [
    {
      id: 'linkedin',
      name: 'LinkedIn',
      url: `https://www.linkedin.com/jobs/search/?${new URLSearchParams({
        keywords: kw,
        location: isRemote ? 'India' : `${loc}, India`,
        f_TPR: `r${days * 86400}`,
        ...(isRemote ? { f_WT: '2' } : {}),
      })}`,
    },
    {
      id: 'naukri',
      name: 'Naukri',
      url: isRemote
        ? `https://www.naukri.com/${slug(kw)}-jobs?wfhType=2&experience=${params.expMin ?? 3}&jobAge=${days}`
        : `https://www.naukri.com/${slug(kw)}-jobs-in-${naukriLoc}?experience=${params.expMin ?? 3}&jobAge=${days}`,
    },
    {
      id: 'indeed',
      name: 'Indeed',
      url: `https://in.indeed.com/jobs?${new URLSearchParams({ q: kw, l: isRemote ? 'Remote' : loc, fromage: String(days) })}`,
    },
    {
      id: 'wellfound',
      name: 'Wellfound',
      url: `https://wellfound.com/role/l/${slug(kw)}/${isRemote ? 'remote' : slug(loc === 'Bengaluru' ? 'bangalore' : loc)}`,
    },
  ];
}
