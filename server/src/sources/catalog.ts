/**
 * Company catalog for the public ATS job-board providers.
 *
 * Each entry names the company's applicant-tracking system and the identifier used by its
 * official, unauthenticated job-board endpoint. Companies without a public API are listed with
 * `ats: 'link'` – the app only stores a deep link to their own careers search page.
 *
 * Env vars (comma separated) add to or replace entries per ATS at deploy time:
 *   GREENHOUSE_BOARDS, LEVER_COMPANIES, ASHBY_ORGS, SMARTRECRUITERS_COMPANIES,
 *   WORKDAY_SITES (tenant:N:site, e.g. "salesforce:12:External_Career_Site").
 *
 * Entries marked "verified" had QA / SDET openings in Bengaluru or Hyderabad when the catalog was
 * last checked (Nov 2026). Others are large India employers on that ATS; they simply return
 * nothing when they have no matching roles.
 */

export type Ats = 'greenhouse' | 'lever' | 'ashby' | 'smartrecruiters' | 'workday' | 'link';

export interface CatalogEntry {
  company: string;
  ats: Ats;
  /** Greenhouse board token, Lever/Ashby slug or SmartRecruiters company id. */
  id?: string;
  /** Workday only. */
  workday?: { tenant: string; wd: number; site: string };
  /** Careers search page, used for `ats: 'link'` and as a fallback link. {q} and {loc} are replaced. */
  careersUrl?: string;
  cities?: string[];
  verified?: boolean;
}

export const COMPANY_CATALOG: CatalogEntry[] = [
  // ---- Greenhouse ----
  { company: 'HackerRank', ats: 'greenhouse', id: 'hackerrank', cities: ['Bengaluru'], verified: true },
  { company: 'Netskope', ats: 'greenhouse', id: 'netskope', cities: ['Bengaluru'], verified: true },
  { company: 'HighRadius', ats: 'greenhouse', id: 'highradius', cities: ['Hyderabad'], verified: true },
  { company: 'Rubrik', ats: 'greenhouse', id: 'rubrik', cities: ['Bengaluru'], verified: true },
  { company: 'Zscaler', ats: 'greenhouse', id: 'zscaler', cities: ['Bengaluru'], verified: true },
  { company: 'Okta', ats: 'greenhouse', id: 'okta', cities: ['Bengaluru'], verified: true },
  { company: 'Databricks', ats: 'greenhouse', id: 'databricks', cities: ['Bengaluru'] },
  { company: 'Razorpay', ats: 'greenhouse', id: 'razorpaysoftwareprivatelimited', cities: ['Bengaluru'] },
  { company: 'Groww', ats: 'greenhouse', id: 'groww', cities: ['Bengaluru'] },
  { company: 'Stripe', ats: 'greenhouse', id: 'stripe', cities: ['Bengaluru'] },
  { company: 'Druva', ats: 'greenhouse', id: 'druva', cities: ['Pune'] },
  { company: 'Coinbase', ats: 'greenhouse', id: 'coinbase', cities: ['Remote'] },
  // ---- SmartRecruiters ----
  { company: 'Bosch', ats: 'smartrecruiters', id: 'BoschGroup', cities: ['Bengaluru', 'Hyderabad'], verified: true },
  { company: 'Experian', ats: 'smartrecruiters', id: 'Experian', cities: ['Hyderabad'], verified: true },
  { company: 'Freshworks', ats: 'smartrecruiters', id: 'Freshworks', cities: ['Chennai', 'Bengaluru'] },
  { company: 'ServiceNow', ats: 'smartrecruiters', id: 'ServiceNow', cities: ['Hyderabad'] },
  // ---- Lever ----
  { company: 'Paytm', ats: 'lever', id: 'paytm', cities: ['Bengaluru', 'Noida'] },
  { company: 'Meesho', ats: 'lever', id: 'meesho', cities: ['Bengaluru'] },
  { company: 'Zeta', ats: 'lever', id: 'zeta', cities: ['Bengaluru', 'Hyderabad'] },
  { company: 'CRED', ats: 'lever', id: 'cred', cities: ['Bengaluru'] },
  { company: 'Mindtickle', ats: 'lever', id: 'mindtickle', cities: ['Pune'] },
  // ---- Ashby ----
  { company: 'Sarvam AI', ats: 'ashby', id: 'sarvam', cities: ['Bengaluru'] },
  { company: 'Atlan', ats: 'ashby', id: 'atlan', cities: ['Remote'] },
  // ---- Workday (public career-site JSON endpoint; strictly rate limited, called sequentially) ----
  { company: 'Salesforce', ats: 'workday', workday: { tenant: 'salesforce', wd: 12, site: 'External_Career_Site' }, cities: ['Hyderabad', 'Bengaluru'] },
  { company: 'Thomson Reuters', ats: 'workday', workday: { tenant: 'thomsonreuters', wd: 5, site: 'External_Career_Site' }, cities: ['Hyderabad', 'Bengaluru'] },
  { company: 'State Street', ats: 'workday', workday: { tenant: 'statestreet', wd: 1, site: 'Global' }, cities: ['Hyderabad', 'Bengaluru'] },
  { company: 'Mastercard', ats: 'workday', workday: { tenant: 'mastercard', wd: 1, site: 'CorporateCareers' }, cities: ['Pune', 'Gurugram'] },
  { company: 'Micron', ats: 'workday', workday: { tenant: 'micron', wd: 1, site: 'External' }, cities: ['Hyderabad'] },
  { company: 'Novartis', ats: 'workday', workday: { tenant: 'novartis', wd: 3, site: 'Novartis_Careers' }, cities: ['Hyderabad'] },
  { company: 'Amgen', ats: 'workday', workday: { tenant: 'amgen', wd: 1, site: 'Careers' }, cities: ['Hyderabad'] },
  { company: 'Invesco', ats: 'workday', workday: { tenant: 'invesco', wd: 1, site: 'IVZ' }, cities: ['Hyderabad'] },
  { company: 'Franklin Templeton', ats: 'workday', workday: { tenant: 'franklintempleton', wd: 1, site: 'Primary-External-1' }, cities: ['Hyderabad'] },
  { company: 'Evernorth (Cigna)', ats: 'workday', workday: { tenant: 'evernorth', wd: 5, site: 'Evernorth_Careers' }, cities: ['Hyderabad'] },
  { company: 'UKG', ats: 'workday', workday: { tenant: 'ukg', wd: 5, site: 'UKGCareers' }, cities: ['Noida', 'Bengaluru'] },
  // ---- No public API: deep link to the company's own careers search ----
  { company: 'Microsoft', ats: 'link', careersUrl: 'https://jobs.careers.microsoft.com/global/en/search?q={q}&lc={loc}%2C%20India', cities: ['Hyderabad', 'Bengaluru'] },
  { company: 'Google', ats: 'link', careersUrl: 'https://www.google.com/about/careers/applications/jobs/results/?q={q}&location={loc}%2C%20India', cities: ['Hyderabad', 'Bengaluru'] },
  { company: 'Apple', ats: 'link', careersUrl: 'https://jobs.apple.com/en-in/search?search={q}&location=india-INDC', cities: ['Hyderabad', 'Bengaluru'] },
  { company: 'Deloitte India', ats: 'link', careersUrl: 'https://www2.deloitte.com/in/en/careers/job-search.html?q={q}', cities: ['Hyderabad', 'Bengaluru'] },
  { company: 'Infosys', ats: 'link', careersUrl: 'https://career.infosys.com/joblist?searchtext={q}', cities: ['Hyderabad', 'Bengaluru'] },
  { company: 'TCS', ats: 'link', careersUrl: 'https://ibegin.tcs.com/iBegin/jobs/search?keyword={q}', cities: ['Hyderabad', 'Bengaluru'] },
];

const envList = (v: string | undefined) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : null);

/** Catalog entries for one ATS, with env overrides applied (env list replaces the catalog list). */
export function catalogFor(ats: Exclude<Ats, 'link' | 'workday'>): CatalogEntry[] {
  const env = envList(
    { greenhouse: process.env.GREENHOUSE_BOARDS, lever: process.env.LEVER_COMPANIES, ashby: process.env.ASHBY_ORGS, smartrecruiters: process.env.SMARTRECRUITERS_COMPANIES }[ats],
  );
  if (env) return env.map((id) => COMPANY_CATALOG.find((e) => e.ats === ats && e.id?.toLowerCase() === id.toLowerCase()) ?? { company: id, ats, id });
  return COMPANY_CATALOG.filter((e) => e.ats === ats);
}

export function workdayCatalog(): CatalogEntry[] {
  const env = envList(process.env.WORKDAY_SITES);
  if (!env) return COMPANY_CATALOG.filter((e) => e.ats === 'workday');
  return env.flatMap((s) => {
    const [tenant, wd, site] = s.split(':');
    if (!tenant || !wd || !site) return [];
    return [COMPANY_CATALOG.find((e) => e.workday?.tenant === tenant) ?? { company: tenant, ats: 'workday' as const, workday: { tenant, wd: Number(wd), site } }];
  });
}

/** Deep links to careers search pages of companies without a public API. */
export function careerLinks(q: string, loc: string) {
  return COMPANY_CATALOG.filter((e) => e.ats === 'link' && e.careersUrl).map((e) => ({
    company: e.company,
    url: e.careersUrl!.replace('{q}', encodeURIComponent(q)).replace('{loc}', encodeURIComponent(loc)),
  }));
}
