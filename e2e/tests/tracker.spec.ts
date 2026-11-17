import { expect, test } from '@playwright/test';
import { PASSWORD, registerViaApi, uniqueEmail } from './helpers';

test.describe('Application tracker', () => {
  test('add, update status, schedule interview, edit notes and delete', async ({ page }) => {
    await registerViaApi(page);
    await page.goto('/tracker');
    await page.getByTestId('add-application').click();
    await page.getByTestId('app-company').fill('Acme Payments');
    await page.getByTestId('app-role').fill('API Test Engineer');
    await page.getByLabel('Job URL').fill('https://careers.acme.example/123');
    await page.getByLabel('Recruiter name').fill('Ravi');
    await page.getByLabel('Recruiter email').fill('ravi@acme.example');
    await page.getByTestId('save-application').click();
    await expect(page.getByTestId('toast')).toContainText('Application added');
    await expect(page.getByTestId('stat-total')).toContainText('1');

    const card = page.getByTestId('application-card').filter({ hasText: 'Acme Payments' });
    await card.getByTestId('status-select').selectOption('Resume Shortlisted');
    await expect(page.getByTestId('stat-shortlisted')).toContainText('1');

    await card.getByRole('button', { name: 'Edit Acme Payments' }).click();
    const future = new Date(Date.now() + 3 * 86400000);
    const local = new Date(future.getTime() - future.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    await page.getByTestId('app-interview').fill(local);
    await page.getByTestId('app-status').selectOption('Interview Scheduled');
    await page.getByTestId('app-notes').fill('Prepare ISO 8583 reversal scenarios');
    await page.getByTestId('save-application').click();
    await expect(page.getByTestId('stat-interviews')).toContainText('1');
    await expect(page.getByTestId('application-card').filter({ hasText: 'Acme Payments' })).toContainText(/\d{4}|\w{3} \d/);

    await page.goto('/');
    await expect(page.getByText('Acme Payments')).toBeVisible();

    await page.goto('/tracker');
    await page.getByRole('button', { name: 'list' }).click();
    await expect(page.getByRole('cell', { name: 'Ravi' })).toBeVisible();
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Delete Acme Payments' }).click();
    await expect(page.getByText('No applications yet')).toBeVisible();
  });

  test('selection rate and validation', async ({ page }) => {
    await registerViaApi(page);
    for (const [company, status] of [['A', 'Selected'], ['B', 'Rejected'], ['C', 'Applied'], ['D', 'Rejected']]) {
      expect((await page.request.post('/api/applications', { data: { company, roleTitle: 'QA', status } })).status()).toBe(201);
    }
    const stats = await (await page.request.get('/api/applications/stats')).json();
    expect(stats.total).toBe(4);
    expect(stats.selectionRate).toBe(33);
    const bad = await page.request.post('/api/applications', { data: { company: '', roleTitle: 'QA', status: 'Unknown' } });
    expect(bad.status()).toBe(400);
  });

  test('users cannot read or modify each other\'s data', async ({ page, browser }) => {
    await registerViaApi(page);
    const created = await (await page.request.post('/api/applications', { data: { company: 'Private Co', roleTitle: 'QA' } })).json();
    const ctx = await browser.newContext();
    const other = ctx.request;
    await other.post('/api/auth/register', { data: { fullName: 'Intruder', email: uniqueEmail('intruder'), password: PASSWORD } });
    expect((await other.get(`/api/applications/${created.application.id}`)).status()).toBe(404);
    expect((await other.put(`/api/applications/${created.application.id}`, { data: { company: 'Hacked', roleTitle: 'x' } })).status()).toBe(404);
    expect((await other.delete(`/api/applications/${created.application.id}`)).status()).toBe(404);
    expect((await (await other.get('/api/applications')).json()).applications).toHaveLength(0);
    await ctx.close();
  });
});
