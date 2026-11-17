import { expect, test } from '@playwright/test';
import { PASSWORD, registerViaUi, uniqueEmail } from './helpers';

test.describe('Registration & login', () => {
  test('registers, signs out and signs back in', async ({ page }) => {
    const email = await registerViaUi(page, 'Asha QA');
    await expect(page.getByTestId('user-name')).toHaveText('Asha QA');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByTestId('dashboard-greeting')).toContainText('Asha QA');
  });

  test('rejects wrong password with a clear error', async ({ page }) => {
    const email = await registerViaUi(page);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toHaveText('Invalid email or password');
  });

  test('blocks duplicate registration and short passwords', async ({ page, request }) => {
    const email = uniqueEmail('dup');
    expect((await request.post('/api/auth/register', { data: { fullName: 'A', email, password: PASSWORD } })).status()).toBe(201);
    const dup = await request.post('/api/auth/register', { data: { fullName: 'B', email, password: PASSWORD } });
    expect(dup.status()).toBe(409);
    await page.goto('/login');
    await page.getByRole('button', { name: 'Create one' }).click();
    await page.getByLabel('Full name').fill('Short');
    await page.getByLabel('Email').fill(uniqueEmail('short'));
    await page.getByLabel('Password').fill('123');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('alert')).toContainText('at least 8 characters');
  });

  test('protected pages redirect to login and APIs require a session', async ({ page, request }) => {
    await page.goto('/tracker');
    await expect(page).toHaveURL(/\/login/);
    for (const path of ['/api/jobs', '/api/applications', '/api/resumes', '/api/profile', '/api/notifications']) {
      expect((await request.get(path)).status(), path).toBe(401);
    }
    const bad = await request.get('/api/jobs', { headers: { Cookie: 'cp_session=forged.token.value' } });
    expect(bad.status()).toBe(401);
  });
});
