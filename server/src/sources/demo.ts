import type { RawJob } from './types.js';

/**
 * DEMO DATA – fictional companies and listings, used only when no live source has data.
 * Every company name is invented and suffixed "(Demo)" so it can never be mistaken for a real opening.
 */
const T = [
  ['Senior QA Engineer – Payments', 'Northwind Payments (Demo)', 'Bengaluru, Karnataka', 3, 5, 'Fintech', 'Full time', '14–20 LPA',
    'Test card-present and card-not-present payment flows end to end. Validate authorization, clearing and settlement files, reconciliation reports and ISO 8583 messages. Write API tests in Postman, SQL validation queries and regression suites. Skills: Manual Testing, API Testing, Postman, SQL, Jira, ISO 8583, Settlement, Reconciliation.'],
  ['API Test Engineer', 'Lumen Ledger (Demo)', 'Hyderabad, Telangana', 3, 6, 'Fintech', 'Full time', '12–18 LPA',
    'Own API quality for the core banking ledger. Design positive/negative test suites for REST APIs, chain requests in Postman/Newman, validate data with SQL and automate checks in Rest Assured or Playwright API testing. Agile/Scrum team, Jira, CI/CD with Jenkins.'],
  ['QA Automation Engineer (Playwright, TypeScript)', 'Cobalt Commerce (Demo)', 'Remote (India)', 3, 5, 'Software', 'Full time', '15–22 LPA',
    'Build and maintain a Playwright + TypeScript automation framework using Page Object Model. Integrate tests into GitHub Actions CI/CD, add API checks, report flaky tests and mentor manual testers. JavaScript, TypeScript, Playwright, Cucumber BDD, Git.'],
  ['Performance Test Engineer – JMeter', 'Vertex Banking Systems (Demo)', 'Bengaluru, Karnataka', 3, 5, 'Banking', 'Full time', '13–19 LPA',
    'Plan and execute load, stress, spike and endurance tests with Apache JMeter for UPI and IMPS transaction services. Analyse throughput, response time percentiles and bottlenecks; present performance reports. Experience with Grafana and SQL preferred.'],
  ['Manual QA Engineer – UPI', 'Saffron Pay (Demo)', 'Bengaluru, Karnataka', 2, 4, 'Fintech', 'Full time', '8–12 LPA',
    'Functional, regression, smoke and sanity testing for UPI collect and intent flows, refunds, and transaction status reconciliation with NPCI responses. Write test scenarios and test cases, log defects in Jira, SQL for data validation.'],
  ['Fintech QA Analyst – Acquiring', 'Meridian Merchant Services (Demo)', 'Hyderabad, Telangana', 4, 6, 'Fintech', 'Full time', '14–21 LPA',
    'Test merchant onboarding, MDR calculation, POS transactions, settlement (T+1) and chargeback workflows for an acquiring platform. Validate ISO 8583 MTI 0100/0110, 0200/0210 and 0400 reversal messages. Spira or Jira test management, SQL.'],
  ['SDET – Payment Gateway', 'Northwind Payments (Demo)', 'Bengaluru, Karnataka', 4, 7, 'Fintech', 'Full time', '20–28 LPA',
    'Automation for payment gateway APIs and checkout UI with Selenium/Java and TestNG, Rest Assured, Kafka event validation, Docker based test environments, CI/CD in Jenkins. Strong payments domain knowledge: auth, capture, void, refund.'],
  ['QA Engineer', 'Brightpath Learning (Demo)', 'Hyderabad, Telangana', 1, 3, 'Software', 'Full time', '6–9 LPA',
    'Manual and exploratory testing of a web learning platform. Test case design, regression cycles, Jira defect tracking, basic SQL. Exposure to Selenium is a plus.'],
  ['Senior Test Engineer – Cards', 'Lumen Ledger (Demo)', 'Remote (India)', 5, 8, 'Banking', 'Full time', '18–26 LPA',
    'Card issuing QA: test authorization rules, clearing files from Visa and Mastercard, dispute and chargeback lifecycle, decline codes. API testing with Postman, SQL heavy data validation, automation in Java with Cucumber.'],
  ['QA Automation Engineer – Selenium Java', 'Harbor Insurance Tech (Demo)', 'Bengaluru, Karnataka', 3, 5, 'Insurance', 'Full time', '12–17 LPA',
    'Develop Selenium WebDriver tests in Java with TestNG and Cucumber, maintain Page Object Model framework, run suites in Jenkins pipelines, API validation with Rest Assured. Agile team, Git, Jira.'],
  ['Performance QA Engineer', 'Cobalt Commerce (Demo)', 'Remote (India)', 3, 6, 'Software', 'Contract', null,
    'Contract role for load testing an e-commerce checkout with JMeter and k6. Build thread groups with realistic ramp-up, correlate dynamic values, monitor throughput and errors, report bottlenecks to engineering.'],
  ['QA Lead – Reconciliation Platform', 'Vertex Banking Systems (Demo)', 'Hyderabad, Telangana', 6, 9, 'Banking', 'Full time', '25–32 LPA',
    'Lead a QA team for a reconciliation and settlement platform. Define test strategy, coordinate UAT with banks, review SQL validation of NEFT/RTGS/IMPS settlement files and manage release sign-off.'],
  ['API & Integration Tester', 'Saffron Pay (Demo)', 'Remote (India)', 3, 5, 'Fintech', 'Full time', '11–16 LPA',
    'Test merchant integration APIs, webhooks and payment status callbacks. Postman collections with environment chaining, negative testing of authentication and idempotency, SQL checks, Jira. Knowledge of payment failure scenarios and refunds.'],
  ['Software Test Engineer – POS', 'Meridian Merchant Services (Demo)', 'Bengaluru, Karnataka', 3, 5, 'Fintech', 'Full time', '10–15 LPA',
    'Test Android POS terminals: card swipe, chip, contactless and UPI QR transactions, void and refund, end-of-day batch settlement. ISO 8583 host simulator testing, regression and sanity cycles, Jira.'],
] as const;

export function demoJobs(): RawJob[] {
  const now = Date.now();
  const day = 86400000;
  const offsets = [0, 0, 1, 2, 2, 3, 4, 5, 6, 8, 10, 13, 18, 25];
  return T.map(([title, company, location, min, max, , jobType, salary, description], i) => {
    const sal = salary ? salary.match(/(\d+)–(\d+)/) : null;
    return {
      externalId: `demo-${i + 1}`,
      title,
      company,
      location,
      isRemote: /remote/i.test(location),
      description: `DEMO LISTING – fictional company, not a real vacancy.\n\n${description}`,
      postedAt: new Date(now - offsets[i % offsets.length] * day - i * 3600000),
      applyUrl: null,
      sourceSite: 'Demo data',
      salaryText: salary,
      salaryMinLpa: sal ? Number(sal[1]) : null,
      salaryMaxLpa: sal ? Number(sal[2]) : null,
      jobType,
      expMin: min,
      expMax: max,
      noticePeriod: i % 3 === 0 ? 'Immediate to 30 days' : i % 3 === 1 ? 'Up to 60 days' : null,
    };
  });
}

export const DEMO_INDUSTRY: Record<string, string> = Object.fromEntries(T.map((t) => [t[1], t[5]]));
