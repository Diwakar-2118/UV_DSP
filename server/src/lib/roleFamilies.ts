import { classifyRoles, ROLE_CATEGORIES } from './taxonomy.js';

/**
 * Role-family and location matching for job discovery.
 * A role the user picks ("QA Engineer", "SDET", "Performance Testing"...) expands into title phrases
 * and synonyms; a job matches when its title contains one of them. Unknown roles fall back to
 * matching all of their words in the title.
 */

const FAMILIES: { keys: RegExp; phrases: string[] }[] = [
  {
    // Manual / general QA
    keys: /^(qa|quality assurance|manual qa|qa engineer|qa analyst|software tester|tester|test engineer|testing)$/i,
    phrases: ['qa engineer', 'qa analyst', 'qa lead', 'qa manager', 'qa tester', 'qa executive', 'qa specialist - software', 'quality assurance engineer', 'quality assurance analyst', 'quality analyst', 'quality engineer', 'software quality', 'software tester', 'manual tester', 'test engineer', 'test analyst', 'test lead', 'test manager', 'test specialist', 'testing engineer', 'qa', 'sdet', 'software engineer in test', 'software development engineer in test'],
  },
  {
    keys: /^(qa automation|automation|test automation|automation tester|automation engineer|sdet|software development engineer in test)$/i,
    phrases: ['sdet', 'software development engineer in test', 'software engineer in test', 'automation test', 'test automation', 'qa automation', 'automation qa', 'automation engineer - qa', 'selenium', 'playwright', 'cypress'],
  },
  {
    keys: /^(api testing|api tester|api test engineer|backend testing)$/i,
    phrases: ['api test', 'api testing', 'api qa', 'backend test', 'integration test'],
  },
  {
    keys: /^(performance testing|performance tester|performance test engineer|load testing)$/i,
    phrases: ['performance test', 'performance testing', 'performance engineer', 'load test', 'jmeter', 'perf test'],
  },
  {
    keys: /^(fintech qa|payments qa|banking qa)$/i,
    phrases: ['qa engineer', 'test engineer', 'sdet', 'quality assurance', 'payments qa', 'qa - payments', 'test analyst'],
  },
];

/** Words in a job title that, combined with a bare "QA", mean non-software QA (compliance, ops, call quality...). */
const NON_SOFTWARE_QA = /\b(aml|kyc|compliance|call|voice|audit|clinical|pharma|gmp|food|transcription|content|catalog|annotation|linguistic|investigations?|operations|warehouse|manufacturing|supplier|plant)\b/i;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const phraseRe = (p: string) => new RegExp(`(?<![a-z0-9])${escape(p).replace(/\s+/g, '[\\s\\-_/,]+')}(?![a-z0-9])`, 'i');

/** "IT" (or "All IT") means every IT role family. */
export const ALL_IT = 'IT';
const isAllIt = (r: string) => /^(it|all it|all it roles|any it|tech|technology)$/i.test(r.trim());

/** Search keywords providers can use for a role family name. */
const CATEGORY_QUERIES: Record<string, string> = {
  'Manual QA': 'QA Engineer',
  'QA Automation': 'SDET',
  'API Testing': 'API Testing',
  'Performance Testing': 'Performance Testing',
  'Fintech QA': 'QA Engineer',
  'Software Engineering': 'Software Engineer',
  'Frontend Development': 'Frontend Developer',
  'Backend Development': 'Backend Developer',
  'Full Stack Development': 'Full Stack Developer',
  'Mobile Development': 'Mobile Developer',
  'DevOps / SRE': 'DevOps Engineer',
  'Cloud Engineering': 'Cloud Engineer',
  'Data Engineering': 'Data Engineer',
  'Data Science / ML': 'Machine Learning Engineer',
  'Data Analytics': 'Data Analyst',
  Cybersecurity: 'Security Engineer',
  'Product Management': 'Product Manager',
  'UI/UX Design': 'UI UX Designer',
  'Business Analysis': 'Business Analyst',
  'IT Support & Admin': 'IT Support',
  'Engineering Management': 'Engineering Manager',
};
const ALL_IT_QUERIES = ['Software Engineer', 'Developer', 'QA Engineer', 'Data Engineer', 'DevOps Engineer'];

/** Keyword queries for providers that search by text (Amazon, Adzuna, SmartRecruiters...). */
export function queryTerms(roles: string[]): string[] {
  const out = roles.flatMap((r) => (isAllIt(r) ? ALL_IT_QUERIES : [CATEGORY_QUERIES[r] ?? r]));
  return [...new Set(out.filter(Boolean))];
}

/** True when the request covers many families, so providers should list broadly instead of keyword searching. */
export const isBroadSearch = (roles: string[]) => roles.some(isAllIt) || roles.length > 3;

export function expandRoles(roles: string[]): RegExp[] {
  const out = new Map<string, RegExp>();
  for (const raw of roles) {
    const role = raw.trim();
    if (!role) continue;
    const fam = FAMILIES.filter((f) => f.keys.test(role));
    if (fam.length) for (const f of fam) for (const p of f.phrases) out.set(p, phraseRe(p));
    else out.set(role.toLowerCase(), phraseRe(role.toLowerCase()));
  }
  return [...out.values()];
}

/**
 * True when the title belongs to one of the requested roles. A role can be "IT" (any IT job),
 * a role family name from the taxonomy ("Backend Development"), a known synonym ("SDET") or free text.
 * Empty role list matches everything.
 */
export function matchesRoleFamily(title: string, roles: string[] | RegExp[]): boolean {
  if (!roles.length) return true;
  if (typeof roles[0] === 'string') {
    const names = roles as string[];
    const families = classifyRoles(title);
    if (names.some(isAllIt)) return families.length > 0;
    if (names.some((r) => (families as string[]).includes(r))) return true;
    const rest = names.filter((r) => !(ROLE_CATEGORIES as readonly string[]).includes(r));
    if (!rest.length) return false;
    return matchesRoleFamily(title, expandRoles(rest));
  }
  const res = roles as RegExp[];
  if (!res.some((re) => re.test(title))) return false;
  // "QA" alone is ambiguous (AML QA Specialist, Call Quality QA...). Require a software signal.
  if (NON_SOFTWARE_QA.test(title) && !/\b(software|sdet|automation|api|test engineer|qa engineer)\b/i.test(title)) return false;
  return true;
}

const CITY_ALIASES: Record<string, RegExp> = {
  bengaluru: /bengaluru|bangalore|\bblr\b/i,
  bangalore: /bengaluru|bangalore|\bblr\b/i,
  hyderabad: /hyderabad|secunderabad|telangana|telengana|\bhyd\b/i,
  pune: /\bpune\b/i,
  chennai: /chennai/i,
  mumbai: /mumbai|navi mumbai|thane/i,
  delhi: /delhi|gurgaon|gurugram|noida|\bncr\b/i,
  'delhi ncr': /delhi|gurgaon|gurugram|noida|\bncr\b/i,
  gurugram: /gurgaon|gurugram/i,
  noida: /noida/i,
  kolkata: /kolkata/i,
  ahmedabad: /ahmedabad/i,
  kochi: /kochi|cochin/i,
};

export interface LocationQuery {
  cities: RegExp[];
  country: string | null; // ISO-2
  remote: boolean;
  any: boolean;
}

/** Parse "Hyderabad", "Bengaluru, Remote", "India", "Remote" or "" (anywhere). */
export function parseLocation(location: string): LocationQuery {
  const parts = location.split(/[,;|]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  const q: LocationQuery = { cities: [], country: null, remote: false, any: parts.length === 0 };
  for (const p of parts) {
    if (/^(remote|anywhere|wfh|work from home)$/.test(p)) q.remote = true;
    else if (/^(india|in|ind)$/.test(p)) q.country = 'IN';
    else if (CITY_ALIASES[p]) {
      q.cities.push(CITY_ALIASES[p]);
      q.country ??= 'IN';
    } else q.cities.push(new RegExp(`(?<![a-z])${escape(p)}(?![a-z])`, 'i'));
  }
  return q;
}

/** Location fit for a normalised job. Remote roles count only when open to the user's country (or worldwide). */
export function matchesLocation(job: { location: string; remote: boolean; country: string | null }, q: LocationQuery): boolean {
  if (q.any) return true;
  if (q.cities.some((re) => re.test(job.location))) return true;
  if (q.remote && job.remote) {
    const restricted = /\b(us|usa|united states|uk|europe|emea|canada|latam|americas?|germany|australia|japan|only)\b/i.test(job.location);
    const openToCountry = !q.country || job.country === q.country || /worldwide|anywhere|global|apac|asia|india/i.test(job.location);
    return openToCountry && !(restricted && !/india|worldwide|anywhere|global|apac|asia/i.test(job.location));
  }
  // Country-only query ("India")
  if (q.country && !q.cities.length) return job.country === q.country;
  return false;
}
