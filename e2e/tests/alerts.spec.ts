import { expect, test } from '@playwright/test';
import { registerViaApi, seedLiveJobs } from './helpers';

test.describe('Daily job alerts', () => {
  test('matches new live jobs once and never duplicates', async ({ page }) => {
    await registerViaApi(page);
    const tag = `alert${Date.now()}`;
    await seedLiveJobs(page.request, tag, [{}, { title: `QA Engineer Pune ${tag}`, location: 'Pune' }]);
    await page.goto('/alerts');
    await page.getByTestId('run-alerts').click();
    await expect(page.getByTestId('toast')).toContainText('new matching job');
    const list = page.getByTestId('notification-list');
    await expect(list).toContainText(`Fintech QA Engineer ${tag}-0`);
    await expect(list).not.toContainText(`QA Engineer Pune ${tag}`); // outside preferred locations
    await expect(page.getByTestId('unread-badge')).toBeVisible();

    const before = (await (await page.request.get('/api/notifications')).json()).notifications.length;
    const second = await (await page.request.post('/api/notifications/run')).json();
    expect(second.alerts.created).toBe(0);
    const after = (await (await page.request.get('/api/notifications')).json()).notifications.length;
    expect(after).toBe(before);

    await page.getByRole('button', { name: 'Mark all read' }).click();
    await expect(page.getByTestId('unread-badge')).toHaveCount(0);
  });

  test('email is not reported active until a test succeeds; digest is then recorded', async ({ page }) => {
    await registerViaApi(page);
    await seedLiveJobs(page.request, `mail${Date.now()}`);
    await page.goto('/alerts');
    await expect(page.getByTestId('external-inactive')).toBeVisible();
    await page.getByRole('tab', { name: 'Alert settings' }).click();
    const email = page.getByTestId('channel-email-digest');
    await expect(email.getByTestId('channel-status')).toHaveText('Needs a successful test');
    await expect(page.getByTestId('channel-telegram').getByTestId('channel-status')).toHaveText('Not configured');
    await expect(page.getByTestId('test-telegram')).toBeDisabled();

    await page.getByTestId('test-email').click();
    await expect(email.getByTestId('channel-status')).toHaveText('Active (test transport)');

    const run = await (await page.request.post('/api/notifications/run')).json();
    expect(run.delivery.email).toMatch(/^sent \d+/);
    await page.getByRole('tab', { name: 'Delivery history' }).click();
    const table = page.getByTestId('history-table');
    await expect(table).toContainText('digest');
    await expect(table).toContainText('recorded');
    await expect(table).toContainText('test transport');

    const again = await (await page.request.post('/api/notifications/run')).json();
    expect(again.delivery.email).toBe('nothing new');
  });

  test('notification settings save and validate', async ({ page }) => {
    await registerViaApi(page);
    await page.goto('/alerts');
    await page.getByRole('tab', { name: 'Alert settings' }).click();
    await page.getByTestId('delivery-time').fill('07:30');
    await page.getByTestId('min-score').fill('80');
    await page.getByRole('group', { name: 'Alert roles' }).getByRole('button', { name: 'Manual QA' }).click();
    await page.getByTestId('save-alert-settings').click();
    await expect(page.getByTestId('toast')).toContainText('Alert settings saved');
    const s = (await (await page.request.get('/api/notifications/settings')).json()).settings;
    expect(s.delivery_time).toBe('07:30');
    expect(s.min_match_score).toBe(80);
    expect(s.roles).not.toContain('Manual QA');

    const bad = await page.request.put('/api/notifications/settings', { data: { ...{ enabled: true, deliveryTime: '25:00', timezone: 'Asia/Kolkata', minMatchScore: 50, roles: [], locations: [], inAppEnabled: true, emailEnabled: true, telegramEnabled: false, telegramChatId: null } } });
    expect(bad.status()).toBe(400);

    await page.getByTestId('alerts-toggle').uncheck();
    await page.getByTestId('save-alert-settings').click();
    await expect(page.getByTestId('alerts-enabled')).toHaveText('Disabled');
  });
});
