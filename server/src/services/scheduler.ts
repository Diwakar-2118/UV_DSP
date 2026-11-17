import cron, { type ScheduledTask } from 'node-cron';
import { config } from '../config.js';
import type { Db } from '../db/index.js';
import { collectJobs } from './jobs.js';
import { processAllAlerts, runDueDigests } from './notifications.js';

const state = {
  running: false,
  lastCollectionAt: null as string | null,
  lastCollectionSummary: null as unknown,
  lastDigestCheckAt: null as string | null,
  lastError: null as string | null,
};
const tasks: ScheduledTask[] = [];

export async function runCollectionCycle(db: Db) {
  const sources = await collectJobs(db);
  const alerts = await processAllAlerts(db);
  state.lastCollectionAt = new Date().toISOString();
  state.lastCollectionSummary = { sources, alerts };
  return state.lastCollectionSummary;
}

export function startScheduler(db: Db) {
  if (!config.scheduler.enabled) {
    console.log('[scheduler] disabled (SCHEDULER_ENABLED=false)');
    return;
  }
  for (const expr of [config.scheduler.collectCron, config.scheduler.digestCheckCron]) {
    if (!cron.validate(expr)) throw new Error(`Invalid cron expression: ${expr}`);
  }
  const opts = { timezone: config.scheduler.timezone };
  tasks.push(
    cron.schedule(
      config.scheduler.collectCron,
      async () => {
        try {
          await runCollectionCycle(db);
        } catch (e) {
          state.lastError = (e as Error).message;
          console.error('[scheduler] collection failed', e);
        }
      },
      { ...opts, name: 'job-collection' },
    ),
    cron.schedule(
      config.scheduler.digestCheckCron,
      async () => {
        try {
          await runDueDigests(db);
          state.lastDigestCheckAt = new Date().toISOString();
        } catch (e) {
          state.lastError = (e as Error).message;
          console.error('[scheduler] digest failed', e);
        }
      },
      { ...opts, name: 'digest-check' },
    ),
  );
  state.running = true;
  console.log(`[scheduler] job collection "${config.scheduler.collectCron}", digest check "${config.scheduler.digestCheckCron}" (${config.scheduler.timezone})`);
}

export function stopScheduler() {
  for (const t of tasks.splice(0)) t.stop();
  state.running = false;
}

export function schedulerStatus() {
  const next = (i: number) => {
    try {
      return (tasks[i] as any)?.getNextRun?.()?.toISOString?.() ?? null;
    } catch {
      return null;
    }
  };
  return {
    ...state,
    enabled: config.scheduler.enabled,
    timezone: config.scheduler.timezone,
    collectCron: config.scheduler.collectCron,
    digestCheckCron: config.scheduler.digestCheckCron,
    nextCollectionAt: next(0),
  };
}
