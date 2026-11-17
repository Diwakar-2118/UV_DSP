import type { Db } from './db/index.js';
import { config } from './config.js';
import { demo } from './sources/adapters.js';
import { hasLiveJobs, ingestJobs, syncSourceRegistry } from './services/jobs.js';
import { seedQuestionBank } from './services/interviews.js';

/** Idempotent data bootstrap: source registry, curated question bank and (optionally) labelled demo jobs. */
export async function bootstrapData(db: Db) {
  await syncSourceRegistry(db);
  await seedQuestionBank(db);
  if (config.seedDemoJobs) {
    // Refreshes posting dates so date filters behave sensibly on demo data. Demo jobs are never sent as alerts.
    await ingestJobs(db, 'demo', await demo.fetch(), true);
  } else {
    await db.query("UPDATE jobs SET is_active=false WHERE source_id='demo'");
  }
  return { liveJobs: await hasLiveJobs(db) };
}
