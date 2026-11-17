// Curated study notes for QA engineers (3-5 yrs) preparing for fintech / payments interviews.

export const CATEGORIES = [
  'Manual Testing',
  'API Testing',
  'SQL',
  'Automation Testing',
  'Performance Testing',
  'Fintech & Payments',
  'HR',
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface PrepTopic {
  topic: string;
  summary: string;
  keyConcepts: string[];
  example?: string;
}

export const PREP_TOPICS: Record<Category, PrepTopic[]> = {
  'Manual Testing': [
    {
      topic: 'SDLC',
      summary:
        'The Software Development Life Cycle is the end-to-end process for building software: requirement gathering, analysis, design, development, testing, deployment and maintenance. Common models are Waterfall, V-Model, Iterative, Spiral and Agile. QA should be involved from the requirement phase (shift-left) so that ambiguities are caught before code is written, when defects are cheapest to fix.',
      keyConcepts: [
        'Phases: requirements, design, development, testing, deployment, maintenance',
        'Models: Waterfall, V-Model, Spiral, Agile',
        'V-Model maps each dev phase to a test level',
        'Shift-left: involve QA early in requirement reviews',
        'Cost of a defect rises the later it is found',
      ],
      example:
        'V-Model mapping: Requirements -> Acceptance testing, System design -> System testing, Architecture -> Integration testing, Module design -> Unit testing.',
    },
    {
      topic: 'STLC',
      summary:
        'The Software Testing Life Cycle defines the testing activities inside the SDLC: requirement analysis, test planning, test case design, test environment setup, test execution and test closure. Each phase has entry and exit criteria and produces deliverables such as the RTM, test plan, test cases, defect reports and the test summary report.',
      keyConcepts: [
        'Requirement analysis -> RTM',
        'Test planning -> test plan, effort estimate',
        'Test design -> test cases, test data',
        'Environment setup and smoke check',
        'Execution -> defect logging and retesting',
        'Closure -> test summary report, lessons learned',
        'Entry and exit criteria for each phase',
      ],
      example:
        'Exit criteria for execution: 100% of planned P1/P2 test cases executed, no open Critical/High defects, pass rate >= 95%, all deferred defects signed off by the product owner.',
    },
    {
      topic: 'Test Scenarios',
      summary:
        'A test scenario is a high-level, one-line description of WHAT to test - a functionality or user flow - derived from requirements or user stories. One scenario usually expands into several detailed test cases. Scenarios help ensure coverage quickly and are useful when time is short or for exploratory sessions.',
      keyConcepts: [
        'High-level "what to test", not "how"',
        'Derived from requirements / user stories',
        'One scenario -> many test cases',
        'Cover positive, negative and edge flows',
        'Good for coverage review with BA / product',
      ],
      example:
        'Scenario: Verify that a customer can pay a merchant via UPI collect request. Test cases under it: approve with correct PIN, decline with wrong PIN, request expiry, insufficient balance, duplicate request.',
    },
    {
      topic: 'Test Cases',
      summary:
        'A test case is a detailed, step-by-step set of conditions used to verify a specific requirement. A good test case has an ID, title, preconditions, test data, steps, expected result, actual result, status and traceability to a requirement. Design techniques such as equivalence partitioning, boundary value analysis, decision tables and state transition help achieve coverage with fewer cases.',
      keyConcepts: [
        'Fields: ID, title, preconditions, steps, data, expected result',
        'Equivalence partitioning',
        'Boundary value analysis',
        'Decision table and state transition',
        'Traceability to requirements (RTM)',
        'Atomic, independent and repeatable',
      ],
      example:
        'TC_REF_004 | Partial refund greater than captured amount | Pre: txn captured for Rs 1000 | Steps: initiate refund of Rs 1200 | Expected: refund rejected with "refund amount exceeds refundable balance", no ledger entry created.',
    },
    {
      topic: 'Test Planning',
      summary:
        'A test plan documents the scope, approach, resources, schedule, environments, risks and entry/exit criteria for a testing effort (IEEE 829 style). It aligns stakeholders on what will and will not be tested and how quality will be measured. In Agile, a lightweight test strategy plus sprint-level planning is common instead of a heavy document.',
      keyConcepts: [
        'Scope: in-scope and out-of-scope',
        'Approach / test types and levels',
        'Resources, roles and schedule',
        'Environments and test data',
        'Risks and mitigation',
        'Entry / exit / suspension criteria',
        'Deliverables and metrics',
      ],
      example:
        'Risk: Bank sandbox unavailable on weekends -> Mitigation: use simulator for authorization responses and schedule E2E bank runs on weekdays.',
    },
    {
      topic: 'Functional Testing',
      summary:
        'Functional testing verifies that the system behaves according to functional requirements - inputs produce the expected outputs and business rules are enforced. It is black-box and covers unit, integration, system and acceptance levels. It contrasts with non-functional testing (performance, security, usability).',
      keyConcepts: [
        'Validates business requirements',
        'Black-box technique',
        'Levels: unit, integration, system, UAT',
        'Positive, negative and boundary inputs',
        'Different from non-functional testing',
      ],
      example:
        'Verify that a merchant cannot initiate a payout greater than the available settled balance, and that an appropriate error is shown.',
    },
    {
      topic: 'Regression Testing',
      summary:
        'Regression testing re-runs previously passing tests to make sure new changes, fixes or configuration updates have not broken existing functionality. Because the suite grows every release, it is the best candidate for automation and is usually prioritised by risk and impacted areas (selective regression) rather than always running the full suite.',
      keyConcepts: [
        'Ensures existing features still work after change',
        'Full vs selective (risk-based) regression',
        'Impact analysis drives test selection',
        'Prime candidate for automation and CI',
        'Run after bug fixes, enhancements, config changes',
      ],
      example:
        'A change to the MDR rate engine triggers regression of: fee calculation for all card types, settlement amount, invoice generation and refund fee reversal.',
    },
    {
      topic: 'Smoke Testing',
      summary:
        'Smoke testing is a quick, shallow check on a new build to confirm the critical paths work and the build is stable enough for detailed testing. It is also called build verification testing. If smoke fails, the build is rejected and returned to development without further testing.',
      keyConcepts: [
        'Build verification test (BVT)',
        'Broad and shallow',
        'Covers critical end-to-end paths',
        'Done on every new build / deployment',
        'Failure -> build rejected',
      ],
      example:
        'Smoke for a payment gateway: login to dashboard, create order, complete a test card payment, verify webhook received, view transaction in reports.',
    },
    {
      topic: 'Sanity Testing',
      summary:
        'Sanity testing is a narrow, deep check on a specific functionality after a minor change or bug fix, to confirm the change works and nothing closely related is broken. It is usually unscripted and a subset of regression. Smoke is broad-and-shallow on a new build; sanity is narrow-and-deep on a changed area.',
      keyConcepts: [
        'Narrow and deep',
        'After a small fix or change',
        'Usually unscripted',
        'Subset of regression',
        'Contrast with smoke (broad and shallow)',
      ],
      example:
        'After a fix for GST rounding on MDR, sanity checks fee calculation for a few amounts (Rs 1, Rs 99.99, Rs 100000) and the related settlement report.',
    },
    {
      topic: 'Retesting',
      summary:
        'Retesting (confirmation testing) is executing the failed test cases again after a defect is fixed, using the same steps and data, to confirm the fix. It is planned and specific to defects, whereas regression checks that the fix did not break other areas. Retesting has higher priority than regression and is generally not automated up front.',
      keyConcepts: [
        'Confirms a specific defect fix',
        'Same steps and test data as the failed case',
        'Planned per defect',
        'Different from regression',
        'Leads to closing or reopening the defect',
      ],
      example:
        'Defect: refund webhook sent twice. Retest: perform the same refund, verify exactly one webhook with unique event id; then run regression on other webhook events.',
    },
    {
      topic: 'Defect Lifecycle',
      summary:
        'The defect (bug) lifecycle is the set of states a defect moves through: New, Assigned, Open, Fixed, Pending Retest, Retest, Verified/Closed, with side states such as Rejected, Duplicate, Deferred, Not a Bug and Reopened. A good defect report has a clear title, environment, build, steps, expected vs actual, evidence (logs, screenshots, request/response) and severity.',
      keyConcepts: [
        'New -> Assigned -> Open -> Fixed -> Retest -> Closed',
        'Reopened if retest fails',
        'Rejected / Duplicate / Deferred / Not a bug',
        'Good bug report: steps, expected, actual, evidence',
        'Severity and priority set at logging / triage',
      ],
      example:
        'Title: "UPI payment shows SUCCESS in app but merchant receives FAILED webhook" | Env: UAT, build 4.12.0 | Evidence: txn id, webhook payload, app screenshot, server log timestamp.',
    },
    {
      topic: 'Severity and Priority',
      summary:
        'Severity is the impact of the defect on the system (set by QA): Critical, High/Major, Medium, Low. Priority is the urgency to fix it (usually set by product/lead): P1-P4. They are independent, so you can have high severity / low priority and low severity / high priority defects.',
      keyConcepts: [
        'Severity = impact (technical)',
        'Priority = urgency (business)',
        'QA sets severity; PO/lead sets priority',
        'High severity, low priority example',
        'Low severity, high priority example',
      ],
      example:
        'Low severity / high priority: wrong bank logo on checkout page. High severity / low priority: crash in a rarely used legacy report scheduled for removal.',
    },
    {
      topic: 'Agile and Scrum',
      summary:
        'Agile is an iterative approach delivering working software in short cycles. Scrum is a framework with roles (Product Owner, Scrum Master, Developers), events (Sprint, Sprint Planning, Daily Scrum, Sprint Review, Retrospective) and artifacts (Product Backlog, Sprint Backlog, Increment). QA participates in backlog refinement, defines acceptance criteria, tests within the sprint and contributes to the Definition of Done.',
      keyConcepts: [
        'Roles: PO, Scrum Master, Developers',
        'Events: planning, daily scrum, review, retro',
        'Artifacts: product backlog, sprint backlog, increment',
        'User stories with acceptance criteria',
        'Definition of Done includes testing',
        'Story points and velocity',
      ],
      example:
        'Acceptance criteria (Given/When/Then): Given a captured transaction, When the merchant requests a full refund, Then refund status is INITIATED and refundable balance becomes 0.',
    },
    {
      topic: 'Real-time Project Scenarios',
      summary:
        'Interviewers ask how you handled real situations: unclear requirements, a production defect, tight deadlines, environment downtime, or disagreement with developers over a bug. Answer with the STAR format (Situation, Task, Action, Result), show risk-based prioritisation, clear communication and data (logs, metrics) rather than opinions.',
      keyConcepts: [
        'STAR format answers',
        'Risk-based prioritisation under deadlines',
        'Root cause analysis for production leaks',
        'Communicate with evidence (logs, requests)',
        'Escalate early with options',
      ],
      example:
        'Production leak: a refund edge case escaped. Action: reproduced in UAT, added test case and automation, updated RTM, shared RCA (missing partial-refund-after-settlement case).',
    },
  ],

  'API Testing': [
    {
      topic: 'REST APIs',
      summary:
        'REST (Representational State Transfer) is an architectural style where resources are identified by URIs and manipulated through standard HTTP methods. REST APIs are stateless (each request carries all context), use uniform interfaces, and typically exchange JSON. API testing validates the business logic layer directly, faster and earlier than UI testing.',
      keyConcepts: [
        'Resources identified by URIs',
        'Stateless requests',
        'Standard HTTP methods',
        'JSON payloads (usually)',
        'Client-server, cacheable, layered',
        'REST vs SOAP (XML, WSDL, strict contract)',
      ],
      example: 'GET /v1/payments/pay_123 -> 200 OK {"id":"pay_123","status":"captured","amount":50000,"currency":"INR"}',
    },
    {
      topic: 'HTTP Methods',
      summary:
        'GET reads a resource, POST creates or triggers an action, PUT replaces a resource, PATCH partially updates it, DELETE removes it. GET, PUT and DELETE are idempotent (repeating the same request has the same effect); POST is not idempotent, which is why payment APIs use an Idempotency-Key header to make retries safe. GET is also "safe" (no state change).',
      keyConcepts: [
        'GET read, POST create, PUT replace, PATCH partial update, DELETE remove',
        'Idempotent: GET, PUT, DELETE (also HEAD, OPTIONS)',
        'POST and PATCH are not guaranteed idempotent',
        'Safe methods do not change state (GET, HEAD)',
        'Idempotency-Key for safe payment retries',
      ],
      example:
        'POST /v1/refunds with header Idempotency-Key: 7f3c... sent twice -> only one refund created; second call returns the same refund object.',
    },
    {
      topic: 'HTTP Status Codes',
      summary:
        'Status codes are grouped: 1xx informational, 2xx success, 3xx redirection, 4xx client errors, 5xx server errors. Know the common ones: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized (not authenticated / bad credentials), 403 Forbidden (authenticated but not allowed), 404 Not Found, 409 Conflict, 422 Unprocessable Entity, 429 Too Many Requests, 500, 502, 503, 504.',
      keyConcepts: [
        '2xx success, 4xx client error, 5xx server error',
        '200 vs 201 vs 204',
        '401 = not authenticated; 403 = authenticated but forbidden',
        '409 conflict, 422 validation, 429 rate limit',
        '502 bad gateway, 503 unavailable, 504 gateway timeout',
      ],
      example: 'Calling the refunds API with a valid key that lacks refund permission -> 403 Forbidden; with an expired token -> 401 Unauthorized.',
    },
    {
      topic: 'Request and Response',
      summary:
        'An HTTP request has a method, URL (with path and query parameters), headers and an optional body. A response has a status code, headers and an optional body. API tests should validate status code, response body (values and schema), headers, response time and side effects such as database records.',
      keyConcepts: [
        'Request: method, URL, path/query params, headers, body',
        'Response: status, headers, body',
        'Validate schema and field values',
        'Validate response time',
        'Verify DB / downstream side effects',
      ],
      example:
        'POST /v1/orders  Content-Type: application/json  {"amount":10000,"currency":"INR","receipt":"rcpt_11"} -> 201 {"id":"order_9","status":"created"}',
    },
    {
      topic: 'Headers',
      summary:
        'Headers carry metadata about the request or response. Common request headers: Content-Type, Accept, Authorization, Idempotency-Key, X-Request-Id/correlation id, User-Agent. Common response headers: Content-Type, Cache-Control, Location (after 201), Retry-After (with 429/503) and rate-limit headers. Testers should check missing/invalid header handling.',
      keyConcepts: [
        'Content-Type vs Accept',
        'Authorization (Bearer / Basic)',
        'Idempotency-Key for retries',
        'Correlation / request id for tracing',
        'Retry-After, rate-limit headers',
        'Negative tests: missing / wrong headers',
      ],
      example: 'Sending XML with Content-Type: application/json should return 400; missing Authorization should return 401.',
    },
    {
      topic: 'Authentication',
      summary:
        'Authentication verifies who the caller is; authorization decides what they can do. Common schemes: API keys, Basic auth (base64 of key:secret - only safe over HTTPS), Bearer tokens / JWT, OAuth 2.0 (client credentials, authorization code) and mutual TLS. Payment webhooks are usually verified with an HMAC signature computed using a shared secret.',
      keyConcepts: [
        'Authentication vs authorization',
        'API key, Basic auth, Bearer token',
        'JWT: header.payload.signature, expiry (exp)',
        'OAuth 2.0 grant types',
        'HMAC signature for webhooks',
        'Test expired, invalid, missing tokens',
      ],
      example: 'Webhook check: compute HMAC-SHA256(raw_body, webhook_secret) and compare with the X-Signature header; reject on mismatch.',
    },
    {
      topic: 'JSON',
      summary:
        'JSON is a text format of objects (key/value), arrays, strings, numbers, booleans and null. API testers validate field presence, data types, formats, nested structures and use JSON Schema for contract checks. In payments, amounts are often sent as integers in the smallest unit (paise) to avoid floating-point errors.',
      keyConcepts: [
        'Objects, arrays, primitive types, null',
        'JSON Schema validation',
        'Required vs optional fields',
        'Data types and formats (date, enum)',
        'Amounts in paise / minor units',
      ],
      example: '{"id":"rfnd_1","amount":25050,"currency":"INR","status":"processed","notes":{"reason":"damaged"}}  // 25050 paise = Rs 250.50',
    },
    {
      topic: 'Postman',
      summary:
        'Postman is a tool for building, sending and testing API requests. Key features: collections, environments and variables, pre-request scripts, test scripts with pm.test / pm.expect (Chai), collection runner with data files (CSV/JSON), and Newman for running collections from CLI / CI pipelines.',
      keyConcepts: [
        'Collections and folders',
        'Environment / global / collection variables',
        'Pre-request scripts',
        'Tests with pm.test and pm.expect',
        'Collection runner with data files',
        'Newman for CI',
      ],
      example: `pm.test("status is 201", () => pm.response.to.have.status(201));
const body = pm.response.json();
pm.test("order created", () => pm.expect(body.status).to.eql("created"));
pm.environment.set("orderId", body.id);`,
    },
    {
      topic: 'API Automation',
      summary:
        'API automation uses code-based frameworks such as RestAssured (Java), Playwright APIRequestContext / Supertest / Axios with Jest or Mocha (JS/TS), or Postman+Newman. A good framework has reusable clients, environment config, data builders, schema validation, reporting and CI integration. API tests are faster and more stable than UI tests and form the middle of the test pyramid.',
      keyConcepts: [
        'RestAssured, Playwright request, Supertest, Newman',
        'Reusable API client / service layer',
        'Config per environment',
        'Schema validation',
        'Test data setup and cleanup',
        'Run in CI, publish reports',
      ],
      example: `const res = await request.post('/v1/orders', { data: { amount: 10000, currency: 'INR' } });
expect(res.status()).toBe(201);
expect((await res.json()).status).toBe('created');`,
    },
    {
      topic: 'Positive and Negative Testing',
      summary:
        'Positive tests use valid inputs to confirm the API works as intended. Negative tests send invalid, missing, boundary or malicious input and verify the API fails gracefully with the right status code and error message, without side effects. Payment APIs need heavy negative coverage: invalid amounts, currency, auth, duplicates and state violations.',
      keyConcepts: [
        'Positive: valid inputs, expected success',
        'Negative: invalid / missing / wrong type',
        'Boundary values (0, negative, max amount)',
        'Correct 4xx code and error message',
        'No side effects on failure',
        'Invalid state transitions',
      ],
      example: 'Refund of amount 0, amount > captured, on a failed payment, or with a wrong currency -> each must return 400 with a clear error and create no refund record.',
    },
    {
      topic: 'API Chaining',
      summary:
        'API chaining passes data from one response into the next request to test an end-to-end flow - e.g. create order -> pay -> capture -> refund -> fetch refund. In Postman this is done by saving values to variables in test scripts; in code by storing them in variables or context objects.',
      keyConcepts: [
        'Extract value from response',
        'Store in variable / context',
        'Use in subsequent request',
        'Validates end-to-end business flows',
        'Handle async states with polling',
      ],
      example: 'POST /orders -> save orderId; POST /payments {orderId} -> save paymentId; POST /payments/{paymentId}/capture; POST /payments/{paymentId}/refunds.',
    },
    {
      topic: 'Payment API Scenarios',
      summary:
        'Payment API testing covers order creation, payment initiation, authorization, capture, refunds, webhooks and status inquiry. Critical areas: idempotency (no double charge on retries), amount/currency integrity, state machine transitions, webhook signature and retries, timeouts with status inquiry, and reconciliation of API data with the ledger.',
      keyConcepts: [
        'Idempotency and duplicate prevention',
        'Payment state machine transitions',
        'Webhook delivery, retries and signature',
        'Timeout handling and status inquiry',
        'Amount and currency integrity',
        'Refund limits and partial refunds',
      ],
      example: 'Capture an already-captured payment -> 400 "payment already captured"; capture more than authorized amount -> 400; capture after auth expiry -> error.',
    },
  ],

  SQL: [
    {
      topic: 'SELECT',
      summary:
        'SELECT retrieves columns from one or more tables. Testers use it to validate that UI/API actions are persisted correctly. Use specific columns instead of SELECT * in validations, DISTINCT to remove duplicates, aliases for readability and LIMIT/TOP to restrict rows.',
      keyConcepts: ['SELECT columns FROM table', 'DISTINCT', 'Column and table aliases', 'LIMIT / TOP', 'Logical order: FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY'],
      example: `SELECT txn_id, amount, status
FROM transactions
WHERE merchant_id = 'M1001'
LIMIT 10;`,
    },
    {
      topic: 'WHERE',
      summary:
        'WHERE filters rows before grouping. It supports comparison operators, AND/OR/NOT, IN, BETWEEN (inclusive), LIKE with % and _ wildcards, and IS NULL / IS NOT NULL. Note that "= NULL" never matches; you must use IS NULL.',
      keyConcepts: ['Comparison and logical operators', 'IN and BETWEEN (inclusive)', 'LIKE with % and _', 'IS NULL, not = NULL', 'WHERE filters rows, HAVING filters groups'],
      example: `SELECT * FROM transactions
WHERE status IN ('FAILED', 'PENDING')
  AND created_at BETWEEN '2025-01-01' AND '2025-01-31'
  AND rrn IS NULL;`,
    },
    {
      topic: 'ORDER BY',
      summary:
        'ORDER BY sorts the result set by one or more columns, ascending by default or DESC. It is evaluated after SELECT, so it can use column aliases. NULL ordering differs by database (e.g. NULLs last in ascending order in PostgreSQL and Oracle, first in MySQL and SQL Server).',
      keyConcepts: ['ASC default, DESC', 'Multiple sort columns', 'Can use aliases', 'NULL ordering is DB-specific', 'Combine with LIMIT for top-N'],
      example: `SELECT merchant_id, amount FROM transactions
ORDER BY amount DESC, created_at ASC
LIMIT 5;`,
    },
    {
      topic: 'GROUP BY',
      summary:
        'GROUP BY collapses rows with the same values into groups so aggregate functions can be applied per group. Every non-aggregated column in SELECT must appear in GROUP BY (in standard SQL). HAVING filters groups after aggregation.',
      keyConcepts: ['Groups rows by column values', 'Used with aggregates', 'Non-aggregated columns must be grouped', 'HAVING filters aggregated groups', 'WHERE runs before GROUP BY'],
      example: `SELECT merchant_id, COUNT(*) AS txn_count, SUM(amount) AS total
FROM transactions
WHERE status = 'SUCCESS'
GROUP BY merchant_id
HAVING SUM(amount) > 100000;`,
    },
    {
      topic: 'JOINS',
      summary:
        'INNER JOIN returns only matching rows from both tables. LEFT JOIN returns all rows from the left table plus matching right rows, with NULLs where there is no match. RIGHT JOIN is the mirror, FULL OUTER JOIN returns all rows from both, CROSS JOIN is a Cartesian product and SELF JOIN joins a table to itself. LEFT JOIN ... WHERE right.key IS NULL is the classic pattern to find missing records.',
      keyConcepts: ['INNER: matches only', 'LEFT: all left rows, NULLs for no match', 'RIGHT and FULL OUTER', 'CROSS and SELF join', 'LEFT JOIN + IS NULL finds missing rows', 'Filter in ON vs WHERE changes LEFT JOIN results'],
      example: `-- Authorized transactions with no clearing record
SELECT a.txn_id, a.amount
FROM authorizations a
LEFT JOIN clearing c ON c.txn_id = a.txn_id
WHERE c.txn_id IS NULL;`,
    },
    {
      topic: 'Subqueries',
      summary:
        'A subquery is a query nested inside another. It can be scalar (returns one value), row/table (used with IN, EXISTS or in FROM as a derived table) or correlated (references the outer query and runs per outer row). EXISTS is often clearer than IN for existence checks, and NOT IN behaves unexpectedly if the subquery returns NULL.',
      keyConcepts: ['Scalar subquery', 'IN / EXISTS subqueries', 'Derived tables in FROM', 'Correlated subqueries', 'NOT IN with NULLs returns no rows', 'Often replaceable by JOIN or CTE'],
      example: `SELECT * FROM transactions t
WHERE amount > (SELECT AVG(amount) FROM transactions WHERE merchant_id = t.merchant_id);`,
    },
    {
      topic: 'Aggregate Functions',
      summary:
        'Aggregate functions compute a single value over a set of rows: COUNT, SUM, AVG, MIN, MAX. COUNT(*) counts all rows while COUNT(column) ignores NULLs; SUM/AVG also ignore NULLs. They are used with GROUP BY for per-group results and with HAVING for group filters.',
      keyConcepts: ['COUNT, SUM, AVG, MIN, MAX', 'COUNT(*) vs COUNT(col)', 'Aggregates ignore NULLs (except COUNT(*))', 'COUNT(DISTINCT col)', 'Used with GROUP BY / HAVING'],
      example: `SELECT COUNT(*) total, COUNT(rrn) with_rrn, SUM(amount) gross, AVG(amount) avg_ticket
FROM transactions WHERE txn_date = '2025-03-01';`,
    },
    {
      topic: 'Data Validation',
      summary:
        'Testers use SQL to validate that data written by the application is complete, accurate and consistent: correct values after a UI/API action, referential integrity, totals matching between source and target (e.g. transactions vs settlement), no orphan or NULL mandatory fields, and correct status transitions.',
      keyConcepts: ['Verify values after UI/API action', 'Source vs target count and sum checks', 'Orphan records via LEFT JOIN', 'NULL checks on mandatory columns', 'Status consistency across tables'],
      example: `SELECT s.batch_id, s.net_amount, SUM(t.amount - t.mdr - t.gst) AS calc_net
FROM settlements s JOIN transactions t ON t.settlement_batch_id = s.batch_id
GROUP BY s.batch_id, s.net_amount
HAVING s.net_amount <> SUM(t.amount - t.mdr - t.gst);`,
    },
    {
      topic: 'Duplicate Records',
      summary:
        'Duplicates are found by grouping on the business key and filtering HAVING COUNT(*) > 1. To see all duplicate rows or delete extras, use ROW_NUMBER() OVER (PARTITION BY key ORDER BY ...) and keep row 1. In payments, duplicates on RRN, order id or UTR can mean double debits or double settlements.',
      keyConcepts: ['GROUP BY key HAVING COUNT(*) > 1', 'ROW_NUMBER() OVER (PARTITION BY ...)', 'Keep first, delete others', 'Define the business key correctly', 'Unique constraints prevent duplicates'],
      example: `SELECT rrn, COUNT(*) FROM transactions
GROUP BY rrn HAVING COUNT(*) > 1;`,
    },
    {
      topic: 'Real-time SQL Questions',
      summary:
        'Common interview queries: second highest value, Nth highest with DENSE_RANK, duplicates, records in one table but not another, daily totals, top-N per group, and running totals with window functions. Be ready to explain edge cases like ties, NULLs and performance (indexes on join/filter columns).',
      keyConcepts: ['Second / Nth highest', 'DENSE_RANK vs RANK vs ROW_NUMBER', 'Top-N per group', 'Missing records between tables', 'Running totals with SUM() OVER', 'Handle ties and NULLs'],
      example: `SELECT MAX(amount) FROM transactions
WHERE amount < (SELECT MAX(amount) FROM transactions);`,
    },
  ],

  'Automation Testing': [
    {
      topic: 'Selenium',
      summary:
        'Selenium WebDriver automates browsers via the W3C WebDriver protocol, with bindings for Java, Python, C#, JS and more. Key concepts: WebDriver and browser drivers, locators, waits (implicit, explicit, fluent), handling frames, windows, alerts, and Selenium Grid for parallel and cross-browser execution. Selenium 4 added relative locators and native CDP support for Chromium.',
      keyConcepts: ['WebDriver + browser drivers', 'Implicit vs explicit vs fluent waits', 'Frames, windows, alerts', 'Selenium Grid for parallel runs', 'Selenium 4: W3C protocol, relative locators', 'Avoid Thread.sleep'],
      example: `WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
wait.until(ExpectedConditions.elementToBeClickable(By.id("payNow"))).click();`,
    },
    {
      topic: 'Playwright',
      summary:
        'Playwright is a Microsoft framework for Chromium, Firefox and WebKit with built-in auto-waiting, web-first assertions, browser contexts for isolation, network interception, tracing and a built-in test runner (@playwright/test) with parallelism and retries. It also supports API testing through APIRequestContext.',
      keyConcepts: ['Auto-waiting and web-first assertions', 'Browser, context, page', 'Locators: getByRole, getByTestId', 'Network mocking with page.route', 'Trace viewer, screenshots, video', 'Parallel workers, retries, projects'],
      example: `test('pay with card', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Pay' }).click();
  await expect(page.getByText('Payment successful')).toBeVisible();
});`,
    },
    {
      topic: 'JavaScript',
      summary:
        'JavaScript fundamentals needed for automation: let/const, arrow functions, objects and arrays, destructuring, array methods (map, filter, reduce), promises and async/await, the event loop, closures, modules, and == vs ===. Most UI automation bugs in JS come from missing await.',
      keyConcepts: ['let / const / var scope', '== vs ===', 'Promises and async/await', 'Array methods: map, filter, reduce', 'Closures and modules', 'Missing await causes flaky tests'],
      example: `const failed = txns.filter(t => t.status === 'FAILED').map(t => t.id);
const total = txns.reduce((sum, t) => sum + t.amount, 0);`,
    },
    {
      topic: 'TypeScript',
      summary:
        'TypeScript adds static types to JavaScript, catching errors at compile time and improving IDE support. Useful features for test frameworks: interfaces/types for payloads, enums or union types for statuses, generics for API clients, optional chaining and strict null checks. TS compiles to JS; Playwright runs TS tests directly.',
      keyConcepts: ['Interfaces and type aliases', 'Union types and enums', 'Generics', 'Strict null checks', 'Optional chaining ?. and nullish ??', 'Compile-time safety for test data'],
      example: `type TxnStatus = 'SUCCESS' | 'FAILED' | 'PENDING';
interface Txn { id: string; amount: number; status: TxnStatus }`,
    },
    {
      topic: 'Locators',
      summary:
        'Locators identify elements: id, name, className, tagName, linkText, CSS selector and XPath in Selenium; Playwright prefers user-facing locators like getByRole, getByLabel, getByText and getByTestId. Prefer stable, unique attributes (data-testid, id) over brittle absolute XPath or index-based selectors.',
      keyConcepts: ['id, name, CSS, XPath', 'Relative vs absolute XPath', 'XPath axes: following-sibling, ancestor', 'Playwright getByRole / getByTestId', 'Prefer stable data-testid attributes'],
      example: `//td[text()='TXN123']/following-sibling::td[@class='status']
css: [data-testid="refund-button"]`,
    },
    {
      topic: 'Assertions',
      summary:
        'Assertions verify expected outcomes. Hard assertions stop the test at the first failure; soft assertions collect failures and report at the end. Use framework assertions (TestNG Assert/SoftAssert, Jest/Playwright expect) and prefer web-first assertions that retry until timeout instead of reading a value once.',
      keyConcepts: ['Hard vs soft assertions', 'TestNG Assert / SoftAssert', 'Playwright expect auto-retry', 'Assert meaningful business outcomes', 'Clear failure messages'],
      example: `await expect(page.getByTestId('txn-status')).toHaveText('SUCCESS');
expect.soft(amountText).toBe('Rs 500.00');`,
    },
    {
      topic: 'Page Object Model',
      summary:
        'Page Object Model is a design pattern where each page or component is a class holding its locators and actions, while tests contain only the flow and assertions. It reduces duplication and makes maintenance easier: when the UI changes, only the page class changes. Page Factory is a Selenium (Java) helper for initialising elements.',
      keyConcepts: ['One class per page / component', 'Locators + actions in page class', 'Tests contain flow and assertions', 'Reusability and maintainability', 'Page Factory (@FindBy) in Selenium Java'],
      example: `class CheckoutPage {
  constructor(private page: Page) {}
  async pay(card: string) {
    await this.page.getByLabel('Card number').fill(card);
    await this.page.getByRole('button', { name: 'Pay' }).click();
  }
}`,
    },
    {
      topic: 'Framework Architecture',
      summary:
        'A typical automation framework is hybrid: POM for UI, a service layer for APIs, data-driven tests (JSON/Excel/CSV), config per environment, utilities (waits, DB, logging), test runner (TestNG/JUnit/Playwright Test), reporting (Allure/Extent/HTML) and CI integration. Be ready to draw your framework and explain folder structure and how a test runs end to end.',
      keyConcepts: ['Hybrid: POM + data-driven + keyword/BDD', 'Config and environment management', 'Utilities: DB, API, logging', 'Test runner and parallel execution', 'Reporting (Allure / Extent)', 'CI integration'],
      example: 'src/pages, src/api, src/utils, tests/ui, tests/api, test-data/*.json, config/{qa,uat}.env, reports/ -> run via npx playwright test --project=chromium in Jenkins.',
    },
    {
      topic: 'Cucumber',
      summary:
        'Cucumber supports BDD: behaviour is written in Gherkin feature files (Feature, Scenario, Given/When/Then, And, But, Background, Scenario Outline with Examples) and mapped to step definitions in code. Tags filter execution and hooks (Before/After) handle setup and teardown. It improves collaboration with business stakeholders.',
      keyConcepts: ['Gherkin: Given / When / Then', 'Feature files and step definitions', 'Scenario Outline with Examples', 'Background for common steps', 'Tags and hooks', 'Runner configuration'],
      example: `Scenario Outline: Refund validation
  Given a captured payment of <captured>
  When I refund <refund>
  Then the refund status is "<status>"
  Examples:
    | captured | refund | status   |
    | 1000     | 500    | INITIATED|
    | 1000     | 1500   | REJECTED |`,
    },
    {
      topic: 'CI/CD',
      summary:
        'Continuous Integration builds and tests every commit automatically; Continuous Delivery/Deployment pushes validated builds to environments. Automation suites run in pipelines (Jenkins, GitHub Actions, GitLab CI, Azure DevOps): smoke on every PR, regression nightly, with reports and artifacts published and failures notified. Docker and Selenium Grid / cloud grids enable parallel runs.',
      keyConcepts: ['CI vs continuous delivery vs deployment', 'Jenkins / GitHub Actions / GitLab CI', 'Smoke on PR, regression nightly', 'Parallel execution, Docker', 'Publish reports and artifacts', 'Quality gates'],
      example: `- run: npm ci
- run: npx playwright install --with-deps
- run: npx playwright test --grep @smoke`,
    },
    {
      topic: 'Automation Best Practices',
      summary:
        'Automate stable, repetitive, high-value cases (regression, smoke, data-driven) rather than one-off or highly volatile UI. Keep tests independent, use explicit waits, avoid hard sleeps, manage test data, follow the test pyramid (more unit/API, fewer UI), and fix or quarantine flaky tests quickly.',
      keyConcepts: ['Choose what to automate (ROI)', 'Test pyramid', 'Independent, idempotent tests', 'No hard sleeps; explicit waits', 'Test data management', 'Handle flaky tests (root cause, quarantine)'],
      example: 'Flaky test fix: replace sleep(5000) with waiting for the payment status API to return SUCCESS, and create a fresh order per test instead of reusing a shared one.',
    },
  ],

  'Performance Testing': [
    {
      topic: 'Apache JMeter',
      summary:
        'Apache JMeter is an open-source Java tool for load testing web apps and APIs. A test plan contains Thread Groups, Samplers (HTTP Request), Config Elements (CSV Data Set Config, HTTP Header Manager), Pre/Post Processors (JSON Extractor), Timers, Assertions and Listeners. Real load should be run in non-GUI mode and results analysed via the HTML dashboard.',
      keyConcepts: ['Test plan, thread group, sampler', 'Config elements: CSV Data Set, Header Manager', 'Extractors for correlation', 'Timers for think time', 'Assertions and listeners', 'Non-GUI mode: jmeter -n -t plan.jmx -l results.jtl -e -o report'],
      example: 'jmeter -n -t payments.jmx -l results.jtl -e -o ./html-report',
    },
    {
      topic: 'Load Testing',
      summary:
        'Load testing measures system behaviour under expected normal and peak user load to verify response times, throughput and error rates meet SLAs. It identifies whether the system can handle the target workload, e.g. projected peak TPS during a sale.',
      keyConcepts: ['Expected / peak load', 'Validate SLAs (p90/p95, error rate)', 'Workload model from production data', 'Steady-state duration', 'Monitor server resources'],
      example: 'Target: 300 TPS on /payments for 30 minutes, p95 < 800 ms, error rate < 0.5%.',
    },
    {
      topic: 'Stress Testing',
      summary:
        'Stress testing pushes the system beyond its expected capacity to find the breaking point and observe how it fails and recovers. Good systems degrade gracefully (rate limiting, 503/429 responses, queueing) instead of crashing or corrupting data.',
      keyConcepts: ['Beyond expected capacity', 'Find breaking point', 'Graceful degradation', 'Recovery after load drops', 'No data corruption'],
      example: 'Increase load in steps of 100 TPS above the 300 TPS target until errors exceed 5% or p95 > 5 s; record the max sustainable TPS.',
    },
    {
      topic: 'Spike Testing',
      summary:
        'Spike testing applies a sudden, large increase in load for a short time and then drops it, checking whether the system and auto-scaling cope and recover. It is relevant for flash sales, salary-day traffic or festival offers in payments.',
      keyConcepts: ['Sudden sharp load increase', 'Short duration', 'Auto-scaling behaviour', 'Recovery time', 'Queue / rate-limit behaviour'],
      example: 'Jump from 50 to 1000 concurrent users in 10 seconds, hold 2 minutes, drop back to 50; check errors and recovery time.',
    },
    {
      topic: 'Endurance Testing',
      summary:
        'Endurance (soak) testing runs a moderate, realistic load for a long period (hours) to find issues that appear over time, such as memory leaks, connection pool exhaustion, growing queues, disk/log growth and slow degradation of response times.',
      keyConcepts: ['Long duration (e.g. 8-24 h)', 'Memory leaks', 'Connection pool exhaustion', 'Gradual response-time degradation', 'Disk and log growth'],
      example: 'Run 70% of peak load for 12 hours; monitor heap usage, GC pauses, DB connections and p95 trend.',
    },
    {
      topic: 'Thread Groups',
      summary:
        'A Thread Group defines the virtual users: number of threads (users), ramp-up period and loop count or duration. Special groups include setUp/tearDown Thread Groups, and plugins like Concurrency Thread Group and Ultimate Thread Group for stepped or shaped load. Each thread runs the samplers independently.',
      keyConcepts: ['Number of threads = virtual users', 'Ramp-up period', 'Loop count or duration (scheduler)', 'setUp / tearDown thread groups', 'Concurrency / Ultimate thread group plugins'],
      example: 'Threads: 200, Ramp-up: 100 s, Duration: 1800 s, Loop: infinite (with scheduler).',
    },
    {
      topic: 'Response Time',
      summary:
        'Response time is the time from sending a request to receiving the full response. Report percentiles (p90, p95, p99) rather than only the average, since averages hide outliers. JMeter also reports latency (time to first byte) and connect time.',
      keyConcepts: ['Average vs percentiles', 'p90 / p95 / p99', 'Latency (time to first byte)', 'Connect time', 'SLA definitions use percentiles'],
      example: 'Average 400 ms but p99 4.2 s indicates a tail-latency problem, e.g. slow bank callbacks or DB lock waits.',
    },
    {
      topic: 'Throughput',
      summary:
        'Throughput is the number of requests (or transactions) processed per unit time, e.g. requests per second or TPS. In JMeter it is calculated as total requests divided by total time. Throughput rises with load until a bottleneck is hit, after which it plateaus or drops while response times increase.',
      keyConcepts: ['Requests per second / TPS', 'Throughput = requests / time', 'Plateau indicates saturation', 'Relationship with response time and users (Little\'s Law)', 'Constant Throughput Timer to control rate'],
      example: '90,000 requests completed in 300 seconds -> throughput = 300 requests/second.',
    },
    {
      topic: 'Ramp-up Period',
      summary:
        'Ramp-up period is the time JMeter takes to start all threads in a thread group. With 100 threads and 50 seconds ramp-up, JMeter starts roughly 2 threads per second. A gradual ramp-up mimics real traffic and avoids an artificial spike at test start.',
      keyConcepts: ['Time to start all threads', 'Threads per second = threads / ramp-up', 'Avoids artificial start spike', 'Ramp-up 0 = all at once (spike)', 'Allow warm-up before measuring'],
      example: '100 threads, ramp-up 50 s -> 1 new thread every 0.5 s; all 100 active after 50 s.',
    },
    {
      topic: 'Bottleneck Analysis',
      summary:
        'Bottleneck analysis correlates client-side metrics (response time, errors, throughput) with server-side metrics (CPU, memory, GC, thread pools, DB connections, slow queries, network, downstream latency) to find the limiting component. Tools include APM (e.g. New Relic, Dynatrace, AppDynamics), Grafana/Prometheus and DB slow query logs.',
      keyConcepts: ['Correlate client and server metrics', 'CPU, memory, GC', 'Thread and connection pools', 'Slow DB queries, missing indexes, locks', 'Downstream dependencies', 'APM and monitoring tools'],
      example: 'Throughput plateaus at 250 TPS with CPU at 40% but DB connection pool at 100% -> pool size or slow queries are the bottleneck.',
    },
    {
      topic: 'Performance Reports',
      summary:
        'A performance report summarises the test objective, workload model, environment, results against SLAs (percentile response times, throughput, error rate), resource utilisation, bottlenecks found and recommendations. JMeter can generate an HTML dashboard from the .jtl results file.',
      keyConcepts: ['Objective and workload model', 'Environment details', 'Results vs SLA', 'Errors and their causes', 'Resource utilisation', 'Bottlenecks and recommendations'],
      example: 'Summary table: /payments p95 720 ms (SLA 800) PASS; /refunds p95 1.4 s (SLA 1 s) FAIL - slow ledger query; recommend index on (payment_id, status).',
    },
  ],

  'Fintech & Payments': [
    {
      topic: 'Payment Lifecycle',
      summary:
        'A card payment typically flows: customer initiates -> merchant/gateway -> acquirer -> card network -> issuer authorizes -> response back. Later the merchant/acquirer submits the transaction for clearing, and the network settles funds between issuer and acquirer, after which the acquirer settles to the merchant net of MDR. Refunds, reversals and chargebacks are post-transaction flows.',
      keyConcepts: ['Initiation -> authorization -> capture', 'Clearing (presentment)', 'Settlement issuer -> acquirer -> merchant', 'Reconciliation', 'Refunds, reversals, chargebacks'],
      example: 'Day 0: auth approved (0100/0110). Day 0 end: acquirer sends clearing file. Day 1: network settlement; acquirer pays merchant T+1 net of MDR + GST.',
    },
    {
      topic: 'Authorization',
      summary:
        'Authorization is the real-time request to the issuer to approve or decline a transaction. The issuer checks card validity, PIN/CVV/3-D Secure, available balance or limit, fraud rules and card status, then places a hold on the funds. In ISO 8583 this is MTI 0100 (request) and 0110 (response), with the result in field 39; an approved auth gets an approval code (field 38). Authorization alone does not move money.',
      keyConcepts: ['Real-time issuer approval', 'Checks: balance, card status, CVV/PIN, fraud', 'Funds hold / blocked amount', 'MTI 0100 / 0110', 'Field 39 response code, field 38 approval code', 'Auth hold expiry if not captured'],
      example: '0100 (DE2 PAN, DE4 amount 000000050000) -> 0110 DE39=00, DE38=A1B2C3: approved, Rs 500.00 held.',
    },
    {
      topic: 'Clearing',
      summary:
        'Clearing is the exchange of final transaction details between acquirer and issuer through the card network, usually in batch files after authorization (also called presentment). It finalises the amount, calculates interchange and network fees and lets the issuer post the transaction to the cardholder account. Clearing amount can differ from auth amount in some cases (e.g. tips, hotels, fuel).',
      keyConcepts: ['Batch presentment of captured transactions', 'Acquirer -> network -> issuer', 'Final amount, interchange and fees', 'Matched to authorization (e.g. via RRN / auth code / STAN)', 'Precedes settlement'],
      example: 'Acquirer sends the day\'s captured transactions in a clearing file; the network routes them to issuers and produces settlement positions per bank.',
    },
    {
      topic: 'Settlement',
      summary:
        'Settlement is the actual movement of funds: the network calculates net positions and issuers pay acquirers (via a settlement bank), then the acquirer/aggregator pays merchants after deducting MDR and taxes. Merchant settlement cycles are typically T+1, sometimes T+0 / instant for a fee, or T+N based on risk.',
      keyConcepts: ['Actual fund movement', 'Interbank net settlement via network', 'Merchant payout net of MDR + GST', 'Settlement cycles T+0 / T+1 / T+N', 'Settlement reports and UTR'],
      example: 'Gross Rs 1,00,000 - MDR 2% (Rs 2,000) - GST 18% on MDR (Rs 360) = net payout Rs 97,640.',
    },
    {
      topic: 'Acquiring and Issuing',
      summary:
        'The issuer is the cardholder\'s bank that issues the card and approves transactions. The acquirer is the merchant\'s bank/processor that accepts card transactions on the merchant\'s behalf and settles to the merchant. Payment aggregators / gateways and processors sit between merchants and acquirers. Interchange is paid by the acquirer to the issuer.',
      keyConcepts: ['Issuer = cardholder bank', 'Acquirer = merchant bank', 'Network connects them (Visa, Mastercard, RuPay)', 'Interchange fee flows acquirer -> issuer', 'Aggregators onboard sub-merchants'],
      example: 'Customer with Bank A card pays at a shop whose POS is from Bank B: Bank A = issuer, Bank B = acquirer.',
    },
    {
      topic: 'Payment Gateways',
      summary:
        'A payment gateway securely captures payment details from online checkout and routes them to the acquirer/processor, then returns the result to the merchant. It handles tokenisation, 3-D Secure redirection, multiple payment methods (cards, UPI, netbanking, wallets), webhooks and status APIs. A payment aggregator additionally collects funds and settles to merchants (RBI-regulated in India).',
      keyConcepts: ['Online checkout routing', 'Gateway vs aggregator', '3-D Secure / OTP flow', 'Tokenisation, PCI DSS', 'Webhooks and status inquiry', 'Multiple payment methods'],
      example: 'Create order -> checkout -> 3DS OTP -> auth -> gateway webhook payment.captured -> merchant marks order paid.',
    },
    {
      topic: 'POS Transactions',
      summary:
        'Point-of-sale transactions are card-present payments via chip (EMV), contactless (NFC tap) or magstripe swipe. Online PIN is verified by the issuer; contactless below a limit can skip PIN (in India the limit without PIN is Rs 5,000 per RBI rules at time of writing). POS supports sale, void, refund, pre-auth/completion, settlement (batch close) and reversal on timeouts.',
      keyConcepts: ['EMV chip, contactless, magstripe', 'PIN verification', 'Sale, void, refund, pre-auth', 'Batch close / settlement', 'Auto-reversal on timeout', 'Offline / online transactions'],
      example: 'Terminal sends 0200 sale; no response within timeout -> terminal sends 0400 reversal so the customer is not left with a held amount.',
    },
    {
      topic: 'UPI',
      summary:
        'UPI (Unified Payments Interface), operated by NPCI, enables instant 24x7 account-to-account transfers using a VPA/UPI ID. Participants: payer PSP app, payee PSP, remitter bank, beneficiary bank and NPCI switch. Flows include Pay (push), Collect (pull) and QR/intent; authentication uses UPI PIN. Statuses include SUCCESS, FAILURE, PENDING and deemed-approved, which needs status check and reconciliation.',
      keyConcepts: ['NPCI switch, PSP apps, remitter and beneficiary banks', 'VPA / UPI ID', 'Pay vs Collect vs QR / intent', 'UPI PIN (2FA)', 'RRN / UTR reference', 'Pending and deemed transactions, auto-reversal TAT'],
      example: 'Payer debited, credit to beneficiary times out -> status PENDING/deemed -> check status API -> either credit confirmed or auto-reversal to payer within the NPCI-defined TAT.',
    },
    {
      topic: 'NEFT RTGS and IMPS',
      summary:
        'NEFT is deferred net settlement in half-hourly batches, available 24x7x365 since December 2019, with no minimum amount. RTGS is real-time gross settlement for high-value payments with a minimum of Rs 2 lakh, available 24x7 since December 2020. IMPS (by NPCI) is instant, 24x7, settled immediately to the beneficiary, with a per-transaction cap (currently Rs 5 lakh).',
      keyConcepts: ['NEFT: half-hourly batches, no minimum', 'RTGS: real-time gross, min Rs 2 lakh', 'IMPS: instant 24x7, NPCI', 'NEFT and RTGS run by RBI', 'All three available 24x7 now', 'UTR reference number'],
      example: 'Rs 50,000 urgent at midnight -> IMPS (instant) or NEFT (next half-hourly batch); Rs 10 lakh immediate gross settlement -> RTGS.',
    },
    {
      topic: 'ISO 8583 and MTI',
      summary:
        'ISO 8583 is the message standard for card transactions. Each message has an MTI (4 digits: version, class, function, origin), a bitmap indicating present data elements, and the data elements. Common MTIs: 0100/0110 authorization request/response, 0200/0210 financial request/response, 0400/0410 reversal request/response, 0420/0430 reversal advice/response, 0800/0810 network management (echo, sign-on, key exchange).',
      keyConcepts: ['MTI: version, class, function, origin', 'Bitmap (primary / secondary)', '0100/0110 auth, 0200/0210 financial', '0400/0410 reversal, 0420/0430 reversal advice', '0800/0810 network management', 'DE2 PAN, DE4 amount, DE11 STAN, DE37 RRN, DE38 auth code, DE39 response code'],
      example: '0200 -> no reply -> 0400 (original data elements in DE90) -> 0410 DE39=00 reversal accepted.',
    },
    {
      topic: 'Merchant Onboarding',
      summary:
        'Merchant onboarding covers application, KYC/KYB verification (PAN, GST, business proof, bank account validation via penny drop), risk assessment and MCC assignment, pricing (MDR) setup, agreement, terminal/API credential provisioning and activation. QA tests document validation, maker-checker approvals, status transitions and that pricing and settlement configuration are applied correctly.',
      keyConcepts: ['KYC / KYB documents', 'Bank account validation (penny drop)', 'MCC and risk category', 'MDR / pricing configuration', 'Maker-checker approvals', 'Status: draft, submitted, approved, active, rejected'],
      example: 'Test: merchant with mismatched bank account name in penny-drop response is routed to manual review, not auto-activated.',
    },
    {
      topic: 'MDR Calculations',
      summary:
        'MDR (Merchant Discount Rate) is the fee charged to a merchant per transaction as a percentage (sometimes plus a fixed fee). GST at 18% is charged on the MDR amount, not on the transaction amount. Net settlement = gross - MDR - GST on MDR. Rates vary by payment method, card type and agreement; in India MDR on RuPay debit cards and UPI P2M is currently zero by regulation (with some exceptions such as certain UPI-on-credit cases).',
      keyConcepts: ['MDR % (+ optional fixed fee)', 'GST 18% on MDR, not on amount', 'Net = gross - MDR - GST', 'Rates differ by method / card type', 'Rounding rules', 'Refund fee handling per policy'],
      example: 'Rs 10,000 at 1.8% MDR -> MDR Rs 180, GST Rs 32.40, total deduction Rs 212.40, net Rs 9,787.60.',
    },
    {
      topic: 'Merchant Settlement',
      summary:
        'Merchant settlement is paying out collected funds to the merchant bank account per its settlement cycle, after deducting MDR, GST, refunds, chargebacks and reserves/holds. A settlement report lists each transaction and the UTR of the bank payout. QA validates settlement amount, cycle, cut-off handling, holiday logic and adjustments.',
      keyConcepts: ['Payout net of fees and adjustments', 'Settlement cycle and cut-off time', 'Refund / chargeback adjustments', 'Rolling reserve / holds', 'Settlement report and UTR', 'Bank holiday handling'],
      example: 'Net payout = Sales Rs 5,00,000 - refunds Rs 20,000 - MDR Rs 9,000 - GST Rs 1,620 - chargeback Rs 5,000 = Rs 4,64,380.',
    },
    {
      topic: 'Reconciliation',
      summary:
        'Reconciliation matches records across systems - internal ledger/switch, gateway, bank/network settlement files and merchant payouts - to ensure every transaction is accounted for with the same amount and status. Unmatched items (missing in one source, amount mismatch, status mismatch, duplicates) go to exception queues for investigation and correction.',
      keyConcepts: ['Match by key: RRN, UTR, txn id, auth code', 'Two-way / three-way recon', 'Amount, status, date matching', 'Exceptions: missing, mismatch, duplicate', 'Auto-recon vs manual', 'Ageing of unreconciled items'],
      example: 'Three-way recon: switch log vs network settlement file vs bank statement; a txn present in switch and network but not credited by the bank becomes an exception.',
    },
    {
      topic: 'Refund and Void',
      summary:
        'A void cancels a transaction before it is settled/batched (same day, before batch close) so no money moves and the hold is released. A refund returns money after the transaction has been captured or settled, as a new credit transaction that goes through clearing and settlement. Refunds can be full or partial, and the total refunded must not exceed the captured amount.',
      keyConcepts: ['Void = before settlement / batch close', 'Refund = after capture / settlement', 'Full vs partial refund', 'Refund cannot exceed captured amount', 'Refund is a new credit transaction', 'Different TAT for customer credit'],
      example: 'Sale at 11 am, wrong amount noticed at 2 pm before batch close -> void. Customer returns item two days later -> refund.',
    },
    {
      topic: 'T+0 T+1 and T+N',
      summary:
        'T is the transaction day (or settlement-eligible day). T+0 means same-day settlement, T+1 next working day, T+N after N working days. Transactions after the daily cut-off time are treated as next-day T. Cycles depend on merchant risk, product and agreement; bank holidays and weekends shift payouts based on the payment rails used.',
      keyConcepts: ['T = transaction / capture date', 'Cut-off time defines which T a txn belongs to', 'T+0 instant / same-day (often at extra fee)', 'T+1 standard', 'T+N for high-risk merchants', 'Holiday / weekend handling'],
      example: 'Cut-off 11 pm. Txn at 10:55 pm Monday -> T=Monday -> T+1 payout Tuesday. Txn at 11:05 pm Monday -> T=Tuesday -> payout Wednesday.',
    },
    {
      topic: 'Visa and Mastercard',
      summary:
        'Visa and Mastercard are global card networks (schemes) that route authorizations, run clearing and settlement between issuers and acquirers, and define rules, interchange and dispute processes. India also has RuPay (NPCI). Both support 3-D Secure (Visa Secure, Mastercard Identity Check), tokenisation and their own reason codes for disputes.',
      keyConcepts: ['Card networks / schemes', 'Four-party model', 'Interchange and scheme fees', 'Dispute rules and reason codes', '3-D Secure programs', 'RuPay as domestic network'],
      example: 'Four-party model: cardholder -> issuer, merchant -> acquirer, network in the middle.',
    },
    {
      topic: 'Chargebacks',
      summary:
        'A chargeback is a dispute raised by the cardholder through the issuer, which reverses funds from the acquirer/merchant. The merchant can accept it or submit evidence (representment / second presentment); the issuer may escalate to pre-arbitration and arbitration by the network. Each stage has strict timelines and reason codes defined by the network.',
      keyConcepts: ['Cardholder dispute via issuer', 'Reason codes (fraud, not received, duplicate, etc.)', 'Merchant accepts or represents with evidence', 'Pre-arbitration and arbitration', 'Strict network timelines', 'Debit to merchant settlement'],
      example: 'Customer disputes "goods not received" -> chargeback debit to merchant -> merchant uploads delivery proof -> representment -> issuer accepts -> funds returned to merchant.',
    },
    {
      topic: 'Transaction Statuses',
      summary:
        'Payments move through a state machine such as CREATED -> PENDING / AUTHORIZED -> CAPTURED -> SETTLED, or FAILED, with REFUNDED / PARTIALLY_REFUNDED / REVERSED / DISPUTED as post states. Exact names vary by system. QA validates only allowed transitions, consistent status across UI, API, DB, webhooks and reports, and handling of pending/unknown states via status inquiry.',
      keyConcepts: ['State machine: created, authorized, captured, settled', 'Failed, reversed, refunded, disputed', 'Allowed vs invalid transitions', 'Pending / unknown handling', 'Status consistency across systems'],
      example: 'Invalid transition test: try to refund a payment in FAILED status -> must be rejected.',
    },
    {
      topic: 'Payment Failure Scenarios',
      summary:
        'Failures can happen at any hop: customer (wrong PIN/OTP, insufficient funds), issuer (declined, unavailable), network/switch (timeout), gateway (validation, downtime) or merchant (callback failure). Key QA concerns are no money lost or double-charged, correct reversal on timeouts, accurate failure reason shown, idempotent retries and correct reconciliation.',
      keyConcepts: ['Customer-side, issuer, network, gateway failures', 'Timeouts and reversals', 'Double debit prevention', 'Clear failure reasons', 'Idempotent retries', 'Reconciliation of failed / pending'],
      example: 'Bank debits customer but gateway times out -> payment marked PENDING -> status inquiry/recon -> either mark success or trigger refund/auto-reversal.',
    },
    {
      topic: 'Decline Codes',
      summary:
        'ISO 8583 field 39 (response code) carries the transaction result. Common codes: 00 approved, 05 do not honor, 14 invalid card number, 51 insufficient funds, 54 expired card, 55 incorrect PIN, 61 exceeds withdrawal amount limit, 91 issuer or switch inoperative, 96 system malfunction. Exact usage can vary by network and issuer, so testers map codes to customer-friendly messages and retry logic.',
      keyConcepts: ['Field 39 response code', '00 approved', '05 do not honor, 51 insufficient funds', '54 expired card, 55 incorrect PIN', '91 issuer unavailable, 96 system malfunction', 'Hard vs soft declines and retry logic'],
      example: 'DE39=51 -> show "Insufficient funds", do not auto-retry; DE39=91 -> issuer down, may retry later or route elsewhere.',
    },
    {
      topic: 'Authorization and Clearing Mismatches',
      summary:
        'Mismatches occur when authorization and clearing records do not line up: auth approved but never cleared (hold eventually expires), clearing without a matching auth (forced post), amount differences between auth and clearing, duplicate clearing, or a reversal not reflected. Reconciliation matches on keys like RRN, STAN, auth code, PAN token and date, and routes exceptions for investigation.',
      keyConcepts: ['Auth without clearing', 'Clearing without auth', 'Amount mismatch (tips, partial capture, FX)', 'Duplicate presentment', 'Reversal not applied', 'Match keys: RRN, auth code, STAN'],
      example: `SELECT a.rrn, a.amount auth_amt, c.amount clr_amt
FROM auth_log a FULL OUTER JOIN clearing c ON c.rrn = a.rrn
WHERE a.rrn IS NULL OR c.rrn IS NULL OR a.amount <> c.amount;`,
    },
  ],

  HR: [
    {
      topic: 'Self Introduction',
      summary:
        'A strong 60-90 second introduction covers: name and current role, total and relevant experience, domain (payments/fintech), key skills and tools, one or two concrete achievements with numbers, and why you are looking for this role. Keep it structured: present -> past -> future.',
      keyConcepts: ['Present-past-future structure', 'Experience and domain', 'Core tools and skills', 'Quantified achievements', 'Link to the target role', 'Keep it under 2 minutes'],
      example: 'I am a QA engineer with 4 years of experience, the last 2.5 in payment gateway testing - API testing with Postman and RestAssured, SQL for settlement validation, and Playwright automation. I built a regression suite that cut release testing from 3 days to 6 hours...',
    },
    {
      topic: 'Career Goals',
      summary:
        'Show a realistic plan aligned with the role: deepen domain and automation expertise in the short term, grow into an SDET / QA lead or domain-specialist role in 3-5 years. Avoid goals that suggest you will leave soon or that the role is only a stepping stone to something unrelated.',
      keyConcepts: ['Short-term: master domain and stack', 'Long-term: SDET / lead / architect', 'Aligned with company growth', 'Show learning plan', 'Avoid unrelated ambitions'],
    },
    {
      topic: 'Strengths and Weaknesses',
      summary:
        'Pick strengths relevant to QA in payments (attention to detail, domain understanding, root cause analysis) and back each with an example. For weakness, choose a real but non-critical one and explain the concrete steps you are taking to improve it.',
      keyConcepts: ['Relevant strengths with evidence', 'Genuine, non-critical weakness', 'Show improvement actions', 'Avoid cliches ("perfectionist")', 'Keep it honest and brief'],
    },
    {
      topic: 'Conflict Handling',
      summary:
        'Interviewers want to see that you resolve disagreements (e.g. developer rejects a bug) with data and collaboration, not ego. Use STAR: reproduce with evidence, refer to requirements/acceptance criteria, discuss impact, involve the PO if needed, and focus on the user/business outcome.',
      keyConcepts: ['STAR format', 'Evidence: logs, steps, requirements', 'Focus on business impact', 'Escalate respectfully via PO / lead', 'Maintain relationship'],
    },
    {
      topic: 'Notice Period and Salary',
      summary:
        'Be transparent about notice period and whether it is negotiable or buyout is possible. For salary, research market ranges for the role and experience, give a range anchored on your value and current CTC, and stay open to the full package (fixed, variable, benefits).',
      keyConcepts: ['Honest notice period and buyout options', 'Market research for range', 'Justify with skills and impact', 'Consider total compensation', 'Stay professional and flexible'],
    },
    {
      topic: 'Why This Company',
      summary:
        'Show you have researched the company: its products, scale, payment methods, tech stack or recent launches, and connect them to your experience and goals. Generic answers ("good brand, good salary") are weak.',
      keyConcepts: ['Research products and scale', 'Connect to your experience', 'Mention domain interest', 'Growth and learning opportunity', 'Avoid generic answers'],
    },
  ],
};
