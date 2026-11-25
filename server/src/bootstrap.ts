import type { Db } from './db/index.js';
import { hasLiveJobs, syncSourceRegistry } from './services/jobs.js';
import { seedQuestionBank } from './services/interviews.js';

/** Idempotent data bootstrap: source registry and curated question bank. No demo jobs are ever created. */
export async function bootstrapData(db: Db) {
  await syncSourceRegistry(db);
  await seedQuestionBank(db);
  return { liveJobs: await hasLiveJobs(db) };
}
