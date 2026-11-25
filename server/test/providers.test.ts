/** Parser tests for every provider, using saved sample JSON (no live calls). */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseAdzuna } from '../src/sources/providers/adzuna.js';
import { parseAmazon } from '../src/sources/providers/amazon.js';
import { parseAshby } from '../src/sources/providers/ashby.js';
import { cleanCompany, parseGreenhouse } from '../src/sources/providers/greenhouse.js';
import { parseJooble } from '../src/sources/providers/jooble.js';
import { parseJSearch } from '../src/sources/providers/jsearch.js';
import { parseLever } from '../src/sources/providers/lever.js';
import { parseArbeitnow, parseHimalayas, parseJobicy, parseRemotive } from '../src/sources/providers/remoteBoards.js';
import { parseSmartRecruiters } from '../src/sources/providers/smartrecruiters.js';
import { parseWorkday } from '../src/sources/providers/workday.js';
import { parseRelativePosted } from '../src/sources/providers/util.js';
import { toNormalized, type RawJob } from '../src/sources/types.js';

const fx = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));

/** Every parsed job must satisfy the common contract. */
function expectContract(jobs: RawJob[], source: string) {
  expect(jobs.length).toBeGreaterThan(0);
  for (const j of jobs) {
    expect(j.externalId).toBeTruthy();
    expect(typeof j.title).toBe('string');
    expect(j.title.length).toBeGreaterThan(0);
    expect(j.company).toBeTruthy();
    expect(typeof j.description).toBe('string');
    expect(j.description).not.toMatch(/<\/?(p|div|strong|br)\b/i); // plain text
    const n = toNormalized(j, source);
    expect(Object.keys(n).sort()).toEqual(['company', 'country', 'description', 'fetched_at', 'id', 'location', 'posted_date', 'remote', 'salary', 'source', 'title', 'url'].sort());
    if (n.posted_date) expect(n.posted_date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    if (n.url) expect(n.url).toMatch(/^https:\/\//);
  }
}

describe('ATS providers', () => {
  it('Greenhouse: list items and full jobs with entity-encoded HTML content', () => {
    const list = parseGreenhouse(fx('greenhouse-list.json').jobs, 'highradius');
    expectContract(list, 'greenhouse');
    const [full] = parseGreenhouse([fx('greenhouse-job.json')], 'highradius', 'HighRadius');
    expect(full).toMatchObject({ externalId: 'highradius:7611164003', title: 'Agent Developer Test III', company: 'HighRadius', location: 'Hyderabad, Telangana, India', country: 'IN', isRemote: false });
    expect(full.description).toContain('About Us');
    expect(full.description).not.toContain('&lt;');
    expect(full.applyUrl).toContain('gh_jid=7611164003');
    expect(cleanCompany('Rubrik Job Board')).toBe('Rubrik');
    expect(cleanCompany('Razorpay Software Private Limited')).toBe('Razorpay');
  });

  it('Lever: plain description, lists, country and hosted URL', () => {
    const jobs = parseLever(fx('lever.json'), 'zeta', 'Zeta');
    expectContract(jobs, 'lever');
    expect(jobs[0]).toMatchObject({ company: 'Zeta', location: 'Hyderabad', country: 'IN', jobType: 'Full-time' });
    expect(jobs[0].applyUrl).toMatch(/^https:\/\/jobs\.lever\.co\/zeta\//);
    expect(jobs[0].postedAt?.getFullYear()).toBeGreaterThan(2020);
  });

  it('Ashby: remote flag, country from postal address, compensation summary', () => {
    const jobs = parseAshby(fx('ashby.json'), 'sardine', 'Sardine');
    expectContract(jobs, 'ashby');
    expect(jobs[0]).toMatchObject({ title: 'Senior Manager, Quality Engineering', isRemote: true, country: 'US' });
    expect(jobs[0].applyUrl).toMatch(/^https:\/\/jobs\.ashbyhq\.com\/sardine\//);
  });

  it('SmartRecruiters: list items and full postings with jobAd sections', () => {
    expectContract(parseSmartRecruiters(fx('smartrecruiters-list.json').content, 'Experian'), 'smartrecruiters');
    const [j] = parseSmartRecruiters([fx('smartrecruiters-job.json')], 'Experian');
    expect(j).toMatchObject({ title: 'Performance Testing Lead', company: 'Experian', location: 'Hyderabad, India', country: 'IN', isRemote: false, jobType: 'Full-time' });
    expect(j.description.length).toBeGreaterThan(100);
    expect(j.applyUrl).toMatch(/^https:\/\/jobs\.smartrecruiters\.com\/Experian\//);
  });

  it('Workday: search results merged with job detail; relative dates', () => {
    const entry = { company: 'Salesforce', ats: 'workday' as const, workday: { tenant: 'salesforce', wd: 12, site: 'External_Career_Site' } };
    const list = fx('workday-list.json');
    const detail = fx('workday-job.json');
    const now = new Date('2026-11-25T00:00:00Z');
    const jobs = parseWorkday(list, entry, { [list.jobPostings[0].externalPath]: detail }, now);
    expectContract(jobs, 'workday');
    expect(jobs[0]).toMatchObject({ externalId: 'salesforce:JR301234', company: 'Salesforce', location: 'India - Hyderabad', country: 'IN', jobType: 'Full time' });
    expect(jobs[0].description).toContain('Selenium');
    expect(jobs[0].postedAt?.toISOString().slice(0, 10)).toBe('2026-11-22');
    // Without detail: URL built from the tenant/site and the relative "Posted Today" date.
    expect(jobs[1].applyUrl).toBe('https://salesforce.wd12.myworkdayjobs.com/en-US/External_Career_Site/job/India---Bangalore/Software-Engineer--Backend_JR301999');
    expect(jobs[1].postedAt?.toISOString()).toBe(now.toISOString());
    expect(parseRelativePosted('Posted 30+ Days Ago', now)?.toISOString().slice(0, 10)).toBe('2026-10-26');
    expect(parseRelativePosted('Posted Yesterday', now)?.toISOString().slice(0, 10)).toBe('2026-11-24');
  });

  it('Amazon: qualifications appended, ISO-3 country mapped, amazon.jobs link', () => {
    const jobs = parseAmazon(fx('amazon.json'));
    expectContract(jobs, 'amazon');
    expect(jobs[0]).toMatchObject({ externalId: '10607788', title: 'Quality Assurance Engineer II, ISFX QA', company: 'Amazon', location: 'Hyderabad, Telangana, IND', country: 'IN' });
    expect(jobs[0].applyUrl).toBe('https://www.amazon.jobs/en/jobs/10607788/quality-assurance-engineer-ii-isfx-qa');
    expect(jobs[0].description).toContain('Basic qualifications');
    expect(jobs[0].postedAt?.getMonth()).toBe(10); // November
  });
});

describe('Job-search API providers', () => {
  it('Adzuna: HTML stripped from title, INR salary to LPA', () => {
    const [j] = parseAdzuna(fx('adzuna.json'), 'in');
    expectContract([j], 'adzuna');
    expect(j).toMatchObject({ title: 'QA Automation Engineer', company: 'Acme Fintech', country: 'IN', salaryMinLpa: 12, salaryMaxLpa: 18, jobType: 'full time' });
  });

  it('Jooble: snippet as description, salary text kept', () => {
    const [j] = parseJooble(fx('jooble.json'));
    expectContract([j], 'jooble');
    expect(j).toMatchObject({ title: 'SDET - API Automation', company: 'Beta Payments', country: 'IN', salaryText: '₹15–20 LPA' });
    expect(j.description).toContain('Rest Assured');
  });

  it('JSearch: experience from months, yearly salary to LPA', () => {
    const [j] = parseJSearch(fx('jsearch.json'));
    expectContract([j], 'jsearch');
    expect(j).toMatchObject({ location: 'Hyderabad, Telangana, IN', country: 'IN', expMin: 4, salaryMinLpa: 15, salaryMaxLpa: 22, sourceSite: 'LinkedIn' });
  });

  it('Remotive: always remote, restriction kept in location', () => {
    const jobs = parseRemotive(fx('remotive.json'));
    expectContract(jobs, 'remotive');
    expect(jobs[0]).toMatchObject({ title: 'Content Reviewer - United States', isRemote: true, location: 'Remote (USA)', country: 'US', sourceSite: 'Remotive' });
  });

  it('Arbeitnow: unix created_at, on-site location', () => {
    const jobs = parseArbeitnow(fx('arbeitnow.json'));
    expectContract(jobs, 'arbeitnow');
    expect(jobs[0]).toMatchObject({ title: 'Quality Assurance Specialist', company: 'Motorway', location: 'Brighton', isRemote: false });
    expect(jobs[0].postedAt?.getFullYear()).toBe(2026);
  });

  it('Himalayas: location restrictions summarised, not open to India', () => {
    const jobs = parseHimalayas(fx('himalayas.json'));
    expectContract(jobs, 'himalayas');
    expect(jobs[0].location).toMatch(/^Remote \(.+…\)$/);
    expect(jobs[0].country).not.toBe('IN');
  });

  it('Jobicy: geo in location, original job URL kept', () => {
    const jobs = parseJobicy(fx('jobicy.json'));
    expectContract(jobs, 'jobicy');
    expect(jobs[0]).toMatchObject({ company: 'Thumbtack', location: 'Remote (Philippines)', isRemote: true });
    expect(jobs[0].applyUrl).toMatch(/^https:\/\/jobicy\.com\/jobs\//);
  });
});
