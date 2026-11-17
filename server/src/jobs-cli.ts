/** Run one job-collection + alert cycle (useful for an external cron such as Render Cron Jobs). */
import { getDb } from './db/index.js';
import { bootstrapData } from './bootstrap.js';
import { runCollectionCycle } from './services/scheduler.js';
import { runDueDigests } from './services/notifications.js';

const db = await getDb();
await bootstrapData(db);
const result = await runCollectionCycle(db);
console.log(JSON.stringify(result, null, 2));
if (process.argv.includes('--digests')) console.log('digests:', await runDueDigests(db));
await db.close();
