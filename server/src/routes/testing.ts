/**
 * Test-only routes. Mounted ONLY when NODE_ENV=test and ENABLE_TEST_ROUTES=true (see app.ts).
 * Lets the E2E suite ingest deterministic "live" jobs without calling external APIs.
 */
import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { asyncH, parse } from '../lib/http.js';
import { ingestJobs } from '../services/jobs.js';

const router = Router();
const jobSchema = z.object({
  externalId: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string(),
  description: z.string(),
  applyUrl: z.string().url().nullable().optional(),
  daysAgo: z.number().default(0),
});

router.post(
  '/ingest',
  asyncH(async (req, res) => {
    const { sourceId, jobs } = parse(z.object({ sourceId: z.enum(['greenhouse', 'remotive', 'lever', 'adzuna', 'jsearch']), jobs: z.array(jobSchema).max(50) }), req.body);
    const stats = await ingestJobs(
      await getDb(),
      sourceId,
      jobs.map((j) => ({ ...j, postedAt: new Date(Date.now() - j.daysAgo * 86400000), sourceSite: 'E2E fixture' })),
    );
    res.json(stats);
  }),
);

export default router;
