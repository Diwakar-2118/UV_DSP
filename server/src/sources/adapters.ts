/**
 * Registry of job providers. Each provider lives in ./providers and implements JobSourceAdapter:
 *   fetch({ roles, location, signal }) -> RawJob[]
 * Only official, public or licensed APIs are used. Job boards that forbid automated access
 * (LinkedIn, Naukri, Indeed, Foundit, Wellfound) are never fetched – we only build deep links
 * to their own search pages, which open in the user's browser.
 */
import type { JobSourceAdapter } from './types.js';
import { greenhouse } from './providers/greenhouse.js';
import { lever } from './providers/lever.js';
import { ashby } from './providers/ashby.js';
import { smartrecruiters } from './providers/smartrecruiters.js';
import { workday } from './providers/workday.js';
import { amazon } from './providers/amazon.js';
import { adzuna } from './providers/adzuna.js';
import { jooble } from './providers/jooble.js';
import { jsearch } from './providers/jsearch.js';
import { arbeitnow, himalayas, jobicy, remotive } from './providers/remoteBoards.js';

export { greenhouse, lever, ashby, smartrecruiters, workday, amazon, adzuna, jooble, jsearch, remotive, arbeitnow, himalayas, jobicy };

export const ADAPTERS: JobSourceAdapter[] = [
  // Public ATS career pages (no key)
  greenhouse, lever, ashby, smartrecruiters, workday, amazon,
  // Job-search APIs
  adzuna, jooble, jsearch, himalayas, jobicy, arbeitnow, remotive,
];

/** Job boards without a public API: we only build deep-links to their own search pages (no scraping). */
export const SEARCH_LINK_SOURCES = [
  { id: 'linkedin', name: 'LinkedIn', website: 'https://www.linkedin.com/jobs' },
  { id: 'naukri', name: 'Naukri', website: 'https://www.naukri.com' },
  { id: 'indeed', name: 'Indeed India', website: 'https://in.indeed.com' },
  { id: 'wellfound', name: 'Wellfound', website: 'https://wellfound.com' },
  { id: 'foundit', name: 'Foundit', website: 'https://www.foundit.in' },
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
    {
      id: 'foundit',
      name: 'Foundit',
      url: `https://www.foundit.in/srp/results?${new URLSearchParams({ query: isRemote ? `${kw} remote` : kw, locations: isRemote ? 'India' : loc })}`,
    },
  ];
}
