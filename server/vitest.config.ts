import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', testTimeout: 30000, include: ['test/**/*.test.ts'], env: { ENABLE_LIVE_SOURCES: 'false', SCHEDULER_ENABLED: 'false', DATABASE_URL: '', POSTGRES_URL: '' } },
});
