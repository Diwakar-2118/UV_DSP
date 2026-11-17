import { expect, test } from '@playwright/test';
import { registerViaApi } from './helpers';
import { NAV_LABELS } from './nav';

test.describe('Dashboard & navigation', () => {
  test('sidebar contains all 12 sections and each page renders', async ({ page }) => {
    await registerViaApi(page);
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main' }).first();
    for (const label of NAV_LABELS) {
      await nav.getByRole('link', { name: label, exact: true }).click();
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await expect(page.getByRole('alert')).toHaveCount(0);
    }
  });

  test('dashboard shows stats and honest integration status', async ({ page }) => {
    await registerViaApi(page);
    await page.goto('/');
    await expect(page.getByTestId('stat-new-jobs')).toBeVisible();
    await expect(page.getByTestId('stat-applications')).toContainText('0');
    await page.goto('/settings');
    await expect(page.getByTestId('int-ai')).toContainText('Not configured');
    await expect(page.getByTestId('int-email')).toContainText('Test transport');
    await expect(page.getByTestId('int-telegram')).toContainText('Not configured');
    await expect(page.getByTestId('sources-list')).toContainText('Deep links only');
  });

  test('unknown API routes and malformed input return clean errors', async ({ page }) => {
    await registerViaApi(page);
    expect((await page.request.get('/api/does-not-exist')).status()).toBe(404);
    expect((await page.request.get('/api/jobs/not-a-uuid')).status()).toBe(404);
    expect((await page.request.get('/api/jobs', { params: { postedWithinDays: 5 } })).status()).toBe(400);
    const r = await page.request.post('/api/interviews', { data: { category: 'Nope', mode: 'MCQ', difficulty: 'Beginner', count: 3 } });
    expect(r.status()).toBe(400);
  });
});
