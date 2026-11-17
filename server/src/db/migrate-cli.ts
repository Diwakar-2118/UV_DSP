import { createDb, migrate } from './index.js';

const db = await createDb();
const applied = await migrate(db, true);
console.log(applied.length ? `Applied ${applied.length} migration(s).` : 'Database is up to date.');
await db.close();
