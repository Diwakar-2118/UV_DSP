/** Canonical skills, role categories and industry keywords used across job parsing, matching and resume analysis. */

export const QA_CATEGORIES = ['Manual QA', 'API Testing', 'Fintech QA', 'QA Automation', 'Performance Testing'] as const;
export const IT_CATEGORIES = [
  'Software Engineering',
  'Frontend Development',
  'Backend Development',
  'Full Stack Development',
  'Mobile Development',
  'DevOps / SRE',
  'Cloud Engineering',
  'Data Engineering',
  'Data Science / ML',
  'Data Analytics',
  'Cybersecurity',
  'Product Management',
  'UI/UX Design',
  'Business Analysis',
  'IT Support & Admin',
  'Engineering Management',
] as const;
/** Every IT role family CareerPilot collects: QA/testing plus all other IT roles. */
export const ROLE_CATEGORIES = [...QA_CATEGORIES, ...IT_CATEGORIES] as const;
export type RoleCategory = (typeof ROLE_CATEGORIES)[number];

export const PREFERRED_LOCATIONS = ['Bengaluru', 'Hyderabad', 'Remote'] as const;

/** canonical skill -> regex alternatives (matched case-insensitively on word boundaries) */
export const SKILLS: Record<string, string[]> = {
  'Manual Testing': ['manual testing', 'manual test', 'manual qa'],
  'Functional Testing': ['functional testing', 'functional test'],
  'Regression Testing': ['regression'],
  'Smoke Testing': ['smoke test', 'smoke testing'],
  'Test Case Design': ['test cases?', 'test scenarios?', 'test design'],
  'Test Planning': ['test plan', 'test strategy'],
  'API Testing': ['api testing', 'api test', 'rest api', 'restful', 'web services? testing', 'apis?'],
  Postman: ['postman', 'newman'],
  'Rest Assured': ['rest[- ]?assured'],
  SQL: ['sql', 'mysql', 'postgres(?:ql)?', 'oracle db', 'database testing'],
  Jira: ['jira'],
  Spira: ['spira(?:test|plan)?'],
  Playwright: ['playwright'],
  Selenium: ['selenium', 'webdriver'],
  Cypress: ['cypress'],
  Java: ['java(?!script)'],
  JavaScript: ['javascript', 'js', 'node\\.?js'],
  TypeScript: ['typescript', 'ts'],
  Python: ['python', 'pytest'],
  Cucumber: ['cucumber', 'bdd', 'gherkin'],
  TestNG: ['testng', 'junit'],
  JMeter: ['jmeter'],
  'Performance Testing': ['performance testing', 'load testing', 'stress testing', 'performance test', 'gatling', 'k6', 'loadrunner'],
  'CI/CD': ['ci/cd', 'cicd', 'jenkins', 'github actions', 'gitlab ci', 'azure devops'],
  Git: ['git', 'github', 'bitbucket'],
  Agile: ['agile', 'scrum', 'kanban'],
  'Mobile Testing': ['mobile testing', 'appium', 'android testing', 'ios testing'],
  'Payment Gateway Testing': ['payment gateway', 'payment gateways', 'pg integration'],
  Payments: ['payments?', 'payment processing', 'card payments?'],
  Acquiring: ['acquiring', 'acquirer'],
  Issuing: ['issuing', 'issuer'],
  Clearing: ['clearing'],
  Settlement: ['settlements?'],
  Reconciliation: ['reconciliation', 'recon'],
  UPI: ['upi', 'npci'],
  'POS Transactions': ['pos', 'point of sale', 'pos terminals?', 'edc'],
  'ISO 8583': ['iso ?8583', 'iso8583'],
  'Card Networks': ['visa', 'mastercard', 'rupay', 'amex'],
  Microservices: ['microservices?'],
  Kafka: ['kafka'],
  Docker: ['docker', 'kubernetes', 'k8s'],
  // ---- General IT ----
  React: ['react(?:\\.?js)?', 'next\\.?js'],
  Angular: ['angular(?:js)?'],
  'Vue.js': ['vue(?:\\.?js)?'],
  'HTML/CSS': ['html5?', 'css3?', 'tailwind', 'sass'],
  'Spring Boot': ['spring boot', 'spring'],
  Django: ['django', 'flask', 'fastapi'],
  Go: ['golang'],
  '.NET': ['\\.net', 'dotnet', 'asp\\.net', 'c#'],
  'C++': ['c\\+\\+'],
  Kotlin: ['kotlin'],
  Swift: ['swiftui', 'swift (?:programming|language|developer)'],
  Flutter: ['flutter', 'dart'],
  'React Native': ['react native'],
  AWS: ['aws', 'amazon web services', 'ec2', 'lambda', 's3'],
  Azure: ['azure'],
  GCP: ['gcp', 'google cloud'],
  Terraform: ['terraform', 'ansible', 'cloudformation'],
  Linux: ['linux', 'unix', 'shell scripting', 'bash'],
  Spark: ['spark', 'pyspark', 'databricks', 'hadoop'],
  Airflow: ['airflow', 'dbt'],
  Snowflake: ['snowflake', 'bigquery', 'redshift'],
  'Power BI': ['power ?bi', 'tableau', 'looker'],
  'Machine Learning': ['machine learning', 'deep learning', 'tensorflow', 'pytorch', 'scikit-learn', 'llms?', 'nlp'],
  MongoDB: ['mongodb', 'nosql', 'dynamodb', 'cassandra'],
  Redis: ['redis'],
  GraphQL: ['graphql'],
  Figma: ['figma', 'sketch', 'adobe xd'],
  Networking: ['tcp/ip', 'ccna', 'ccnp', 'network security'],
  'Security Tools': ['siem', 'splunk', 'owasp', 'burp suite', 'vapt', 'penetration testing'],
};

const compiled: [string, RegExp][] = Object.entries(SKILLS).map(([canon, alts]) => [
  canon,
  new RegExp(`(?<![a-z0-9])(?:${alts.join('|')})(?![a-z0-9])`, 'i'),
]);

export function extractSkills(text: string): string[] {
  if (!text) return [];
  return compiled.filter(([, re]) => re.test(text)).map(([c]) => c);
}

const skillAliasIndex = new Map<string, string>();
for (const canon of Object.keys(SKILLS)) skillAliasIndex.set(canon.toLowerCase(), canon);

/** Map free-text skill names (e.g. from the profile) onto canonical names when possible. */
export function canonicalSkill(s: string): string {
  const k = s.trim().toLowerCase();
  if (skillAliasIndex.has(k)) return skillAliasIndex.get(k)!;
  const found = extractSkills(s);
  return found.length === 1 ? found[0] : s.trim();
}

export function canonicalSkills(list: string[]): string[] {
  return [...new Set(list.filter(Boolean).map(canonicalSkill))];
}

const ROLE_RULES: [RoleCategory, RegExp][] = [
  ['QA Automation', /\b(automation|sdet|test automation|selenium|playwright|cypress|automation engineer)\b/i],
  ['API Testing', /\b(api|backend testing|web services?|microservices? testing)\b/i],
  ['Performance Testing', /\b(performance|load test|jmeter|perf test|scalability test)/i],
  ['Fintech QA', /\b(payments?|fintech|banking|cards?|upi|lending|wallet|acquiring|settlement)\b/i],
  ['Manual QA', /\b(manual|functional test|qa engineer|quality assurance|test engineer|software tester|qa analyst|tester)\b/i],
];
const QA_TITLE = /\b(qa|qe|quality|test|tester|testing|sdet)\b/i;
/** 'Quality'/'test' used in a non-QA sense, e.g. "Search Quality" ranking engineers or A/B test analysts. */
/** Also excludes manufacturing / supply-chain quality roles, which are not software testing. */
const NOT_QA_TITLE =
  /(?<![a-z])(search|ranking|data|content|ad|ads|air|water|food|supplier|in ?coming|works|product|logistic|manufacturing|plant) quality\b|quality management|a\/b test|inspection|calibration|process planner|electrical testing|vehicle testing/i;

/** Title rules for non-QA IT roles. A job belongs to every family whose rule matches its title. */
export const IT_ROLE_RULES: [RoleCategory, RegExp][] = [
  ['Frontend Development', /\b(front[- ]?end|ui developer|ui engineer|react(\.?js)? (developer|engineer)|angular|vue(\.?js)?|web developer)\b/i],
  ['Backend Development', /\b(back[- ]?end|java (developer|engineer)|python (developer|engineer)|golang|go (developer|engineer)|node(\.?js)? (developer|engineer)|\.net (developer|engineer)|dotnet|api developer|server[- ]side)\b/i],
  ['Full Stack Development', /\bfull[- ]?stack\b/i],
  ['Mobile Development', /\b(android|ios|mobile (app )?(developer|engineer|development)|flutter|react native|swift developer|kotlin developer)\b/i],
  ['DevOps / SRE', /\b(devops|devsecops|site reliability|sre|platform engineer|infrastructure engineer|build (and|&) release|release engineer|mlops)\b/i],
  ['Cloud Engineering', /\b(cloud (engineer|architect|developer|consultant|specialist|operations)|aws (engineer|architect|developer)|azure (engineer|architect|developer)|gcp (engineer|architect))\b/i],
  ['Data Engineering', /\b(data engineer(ing)?|etl|big data|data platform|analytics engineer|data warehouse|data architect)\b/i],
  ['Data Science / ML', /\b(data scien(ce|tist)|machine learning|ml engineer|ml scientist|ai engineer|ai\/ml|ml\/ai|deep learning|nlp|computer vision|applied scientist|research scientist|llm|generative ai|genai)\b/i],
  ['Data Analytics', /\b(data analyst|business intelligence|bi (developer|analyst|engineer)|analytics (engineer|analyst)|reporting analyst|power bi|tableau)\b/i],
  ['Cybersecurity', /\b(security (engineer|analyst|architect|specialist|consultant)|cyber ?security|infosec|soc analyst|soc engineer|penetration|pentest|appsec|application security|siem|secops|iam engineer|grc analyst)\b/i],
  ['Product Management', /\b(product manager|product owner|technical program manager|tpm|group product manager)\b/i],
  ['UI/UX Design', /\b(ui\/ux|ux\/ui|ux designer|ui designer|product designer|interaction designer|ux researcher|user researcher|visual designer)\b/i],
  ['Business Analysis', /\b(business analyst|systems analyst|functional consultant|it business analyst)\b/i],
  ['IT Support & Admin', /\b(it support|help ?desk|service desk|technical support engineer|desktop support|system administrator|systems administrator|sysadmin|network (engineer|administrator)|database administrator|dba|it administrator|it engineer|noc engineer)\b/i],
  ['Engineering Management', /\b(engineering manager|head of engineering|vp,? engineering|director,? (of )?engineering|tech(nical)? lead|software architect|solutions? architect|principal architect|cto)\b/i],
  ['Software Engineering', /\b(software (engineer|developer|development engineer)|sde|swe|developer|programmer|member of technical staff|mts|application (developer|engineer)|engineer,? software|software dev|coder|firmware|embedded software)\b/i],
];

const isQaTitle = (title: string) => QA_TITLE.test(title) && !NOT_QA_TITLE.test(title);
/** Non-IT roles whose titles contain words like "developer" or "engineer" (e.g. Business Developer, Sales Engineer). */
const NON_TECH_TITLE = /(business develop\w*|sales|pre-?sales|marketing|recruit\w*|talent acquisition|account (manager|executive)|customer success)/i;

/** QA categories for a QA/test title; the description refines them. */
function classifyQa(title: string, description: string): RoleCategory[] {
  const roles = new Set<RoleCategory>();
  for (const [role, re] of ROLE_RULES) if (re.test(title)) roles.add(role);
  const head = description.slice(0, 3000);
  if (/\b(payments?|fintech|banking|upi|acquiring|card network|iso ?8583)\b/i.test(head)) roles.add('Fintech QA');
  if (/\b(rest api|api testing|postman|rest[- ]?assured)\b/i.test(head)) roles.add('API Testing');
  if (/\bjmeter|load testing|performance testing\b/i.test(head)) roles.add('Performance Testing');
  if (roles.size === 0) roles.add('Manual QA');
  return [...roles];
}

/**
 * Classify a job into role families from its title (the description refines QA roles).
 * Returns [] for non-IT jobs (sales, HR, finance, operations…), which are not collected.
 */
export function classifyRoles(title: string, description = ''): RoleCategory[] {
  const roles = new Set<RoleCategory>(isQaTitle(title) ? classifyQa(title, description) : []);
  for (const [role, re] of IT_ROLE_RULES) {
    // A QA title like "Software Development Engineer in Test" is QA, not generic software engineering.
    if (role === 'Software Engineering' && (roles.size || NON_TECH_TITLE.test(title))) continue;
    if (re.test(title)) roles.add(role);
  }
  return [...roles];
}

export const isQaRole = (r: string) => (QA_CATEGORIES as readonly string[]).includes(r);

export function normalizeLocations(location: string, remoteFlag = false): string[] {
  const l = location.toLowerCase();
  const tags = new Set<string>();
  if (/bengaluru|bangalore|blr/.test(l)) tags.add('Bengaluru');
  if (/hyderabad|hyd\b|secunderabad|telangana|telengana/.test(l)) tags.add('Hyderabad');
  if (remoteFlag || /remote|work from home|wfh|anywhere/.test(l)) tags.add('Remote');
  if (tags.size === 0) tags.add('Other');
  return [...tags];
}

export const FINTECH_KEYWORDS =
  /\b(fintech|payments?|payment gateway|banking|bank|upi|cards?|acquiring|issuing|settlement|reconciliation|lending|wallet|nbfc|insurance|trading|broking|stock|mutual funds?|credit|neobank)\b/i;

export function inferIndustry(company: string, text: string): string {
  if (FINTECH_KEYWORDS.test(`${company} ${text.slice(0, 4000)}`)) return 'Fintech';
  return 'Software';
}

/** Parse "3-5 years", "3 to 5 yrs", "4+ years", "minimum 3 years". */
export function parseExperience(text: string): { min: number | null; max: number | null } {
  if (!text) return { min: null, max: null };
  const range = text.match(/(\d{1,2})\s*(?:-|–|to)\s*(\d{1,2})\s*\+?\s*(?:years?|yrs?)/i);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    if (a <= b && b <= 30) return { min: a, max: b };
  }
  const plus = text.match(/(\d{1,2})\s*\+\s*(?:years?|yrs?)/i) ?? text.match(/(?:minimum|min\.?|at least)\s*(?:of\s*)?(\d{1,2})\s*(?:years?|yrs?)/i);
  if (plus) {
    const a = Number(plus[1]);
    if (a <= 30) return { min: a, max: null };
  }
  const plain = text.match(/(\d{1,2})\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)/i);
  if (plain) {
    const a = Number(plain[1]);
    if (a <= 30) return { min: a, max: null };
  }
  return { min: null, max: null };
}

/** Normalise a URL for duplicate detection: lowercase host, drop tracking params, fragments and trailing slashes. */
export function normalizeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.trim());
    u.hash = '';
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    const drop = [/^utm_/i, /^ref$/i, /^refid$/i, /^source$/i, /^src$/i, /^trk/i, /^gh_src$/i, /^lever-/i, /^fbclid$/i, /^gclid$/i];
    for (const key of [...u.searchParams.keys()]) if (drop.some((re) => re.test(key))) u.searchParams.delete(key);
    u.searchParams.sort();
    const path = u.pathname.replace(/\/+$/, '') || '/';
    const qs = u.searchParams.toString();
    return `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ''}${path}${qs ? `?${qs}` : ''}`;
  } catch {
    return null;
  }
}

export function fingerprint(title: string, company: string, location: string): string {
  const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return `${n(title)}|${n(company)}|${n(location).split(' ').slice(0, 2).join(' ')}`;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|div|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}
