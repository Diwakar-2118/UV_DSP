import { expect, test } from '@playwright/test';
import { registerViaApi } from './helpers';

const PAGES = ['/', '/jobs', '/alerts', '/matching', '/prep', '/mock-interview', '/companies', '/resume', '/tracker', '/roadmap', '/profile', '/settings'];

test.describe('Mobile responsiveness', () => {
  test('every page fits the viewport without horizontal scrolling', async ({ page }) => {
    await registerViaApi(page);
    for (const p of PAGES) {
      await page.goto(p);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `horizontal overflow on ${p}`).toBeLessThanOrEqual(1);
    }
  });

  test('navigation drawer opens and navigates; theme toggle works', async ({ page }) => {
    await registerViaApi(page);
    await page.goto('/');
    await page.getByTestId('mobile-menu').click();
    await page.getByRole('link', { name: 'Application Tracker' }).click();
    await expect(page).toHaveURL(/\/tracker/);
    await page.getByTestId('theme-toggle').click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.getByTestId('theme-toggle').click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('filters are reachable on mobile', async ({ page }) => {
    await registerViaApi(page);
    await page.goto('/jobs');
    await page.getByRole('button', { name: 'Filters' }).click();
    await expect(page.getByLabel('Date posted')).toBeVisible();
  });
});
