import { expect, test } from '@playwright/test';
import { registerViaApi, seedLiveJobs } from './helpers';

test.describe('Job discovery', () => {
  test('job cards show every required field and demo data is clearly labelled', async ({ page }) => {
    await registerViaApi(page);
    await page.goto('/jobs');
    await page.getByLabel('Data source').selectOption('true');
    const card = page.getByTestId('job-card').filter({ has: page.getByTestId('demo-badge') }).first();
    await expect(card).toBeVisible();
    await expect(card.getByTestId('demo-badge')).toHaveText('DEMO DATA');
    await expect(card).toContainText('(Demo)');
    await expect(card).toContainText(/yrs|Not specified/);
    await expect(card).toContainText(/Source:/);
    await expect(card.getByLabel(/% match/)).toBeVisible();
    await expect(card.getByTestId('save-job')).toBeVisible();
    // Demo jobs have no fake application link – they offer a real search instead.
    await expect(card.getByTestId('apply-now')).toHaveCount(0);
    await expect(card.getByRole('link', { name: /Find similar on LinkedIn/ })).toHaveAttribute('href', /linkedin\.com\/jobs\/search/);
  });

  test('live jobs link to the original posting', async ({ page }) => {
    await registerViaApi(page);
    await seedLiveJobs(page.request, `live${Date.now()}`);
    await page.goto('/jobs');
    const card = page.getByTestId('job-card').filter({ hasText: 'E2E Payments' }).first();
    await expect(card.getByText('Live listing')).toBeVisible();
    await expect(card.getByTestId('apply-now')).toHaveAttribute('href', /^https:\/\/jobs\.e2e\.example\//);
  });

  test('search, filters and sorting narrow the results', async ({ page }) => {
    await registerViaApi(page);
    await page.goto('/jobs');
    await page.getByLabel('Data source').selectOption('true');
    await expect(page.getByTestId('results-count')).toBeVisible();

    await page.getByTestId('job-search').fill('JMeter');
    await expect(page.getByTestId('job-title').first()).toContainText(/Performance/i);

    await page.getByTestId('job-search').fill('');
    await page.getByRole('group', { name: 'Locations' }).getByRole('button', { name: 'Bengaluru' }).click();
    await page.getByRole('group', { name: 'Locations' }).getByRole('button', { name: 'Remote' }).click();
    // Only Hyderabad selected now
    await expect(page.getByTestId('job-card').first()).toContainText('Hyderabad');
    for (const loc of await page.getByTestId('job-card').allInnerTexts()) expect(loc).toContain('Hyderabad');

    await page.getByLabel('Minimum match').selectOption('90');
    await page.getByTestId('sort-select').selectOption('match');
    const scores = () => page.getByTestId('job-card').getByLabel(/% match/).evaluateAll((els) => els.map((e) => parseInt(e.getAttribute('aria-label')!)));
    // Wait for the re-filtered list (results update asynchronously).
    await expect.poll(async () => (await scores()).every((v) => v >= 90)).toBe(true);
    const rings = await scores();
    expect([...rings].sort((a, b) => b - a)).toEqual(rings);
  });

  test('date filter excludes older jobs', async ({ request, page }) => {
    await registerViaApi(page);
    const tag = `date${Date.now()}`;
    await seedLiveJobs(page.request, tag, [{ title: `Fresh QA Engineer ${tag}` }, { title: `Old QA Engineer ${tag}`, daysAgo: 10 }]);
    const week = await (await page.request.get('/api/jobs', { params: { q: tag, postedWithinDays: 7 } })).json();
    const month = await (await page.request.get('/api/jobs', { params: { q: tag, postedWithinDays: 30 } })).json();
    expect(week.jobs.map((j: any) => j.title)).toEqual([`Fresh QA Engineer ${tag}`]);
    expect(month.total).toBe(2);
    expect((await request.get('/api/jobs', { params: { postedWithinDays: 2 } })).status()).toBe(401);
  });

  test('save job, view saved, and track from a job card', async ({ page }) => {
    await registerViaApi(page);
    await page.goto('/jobs');
    await page.getByLabel('Data source').selectOption('true');
    const card = page.getByTestId('job-card').filter({ has: page.getByTestId('demo-badge') }).first();
    const title = await card.getByTestId('job-title').innerText();
    await card.getByTestId('save-job').click();
    await expect(card.getByTestId('save-job')).toHaveText(/Saved/);
    await page.getByLabel('Saved jobs only').check();
    await expect(page.getByTestId('job-card')).toHaveCount(1);
    await expect(page.getByTestId('job-title')).toHaveText(title);

    await page.getByTestId('track-job').click();
    await expect(page.getByTestId('toast').last()).toContainText('Application Tracker');
    await page.getByTestId('track-job').click();
    await expect(page.getByTestId('toast').last()).toContainText('Already in your Application Tracker');
    await page.goto('/tracker');
    await expect(page.getByTestId('application-card')).toContainText(title.split(' ')[0]);
  });

  test('external job boards are deep links, not scraped', async ({ page }) => {
    await registerViaApi(page);
    await page.goto('/jobs');
    for (const [name, host] of [['LinkedIn', 'linkedin.com'], ['Naukri', 'naukri.com'], ['Indeed', 'indeed.com'], ['Wellfound', 'wellfound.com']]) {
      await expect(page.getByRole('link', { name })).toHaveAttribute('href', new RegExp(host.replace('.', '\\.')));
    }
  });
});

test.describe('Duplicate prevention', () => {
  test('re-ingesting and cross-source copies never create duplicates', async ({ page }) => {
    await registerViaApi(page);
    const tag = `dup${Date.now()}`;
    const first = await seedLiveJobs(page.request, tag);
    expect(first.inserted).toBe(1);
    const again = await seedLiveJobs(page.request, tag);
    expect(again).toMatchObject({ inserted: 0, updated: 1 });
    const cross = await page.request.post('/api/test/ingest', {
      data: { sourceId: 'remotive', jobs: [{ externalId: 'other-id', title: `Fintech QA Engineer ${tag}-0`, company: `E2E Payments ${tag}`, location: 'Bengaluru, India', description: 'QA', applyUrl: `https://www.jobs.e2e.example/${tag}/0/?utm_source=x` }] },
    });
    expect(await cross.json()).toMatchObject({ inserted: 0, duplicates: 1 });
    const res = await (await page.request.get('/api/jobs', { params: { q: tag } })).json();
    expect(res.total).toBe(1);
  });
});
