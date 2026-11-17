import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { registerViaApi } from './helpers';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), '../fixtures');

test.describe('Resume analyzer', () => {
  test('uploads a DOCX, analyses against a JD and downloads the improved resume', async ({ page }) => {
    await registerViaApi(page);
    await page.goto('/resume');
    await page.getByTestId('resume-input').setInputFiles(path.join(fixtures, 'resume.docx'));
    await expect(page.getByTestId('resume-name').first()).toHaveText('resume.docx');
    await page.getByTestId('jd-input').fill('Looking for a QA engineer with Playwright, Postman, SQL and JMeter. Playwright automation and JMeter performance testing are required.');
    await page.getByTestId('analyze-resume').click();
    const a = page.getByTestId('resume-analysis');
    await expect(a).toBeVisible();
    await expect(page.getByTestId('exp-detected')).toHaveText(/\d+(\.\d)? yrs/);
    await expect(page.getByTestId('missing-skills')).toContainText('Playwright');
    await expect(page.getByTestId('missing-skills')).toContainText('JMeter');
    await expect(page.getByTestId('jd-match')).toContainText('% match');
    await expect(page.getByTestId('improved-summary')).toContainText('QA Engineer');
    await expect(a).toContainText('Better project descriptions');

    const href = await page.getByTestId('download-improved').getAttribute('href');
    const dl = await page.request.get(href!);
    expect(dl.status()).toBe(200);
    expect(dl.headers()['content-type']).toContain('wordprocessingml');
    expect((await dl.body()).subarray(0, 2).toString()).toBe('PK');
  });

  test('parses a text-based PDF resume', async ({ page }) => {
    await registerViaApi(page);
    await page.goto('/resume');
    await page.getByTestId('resume-input').setInputFiles(path.join(fixtures, 'resume.pdf'));
    await expect(page.getByTestId('resume-name').first()).toHaveText('resume.pdf');
    await page.getByTestId('analyze-resume').click();
    await expect(page.getByTestId('resume-analysis')).toContainText('Postman');
    await expect(page.getByTestId('exp-detected')).toHaveText(/\d+(\.\d)? yrs/);
  });

  test('rejects unsupported files and protects resumes from other users', async ({ page, browser }) => {
    await registerViaApi(page);
    await page.goto('/resume');
    await page.getByTestId('resume-input').setInputFiles(path.join(fixtures, 'notes.txt'));
    await expect(page.getByTestId('toast')).toContainText('Only PDF or DOCX');
    const fake = await page.request.post('/api/resumes', { multipart: { file: { name: 'fake.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not really a pdf') } } });
    expect(fake.status()).toBe(422);

    await page.getByTestId('resume-input').setInputFiles(path.join(fixtures, 'resume.docx'));
    await expect(page.getByTestId('resume-name').first()).toBeVisible();
    const { resumes } = await (await page.request.get('/api/resumes')).json();
    const ctx = await browser.newContext();
    await ctx.request.post('/api/auth/register', { data: { fullName: 'Other', email: `other.${Date.now()}@e2e.test`, password: 'Sup3r-secret!' } });
    expect((await ctx.request.get(`/api/resumes/${resumes[0].id}/file`)).status()).toBe(404);
    expect((await ctx.request.post(`/api/resumes/${resumes[0].id}/analyze`, { data: {} })).status()).toBe(404);
    await ctx.close();
  });
});

test.describe('Study plan & roadmap', () => {
  test('generates a plan, marks topics complete and tracks progress', async ({ page }) => {
    await registerViaApi(page);
    await page.goto('/roadmap');
    await page.getByTestId('daily-goal').fill('120');
    await page.getByTestId('generate-plan').click();
    await expect(page.getByTestId('plan-percent')).toHaveText('0%');
    const items = page.getByTestId('study-item');
    expect(await items.count()).toBeGreaterThanOrEqual(2);
    await items.first().click();
    await expect(items.first()).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('plan-percent')).not.toHaveText('0%');
    await items.first().click();
    await expect(page.getByTestId('plan-percent')).toHaveText('0%');
    await expect(page.getByText('Career path')).toBeVisible();
    await expect(page.getByText('Fintech QA Engineer').first()).toBeVisible();
  });
});

test.describe('Company interview preparation', () => {
  test('curated company shows rounds, practice questions and a disclaimer', async ({ page }) => {
    await registerViaApi(page);
    await page.goto('/companies');
    await page.getByTestId('company-item').filter({ hasText: 'Razorpay' }).click();
    const prep = page.getByTestId('company-prep');
    await expect(prep).toContainText('Common interview rounds');
    await expect(prep).toContainText('Fintech domain practice questions');
    await expect(page.getByTestId('company-disclaimer')).toContainText('NOT verified');
  });

  test('unknown company falls back to a labelled generic practice set', async ({ page }) => {
    await registerViaApi(page);
    await page.goto('/companies');
    await page.getByTestId('company-search').fill('Zyxw Fintech Labs');
    await page.getByTestId('generate-company').click();
    await expect(page.getByTestId('company-prep')).toContainText('Generic practice set');
    await expect(page.getByTestId('company-disclaimer')).toBeVisible();
  });
});
