export { fetchJson } from './http.js';

/** What a provider returns before the app normalises, classifies and stores it. */
export interface RawJob {
  externalId: string;
  title: string;
  company: string;
  location: string;
  isRemote?: boolean;
  /** ISO 3166-1 alpha-2 country code when the source states it (e.g. "IN"). */
  country?: string | null;
  /** Plain text description */
  description: string;
  postedAt?: Date | null;
  applyUrl?: string | null;
  sourceSite?: string;
  salaryText?: string | null;
  salaryMinLpa?: number | null;
  salaryMaxLpa?: number | null;
  jobType?: string | null;
  noticePeriod?: string | null;
  /** Explicit experience range when the source provides one */
  expMin?: number | null;
  expMax?: number | null;
}

/** The normalised job shape returned by the discovery API. */
export interface NormalizedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  country: string | null;
  url: string | null;
  source: string;
  posted_date: string | null;
  salary: string | null;
  description: string;
  fetched_at: string;
}

/** What the user is looking for; providers use it to build their search queries. */
export interface FetchContext {
  /** Role keywords, e.g. ["QA Engineer", "SDET"]. */
  roles: string[];
  /** Free-text location, e.g. "Hyderabad", "India" or "Remote". */
  location: string;
  /** Aborted when the overall run time budget is exhausted. */
  signal?: AbortSignal;
}

export interface JobSourceAdapter {
  id: string;
  name: string;
  kind: 'api' | 'career_page';
  website: string;
  description: string;
  /** Terms of use / attribution summary shown in the README and Settings. */
  terms?: string;
  requiresCredentials: boolean;
  isLive: boolean;
  /** Initial on/off state when the source is first registered (default true). Users can toggle it in Settings. */
  defaultEnabled?: boolean;
  /** Minimum minutes between live calls (provider terms / quota). Cached results are used in between. */
  minIntervalMinutes?: number;
  /** Returns a reason string when the adapter cannot run (missing credentials, nothing configured, ...) */
  unavailableReason(): string | null;
  fetch(ctx: FetchContext): Promise<RawJob[]>;
}

const COUNTRY_CODES: Record<string, string> = { ind: 'IN', india: 'IN', usa: 'US', 'united states': 'US', uk: 'GB', 'united kingdom': 'GB', germany: 'DE', deu: 'DE', canada: 'CA', can: 'CA' };
const INDIAN_PLACES = /india|bengaluru|bangalore|hyderabad|secunderabad|telangana|karnataka|pune|chennai|mumbai|gurgaon|gurugram|noida|delhi|kolkata|ahmedabad|kochi|coimbatore/i;

/** Best-effort country code from a location string. */
export function inferCountry(location: string): string | null {
  if (INDIAN_PLACES.test(location)) return 'IN';
  const last = location.split(',').pop()?.trim().toLowerCase() ?? '';
  return COUNTRY_CODES[last] ?? null;
}

export function toNormalized(r: RawJob, source: string, id = `${source}:${r.externalId}`, fetchedAt = new Date()): NormalizedJob {
  const posted = r.postedAt && !Number.isNaN(r.postedAt.getTime()) ? r.postedAt.toISOString() : null;
  const salary =
    r.salaryText ??
    (r.salaryMinLpa != null || r.salaryMaxLpa != null ? `${r.salaryMinLpa ?? '?'}–${r.salaryMaxLpa ?? '?'} LPA` : null);
  return {
    id,
    title: r.title,
    company: r.company,
    location: r.location,
    remote: !!r.isRemote || /\bremote\b/i.test(r.location),
    country: r.country ?? inferCountry(r.location),
    url: r.applyUrl ?? null,
    source,
    posted_date: posted,
    salary,
    description: r.description,
    fetched_at: fetchedAt.toISOString(),
  };
}
