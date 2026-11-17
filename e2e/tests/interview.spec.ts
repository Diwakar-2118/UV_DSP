import { expect, test } from '@playwright/test';
import { registerViaApi } from './helpers';

test.describe('AI mock interview', () => {
  test('MCQ interview: one question at a time, feedback, ideal answer, final summary', async ({ page }) => {
    await registerViaApi(page);
    await page.goto('/mock-interview');
    await page.getByTestId('iv-category').selectOption('API Testing');
    await page.getByTestId('iv-mode').selectOption('MCQ');
    await page.getByTestId('iv-count').selectOption('3');
    await page.getByTestId('start-interview').click();

    for (let i = 1; i <= 3; i++) {
      await expect(page.getByTestId('question-progress')).toHaveText(new RegExp(`Question ${i} of \\d`));
      await page.getByTestId('mcq-option').first().click();
      await page.getByTestId('submit-answer').click();
      await expect(page.getByTestId('feedback')).toBeVisible();
      await expect(page.getByTestId('answer-score')).toHaveText(/^(0|10)$/);
      await expect(page.getByTestId('ideal-answer')).not.toBeEmpty();
      await page.getByTestId('next-question').click();
    }
    const summary = page.getByTestId('interview-summary');
    await expect(summary).toContainText('Total score:');
    await expect(summary).toContainText('Strong topics');
    await expect(summary).toContainText('Weak topics');
    await expect(summary).toContainText('Improvement suggestions');
    await expect(page.getByTestId('next-session')).toBeVisible();
  });

  test('technical answers are evaluated with missing points and suggestions', async ({ page }) => {
    await registerViaApi(page);
    await page.goto('/mock-interview');
    await page.getByTestId('iv-category').selectOption('Fintech & Payments');
    await page.getByTestId('iv-mode').selectOption('Scenario');
    await page.getByTestId('iv-count').selectOption('3');
    await page.getByTestId('start-interview').click();
    await expect(page.getByTestId('question-text')).not.toBeEmpty();
    await page.getByTestId('answer-input').fill('I would check the logs.');
    await page.getByTestId('submit-answer').click();
    await expect(page.getByTestId('feedback')).toContainText('built-in key-point grader');
    await expect(page.getByTestId('missing-points').locator('li').first()).toBeVisible();
    await expect(page.getByText('How to improve')).toBeVisible();
    expect(Number(await page.getByTestId('answer-score').innerText())).toBeLessThan(6);

    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'End interview' }).click();
    await expect(page.getByTestId('interview-summary')).toContainText('2 unanswered');
  });

  test('timed interview shows a countdown and the server enforces order', async ({ page }) => {
    await registerViaApi(page);
    await page.goto('/mock-interview');
    await page.getByTestId('iv-timed').check();
    await page.getByTestId('start-interview').click();
    await expect(page.getByTestId('timer')).toHaveText(/1[45]:\d\d/);
    const id = page.url().split('/').pop()!;
    const res = await page.request.post(`/api/interviews/${id}/answer`, { data: { questionId: 'not-the-current-one', answer: 'x' } });
    expect(res.status()).toBe(409);
  });
});

test.describe('Interview preparation', () => {
  test('topics, study notes and ideal answers for every category', async ({ page }) => {
    await registerViaApi(page);
    await page.goto('/prep');
    for (const cat of ['Manual Testing', 'API Testing', 'SQL', 'Automation Testing', 'Performance Testing', 'Fintech & Payments']) {
      await page.getByRole('tab', { name: cat, exact: true }).click();
      await expect(page.getByTestId('topic-card').first()).toBeVisible();
    }
    await page.getByTestId('topic-card').filter({ has: page.getByRole('heading', { name: 'ISO 8583 and MTI' }) }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Key concepts');
    const open = dialog.getByTestId('bank-question').filter({ hasNotText: /^A\. / }).filter({ hasNot: page.locator('ol') }).first();
    await open.getByRole('button', { name: 'Show ideal answer' }).click();
    await expect(open.getByRole('button', { name: 'Hide answer' })).toBeVisible();
    await expect(open.getByText('Key points interviewers look for')).toBeVisible();
  });
});
