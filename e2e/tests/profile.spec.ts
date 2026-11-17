import { expect, test } from '@playwright/test';
import { registerViaApi } from './helpers';

test.describe('Profile & preferences', () => {
  test('new account is pre-populated with the QA/fintech defaults', async ({ page }) => {
    await registerViaApi(page);
    const r = await (await page.request.get('/api/profile')).json();
    expect(r.user.preferences.locations).toEqual(['Bengaluru', 'Hyderabad', 'Remote']);
    expect(r.user.preferences.roles).toEqual(['Manual QA', 'API Testing', 'Fintech QA', 'QA Automation', 'Performance Testing']);
    expect([r.user.preferences.minExperience, r.user.preferences.maxExperience]).toEqual([3, 5]);
    expect(r.user.profile.technicalSkills).toEqual(expect.arrayContaining(['ISO 8583', 'UPI', 'JMeter', 'Playwright', 'Spira']));
    const s = await (await page.request.get('/api/notifications/settings')).json();
    expect(s.settings.frequency).toBe('daily');
    expect(s.settings.enabled).toBe(true);
  });

  test('edits profile and preferences, persisted after reload', async ({ page }) => {
    await registerViaApi(page, 'Before Name');
    await page.goto('/profile');
    await page.getByTestId('profile-name').fill('After Name');
    await page.getByTestId('profile-exp').fill('4.5');
    await page.getByLabel('Technical skills').fill('Rest Assured');
    await page.getByLabel('Technical skills').press('Enter');
    await page.getByTestId('save-profile').click();
    await expect(page.getByTestId('toast')).toContainText('Profile saved');

    await page.getByRole('group', { name: 'Preferred locations' }).getByRole('button', { name: 'Hyderabad' }).click();
    await page.getByTestId('save-preferences').click();
    await expect(page.getByTestId('toast').last()).toContainText('Job preferences saved');

    await page.reload();
    await expect(page.getByTestId('profile-name')).toHaveValue('After Name');
    await expect(page.getByTestId('profile-exp')).toHaveValue('4.5');
    await expect(page.getByText('Rest Assured')).toBeVisible();
    await expect(page.getByRole('group', { name: 'Preferred locations' }).getByRole('button', { name: 'Hyderabad' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('rejects invalid preferences', async ({ page }) => {
    await registerViaApi(page);
    await page.goto('/profile');
    await page.getByTestId('pref-min').fill('6');
    await page.getByTestId('pref-max').fill('3');
    await page.getByTestId('save-preferences').click();
    await expect(page.getByTestId('toast')).toContainText('Minimum experience cannot exceed maximum');
  });
});
