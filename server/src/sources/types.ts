export interface RawJob {
  externalId: string;
  title: string;
  company: string;
  location: string;
  isRemote?: boolean;
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

export interface JobSourceAdapter {
  id: string;
  name: string;
  kind: 'api' | 'career_page' | 'demo';
  website: string;
  description: string;
  requiresCredentials: boolean;
  isLive: boolean;
  /** Returns a reason string when the adapter cannot run (missing credentials, disabled, ...) */
  unavailableReason(): string | null;
  fetch(): Promise<RawJob[]>;
}

export async function fetchJson<T = any>(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? 20000);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'CareerPilotAI/1.0 (job-alerts)', ...(init.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).hostname}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
