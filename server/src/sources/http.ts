/**
 * Polite HTTP for job providers: descriptive User-Agent, ~10 s timeout per request,
 * per-host concurrency limit with a small gap between requests, and one retry on HTTP 429
 * honouring Retry-After (capped, so a provider never stalls the whole run).
 */

export const USER_AGENT = 'CareerPilotAI/1.0 (personal job discovery; uses official public job APIs only)';
const DEFAULT_TIMEOUT_MS = 10_000;

interface HostState {
  active: number;
  queue: (() => void)[];
  last: number;
}
const hosts = new Map<string, HostState>();
/** Per-host limits. Workday rate-limits aggressively, so it is strictly sequential with a longer gap. */
const hostPolicy = (host: string) =>
  host.endsWith('myworkdayjobs.com') ? { max: 1, gapMs: 1200 } : { max: 3, gapMs: 150 };

async function acquire(host: string) {
  const policy = hostPolicy(host);
  const s = hosts.get(host) ?? { active: 0, queue: [], last: 0 };
  hosts.set(host, s);
  if (s.active >= policy.max) await new Promise<void>((r) => s.queue.push(r));
  s.active++;
  const wait = s.last + policy.gapMs - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  s.last = Date.now();
  return () => {
    s.active--;
    s.queue.shift()?.();
  };
}

export class HttpStatusError extends Error {
  constructor(
    public status: number,
    host: string,
  ) {
    super(`HTTP ${status} from ${host}`);
  }
}

export interface RequestOpts extends Omit<RequestInit, 'body'> {
  timeoutMs?: number;
  /** JSON body (sent with POST). */
  json?: unknown;
  /** Aborts outstanding requests when the overall run budget is exhausted. */
  signal?: AbortSignal;
}

/** One HTTP attempt holding a per-host slot for its duration. */
async function attempt(url: string, opts: RequestOpts): Promise<Response> {
  if (opts.signal?.aborted) throw new Error('Run time budget exhausted');
  const host = new URL(url).hostname;
  const release = await acquire(host);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const onOuterAbort = () => ctrl.abort();
  opts.signal?.addEventListener('abort', onOuterAbort, { once: true });
  try {
    const { json, timeoutMs: _t, signal: _s, headers, ...rest } = opts;
    return await fetch(url, {
      ...rest,
      method: json !== undefined ? 'POST' : (rest.method ?? 'GET'),
      body: json !== undefined ? JSON.stringify(json) : undefined,
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(headers as Record<string, string> | undefined),
      },
    });
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onOuterAbort);
    release();
  }
}

async function request(url: string, opts: RequestOpts): Promise<Response> {
  // Unread error bodies keep the connection open, so always discard them.
  const discard = (r: Response) => r.body?.cancel().catch(() => undefined);
  let res = await attempt(url, opts);
  if (res.status === 429 && !opts.signal?.aborted) {
    await discard(res);
    const after = Number(res.headers.get('retry-after'));
    await new Promise((r) => setTimeout(r, Math.min(Number.isFinite(after) && after > 0 ? after * 1000 : 2000, 5000)));
    res = await attempt(url, opts);
  }
  if (!res.ok) {
    await discard(res);
    throw new HttpStatusError(res.status, new URL(url).hostname);
  }
  return res;
}

export async function fetchJson<T = any>(url: string, opts: RequestOpts = {}): Promise<T> {
  const res = await request(url, opts);
  return (await res.json()) as T;
}
