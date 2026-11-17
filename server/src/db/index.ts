import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { PGlite, types } from '@electric-sql/pglite';
import { config } from '../config.js';

export interface Db {
  query<T = any>(sql: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
  tx<T>(fn: (q: Db) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  kind: 'postgres' | 'pglite';
}

// Return DATE as 'YYYY-MM-DD' strings and NUMERIC/INT8 as numbers in both drivers.
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

function wrapPg(pool: pg.Pool): Db {
  const db: Db = {
    kind: 'postgres',
    async query(sql, params = []) {
      return (await pool.query(sql, params as any[])).rows;
    },
    async exec(sql) {
      await pool.query(sql);
    },
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const inner: Db = {
          ...db,
          query: async (s, p = []) => (await client.query(s, p as any[])).rows,
          exec: async (s) => void (await client.query(s)),
          tx: (f) => f(inner),
        };
        const out = await fn(inner);
        await client.query('COMMIT');
        return out;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
  return db;
}

function wrapPglite(lite: PGlite): Db {
  const db: Db = {
    kind: 'pglite',
    async query(sql, params = []) {
      return (await lite.query(sql, params as any[])).rows as any[];
    },
    async exec(sql) {
      await lite.exec(sql);
    },
    async tx(fn) {
      return lite.transaction(async (t) => {
        const inner: Db = {
          ...db,
          query: async (s, p = []) => (await t.query(s, p as any[])).rows as any[],
          exec: async (s) => void (await t.exec(s)),
          tx: (f) => f(inner),
        };
        return fn(inner);
      }) as Promise<any>;
    },
    close: () => lite.close(),
  };
  return db;
}

export async function createDb(opts: { url?: string; pgliteDir?: string | null } = {}): Promise<Db> {
  const url = opts.url ?? config.databaseUrl;
  if (url) {
    const pool = new pg.Pool({
      connectionString: url,
      ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
      max: 10,
    });
    return wrapPg(pool);
  }
  const dir = opts.pgliteDir === undefined ? config.pgliteDir : opts.pgliteDir;
  if (dir) fs.mkdirSync(dir, { recursive: true });
  const parsers = {
    [types.DATE]: (v: string) => v,
    [types.NUMERIC]: (v: string) => Number(v),
    [types.INT8]: (v: string) => Number(v),
  };
  const lite = dir ? new PGlite(dir, { parsers }) : new PGlite({ parsers });
  await lite.waitReady;
  return wrapPglite(lite);
}

function migrationsDir() {
  const here = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
  if (fs.existsSync(here)) return here;
  // compiled build (dist/db) -> fall back to the source migrations
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/db/migrations');
}

export async function migrate(db: Db, log = false): Promise<string[]> {
  await db.exec(
    `CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
  );
  const done = new Set((await db.query<{ name: string }>('SELECT name FROM schema_migrations')).map((r) => r.name));
  const dir = migrationsDir();
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const applied: string[] = [];
  for (const f of files) {
    if (done.has(f)) continue;
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    await db.tx(async (q) => {
      await q.exec(sql);
      await q.query('INSERT INTO schema_migrations(name) VALUES ($1)', [f]);
    });
    applied.push(f);
    if (log) console.log(`[migrate] applied ${f}`);
  }
  return applied;
}

let instance: Db | null = null;
export async function getDb(): Promise<Db> {
  if (!instance) {
    instance = await createDb();
    await migrate(instance, true);
  }
  return instance;
}
export function setDb(db: Db | null) {
  instance = db;
}
