/**
 * Serverless entry (Vercel Functions). Initialises the database once per warm instance and returns the Express app.
 * The in-process scheduler is not used here – Vercel Cron calls /api/cron/daily instead.
 */
import type { Express } from 'express';

let ready: Promise<Express> | null = null;

export function missingConfig(): string[] {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL && process.env.ALLOW_EPHEMERAL_DB !== 'true') missing.push('DATABASE_URL');
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
  return missing;
}

export function getApp(): Promise<Express> {
  if (!ready) {
    ready = (async () => {
      process.env.SCHEDULER_ENABLED = 'false';
      // Serverless file systems are read-only except /tmp (only used when ALLOW_EPHEMERAL_DB=true for previews).
      process.env.PGLITE_DIR ??= '/tmp/careerpilot-pglite';
      const { getDb } = await import('./db/index.js');
      const { bootstrapData } = await import('./bootstrap.js');
      const { createApp } = await import('./app.js');
      const db = await getDb();
      await bootstrapData(db);
      return createApp();
    })();
    ready.catch(() => {
      ready = null; // retry on the next request instead of caching a failure
    });
  }
  return ready;
}
