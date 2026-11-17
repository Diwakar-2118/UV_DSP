import { defineConfig, devices } from '@playwright/test';

const API_PORT = 4400;
const WEB_PORT = 5400;

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  globalSetup: './global-setup.ts',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /mobile\.spec/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec/ },
  ],
  webServer: [
    {
      // Fresh embedded database for every run.
      command: `node -e "require('fs').rmSync('.data/e2e',{recursive:true,force:true})" && npx tsx src/index.ts`,
      cwd: '../server',
      url: `http://localhost:${API_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        NODE_ENV: 'test',
        PORT: String(API_PORT),
        PGLITE_DIR: '.data/e2e',
        ENABLE_LIVE_SOURCES: 'false',
        ENABLE_TEST_ROUTES: 'true',
        SCHEDULER_ENABLED: 'false',
        EMAIL_TRANSPORT: 'json',
        OPENAI_API_KEY: '',
        TELEGRAM_BOT_TOKEN: '',
        JWT_SECRET: 'e2e-secret',
        BCRYPT_ROUNDS: '8',
        CLIENT_ORIGIN: `http://localhost:${WEB_PORT}`,
      },
    },
    {
      // Test the production bundle (deterministic, no dev-server dependency re-optimisation).
      command: 'npx vite build --logLevel warn && npx vite preview --port 5400 --strictPort',
      cwd: '../client',
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { API_PROXY_TARGET: `http://localhost:${API_PORT}`, CLIENT_PORT: String(WEB_PORT) },
    },
  ],
});
