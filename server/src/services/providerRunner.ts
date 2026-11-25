import { config } from '../config.js';
import type { Db } from '../db/index.js';
import { ADAPTERS } from '../sources/adapters.js';
import type { FetchContext, JobSourceAdapter, RawJob } from '../sources/types.js';

export interface ProviderRun {
  source: string;
  status: 'ok' | 'error' | 'skipped';
  detail?: string;
  jobs: RawJob[];
  /** True when results came from the provider's min-interval cache instead of a live call. */
  cached?: boolean;
  ms?: number;
}

export const DEFAULT_BUDGET_MS = 40_000;
const GRACE_MS = 1_500;

/** Per-provider result cache that enforces each provider's minimum interval between live calls. */
const intervalCache = new Map<string, { at: number; jobs: RawJob[] }>();
const ctxKey = (id: string, ctx: Omit<FetchContext, 'signal'>) => `${id}|${[...ctx.roles].sort().join(',').toLowerCase()}|${ctx.location.toLowerCase()}`;
export const clearProviderCache = () => intervalCache.clear();

/**
 * Runs the enabled, configured providers concurrently under one time budget.
 * A provider that is missing a key or is disabled is skipped; a provider that fails or runs out of
 * time never fails the run – whatever it returned is kept (partial results).
 */
export async function runProviders(
  db: Db,
  ctx: Omit<FetchContext, 'signal'>,
  opts: { includeLive?: boolean; budgetMs?: number; adapters?: JobSourceAdapter[] } = {},
): Promise<ProviderRun[]> {
  const adapters = opts.adapters ?? ADAPTERS;
  const enabled = new Set((await db.query<{ id: string }>('SELECT id FROM job_sources WHERE enabled')).map((r) => r.id));
  const includeLive = opts.includeLive ?? config.sources.liveEnabled;
  const budget = opts.budgetMs ?? DEFAULT_BUDGET_MS;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), budget);
  const fullCtx: FetchContext = { ...ctx, signal: ctrl.signal };

  const tasks = adapters.map(async (a): Promise<ProviderRun> => {
    const reason = !enabled.has(a.id)
      ? 'Disabled in settings'
      : a.isLive && !includeLive
        ? 'Live sources disabled (ENABLE_LIVE_SOURCES=false)'
        : a.unavailableReason();
    if (reason) return { source: a.id, status: 'skipped', detail: reason, jobs: [] };

    const key = ctxKey(a.id, ctx);
    const hit = intervalCache.get(key);
    if (hit && a.minIntervalMinutes && Date.now() - hit.at < a.minIntervalMinutes * 60_000) {
      return { source: a.id, status: 'ok', detail: 'Cached (provider rate limit)', jobs: hit.jobs, cached: true };
    }
    const t0 = Date.now();
    try {
      const jobs = await a.fetch(fullCtx);
      intervalCache.set(key, { at: Date.now(), jobs });
      return { source: a.id, status: 'ok', jobs, ms: Date.now() - t0, ...(ctrl.signal.aborted ? { detail: 'Time budget reached – partial results' } : {}) };
    } catch (e) {
      return { source: a.id, status: 'error', detail: (e as Error).message.slice(0, 500), jobs: [], ms: Date.now() - t0 };
    }
  });

  // Hard stop: once the budget (plus a short grace for aborted requests to unwind) is spent,
  // report still-running providers as timed out instead of waiting for them.
  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<'deadline'>((r) => {
    deadlineTimer = setTimeout(() => r('deadline'), budget + GRACE_MS);
  });
  const settled = tasks.map((t, i) =>
    Promise.race([t, deadline]).then((r): ProviderRun => (r === 'deadline' ? { source: adapters[i].id, status: 'error', detail: 'Timed out (run budget)', jobs: [] } : r)),
  );
  try {
    return await Promise.all(settled);
  } finally {
    clearTimeout(timer);
    clearTimeout(deadlineTimer);
  }
}
