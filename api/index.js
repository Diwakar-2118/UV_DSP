// Vercel Function: serves every /api/* request with the CareerPilot Express app (compiled to server/dist).
import { getApp, missingConfig } from '../server/dist/serverless.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const missing = missingConfig();
  if (missing.length) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: `Server not configured: set ${missing.join(', ')} in Vercel → Project → Settings → Environment Variables, then redeploy.`,
      }),
    );
    return;
  }
  try {
    const app = await getApp();
    return app(req, res);
  } catch (e) {
    console.error('[startup]', e);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: `Server failed to start: ${e instanceof Error ? e.message : String(e)}` }));
  }
}
