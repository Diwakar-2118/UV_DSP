import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { Document, Packer, Paragraph, TextRun } from 'docx';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Builds the DOCX resume fixture used by the resume tests. */
export default async function globalSetup() {
  const dir = path.join(here, 'fixtures');
  fs.mkdirSync(dir, { recursive: true });
  const lines = [
    'Priya Sharma',
    'priya.sharma@example.com | +91 98450 12345 | linkedin.com/in/priya-qa',
    '',
    'Professional Summary',
    'QA Engineer with 4 years of experience testing payment gateway and UPI products.',
    '',
    'Technical Skills',
    'Manual Testing, Functional Testing, Regression Testing, API Testing, Postman, SQL, Jira, Selenium, Java, Agile',
    '',
    'Professional Experience',
    'QA Engineer, Example Payments — Jan 2022 – Present',
    '• Responsible for testing UPI collect and refund flows',
    '• Wrote 250+ test cases and reduced regression time by 35%',
    '• Worked on settlement and reconciliation report validation using SQL',
    'Test Engineer, Example Soft — Jul 2020 – Dec 2021',
    '• Did functional and regression testing of web apps',
    '',
    'Projects',
    'Project: Merchant settlement reconciliation',
    '',
    'Education',
    'B.E. Computer Science',
  ];
  const doc = new Document({ sections: [{ children: lines.map((l) => new Paragraph({ children: [new TextRun(l)] })) }] });
  fs.writeFileSync(path.join(dir, 'resume.docx'), await Packer.toBuffer(doc));
  fs.writeFileSync(path.join(dir, 'notes.txt'), 'not a resume');

  // A real, text-based PDF rendered by Chromium from the same content.
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  await page.setContent(`<html><body style="font-family:Arial">${lines.map((l) => (l ? `<p>${esc(l)}</p>` : '<br>')).join('')}</body></html>`);
  await page.pdf({ path: path.join(dir, 'resume.pdf'), format: 'A4' });
  await browser.close();
}
