import { createApp } from './app.js';
import { config } from './config.js';
import { getDb } from './db/index.js';
import { bootstrapData } from './bootstrap.js';
import { runCollectionCycle, startScheduler, stopScheduler } from './services/scheduler.js';

const db = await getDb();
const { liveJobs } = await bootstrapData(db);
const app = await createApp();
const server = app.listen(config.port, () => {
  console.log(`[server] CareerPilot AI API on http://localhost:${config.port} (db: ${db.kind}, auth: ${config.authProvider})`);
});
startScheduler(db);

// First boot with no live jobs yet: collect once in the background so the app isn't empty until tomorrow's run.
if (!liveJobs && config.sources.liveEnabled) {
  runCollectionCycle(db)
    .then((r: any) => console.log('[jobs] initial collection:', r.sources.map((s: any) => `${s.source}=${s.status}${s.stats ? `(+${s.stats.inserted})` : ''}`).join(' ')))
    .catch((e) => console.error('[jobs] initial collection failed', e));
}

const shutdown = async () => {
  stopScheduler();
  server.close();
  await db.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
