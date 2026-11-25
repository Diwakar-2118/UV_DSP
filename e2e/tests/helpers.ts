import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const uniqueEmail = (tag: string) => `${tag}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@e2e.test`;
export const PASSWORD = 'Sup3r-secret!';

/** Register a fresh user through the UI and land on the dashboard. */
export async function registerViaUi(page: Page, name = 'E2E Tester') {
  const email = uniqueEmail('ui');
  await page.goto('/login');
  await page.getByRole('tab', { name: 'Create account' }).click();
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByTestId('dashboard-greeting')).toContainText(name);
  return email;
}

/** Faster: register through the API using the page's cookie jar, then open a route. */
export async function registerViaApi(page: Page, name = 'API Tester') {
  const email = uniqueEmail('api');
  const res = await page.request.post('/api/auth/register', { data: { fullName: name, email, password: PASSWORD } });
  expect(res.status(), await res.text()).toBe(201);
  return email;
}

export async function seedLiveJobs(
  request: APIRequestContext,
  tag: string,
  extra: Partial<{ title: string; location: string; daysAgo: number; description: string; company: string; applyUrl: string | null }>[] = [{}],
) {
  const jobs = extra.map((e, i) => ({
    externalId: `${tag}-${i}`,
    title: e.title ?? `Fintech QA Engineer ${tag}-${i}`,
    company: e.company ?? `E2E Payments ${tag}`,
    location: e.location ?? 'Bengaluru, India',
    description: e.description ?? 'Payment gateway testing with Postman, SQL, API testing, settlement, reconciliation and UPI. 3-5 years of experience.',
    applyUrl: e.applyUrl === undefined ? `https://jobs.e2e.example/${tag}/${i}` : e.applyUrl,
    daysAgo: e.daysAgo ?? 0,
  }));
  const res = await request.post('/api/test/ingest', { data: { sourceId: 'greenhouse', jobs } });
  expect(res.ok(), await res.text()).toBeTruthy();
  return res.json();
}
