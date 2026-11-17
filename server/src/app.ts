import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { asyncH, errorHandler, HttpError, requireAuth } from './lib/http.js';
import { getDb } from './db/index.js';
import authRoutes from './routes/auth.js';
import jobRoutes from './routes/jobs.js';
import profileRoutes from './routes/profile.js';
import notificationRoutes from './routes/notifications.js';
import applicationRoutes from './routes/applications.js';
import interviewRoutes from './routes/interviews.js';
import resumeRoutes from './routes/resumes.js';
import { companyRouter, dashboardRouter, prepRouter, studyRouter } from './routes/misc.js';
import { aiConfigured } from './services/ai.js';
import { emailStatus, telegramConfigured } from './services/delivery.js';
import { schedulerStatus } from './services/scheduler.js';

export async function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || config.clientOrigins.includes(origin)),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: config.nodeEnv === 'test' ? 10000 : 300, standardHeaders: 'draft-7', legacyHeaders: false }));

  app.get('/api/health', asyncH(async (_req, res) => {
    const db = await getDb();
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: db.kind, time: new Date().toISOString() });
  }));

  app.use('/api/auth', authRoutes);
  app.use('/api', requireAuth);
  if (config.nodeEnv === 'test' && process.env.ENABLE_TEST_ROUTES === 'true') {
    const { default: testRoutes } = await import('./routes/testing.js');
    app.use('/api/test', testRoutes);
  }
  app.get('/api/system/status', asyncH(async (_req, res) => {
    const db = await getDb();
    res.json({
      database: db.kind === 'postgres' ? 'PostgreSQL' : 'Embedded PGlite (local development)',
      authProvider: config.authProvider,
      ai: { configured: aiConfigured(), model: aiConfigured() ? config.openaiModel : null, detail: aiConfigured() ? 'OpenAI connected (server-side)' : 'OPENAI_API_KEY not set – using the built-in offline evaluator' },
      email: emailStatus(),
      telegram: { configured: telegramConfigured() },
      scheduler: schedulerStatus(),
      liveSourcesEnabled: config.sources.liveEnabled,
    });
  }));
  app.use('/api/jobs', jobRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/applications', applicationRoutes);
  app.use('/api/interviews', interviewRoutes);
  app.use('/api/resumes', resumeRoutes);
  app.use('/api/prep', prepRouter);
  app.use('/api/study', studyRouter);
  app.use('/api/companies', companyRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'API route not found')));

  // Optional: serve the built frontend from the same origin (single-service deployment).
  const clientDist = process.env.CLIENT_DIST ?? path.resolve(process.cwd(), '../client/dist');
  if (process.env.SERVE_CLIENT === 'true' && fs.existsSync(clientDist)) {
    app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
