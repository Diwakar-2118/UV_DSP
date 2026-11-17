import { canonicalSkills, FINTECH_KEYWORDS } from '../lib/taxonomy.js';

export const MATCH_WEIGHTS = { skills: 40, experience: 25, industry: 20, location: 15 } as const;

export interface MatchProfile {
  skills: string[];
  experienceYears: number;
  industries: string[];
  locations: string[];
  roles: string[];
}

export interface MatchJob {
  title: string;
  company: string;
  description: string;
  skills: string[];
  roles: string[];
  exp_min: number | null;
  exp_max: number | null;
  industry: string | null;
  location_tags: string[];
}

export interface MatchResult {
  score: number;
  breakdown: { skills: number; experience: number; industry: number; location: number };
  matchingSkills: string[];
  missingSkills: string[];
  experienceFit: string;
  reasons: string[];
}

/**
 * Transparent, deterministic compatibility score.
 * Each component is scored 0..1 and multiplied by its weight (40/25/20/15). The sum is the percentage.
 */
export function scoreJob(profile: MatchProfile, job: MatchJob): MatchResult {
  const reasons: string[] = [];
  const userSkills = new Set(canonicalSkills(profile.skills).map((s) => s.toLowerCase()));
  const jobSkills = canonicalSkills(job.skills);

  // --- skills (40) ---
  let skillRatio: number;
  const matchingSkills = jobSkills.filter((s) => userSkills.has(s.toLowerCase()));
  const missingSkills = jobSkills.filter((s) => !userSkills.has(s.toLowerCase()));
  const roleOverlap = job.roles.filter((r) => profile.roles.includes(r));
  if (jobSkills.length === 0) {
    // No explicit skills listed – fall back to role-category relevance.
    skillRatio = roleOverlap.length ? 0.7 : 0.3;
  } else {
    skillRatio = matchingSkills.length / jobSkills.length;
    // Small boost when the role category is one the user targets, capped at 1.
    if (roleOverlap.length) skillRatio = Math.min(1, skillRatio + 0.1);
  }
  if (matchingSkills.length) reasons.push(`You have ${matchingSkills.length} of ${jobSkills.length} listed skills (${matchingSkills.slice(0, 4).join(', ')}${matchingSkills.length > 4 ? '…' : ''}).`);
  if (roleOverlap.length) reasons.push(`Role fits your target: ${roleOverlap.join(', ')}.`);

  // --- experience (25) ---
  const y = profile.experienceYears;
  let expRatio: number;
  let experienceFit: string;
  const { exp_min: min, exp_max: max } = job;
  if (min === null && max === null) {
    expRatio = 0.7;
    experienceFit = 'Experience requirement not stated';
  } else {
    const lo = min ?? 0;
    const hi = max ?? lo + 4;
    if (y >= lo && y <= hi) {
      expRatio = 1;
      experienceFit = `Your ${y} yrs fits the ${lo}${max !== null ? `–${hi}` : '+'} yrs requirement`;
      reasons.push('Experience is within the required range.');
    } else if (y < lo) {
      const gap = lo - y;
      expRatio = gap <= 1 ? 0.6 : gap <= 2 ? 0.3 : 0;
      experienceFit = `Requires ${lo}+ yrs; you have ${y} (${gap} yr short)`;
    } else {
      const over = y - hi;
      expRatio = over <= 2 ? 0.7 : 0.4;
      experienceFit = `Role targets up to ${hi} yrs; you have ${y} (may be junior for you)`;
    }
  }

  // --- industry (20) ---
  const wantsFintech = profile.industries.some((i) => FINTECH_KEYWORDS.test(i));
  const jobIsFintech = job.industry === 'Fintech' || FINTECH_KEYWORDS.test(`${job.company} ${job.title}`);
  let industryRatio: number;
  if (jobIsFintech && wantsFintech) {
    industryRatio = 1;
    reasons.push('Fintech / payments domain matches your industry preference.');
  } else if (profile.industries.length === 0) {
    industryRatio = 0.7;
  } else if (profile.industries.some((i) => /software|product|startup/i.test(i))) {
    industryRatio = 0.6;
  } else {
    industryRatio = 0.3;
  }

  // --- location (15) ---
  const prefs = profile.locations;
  const locHit = job.location_tags.filter((t) => prefs.includes(t));
  const locationRatio = prefs.length === 0 ? 1 : locHit.length ? 1 : 0;
  if (locHit.length) reasons.push(`Location matches your preference (${locHit.join(', ')}).`);

  const breakdown = {
    skills: Math.round(skillRatio * MATCH_WEIGHTS.skills),
    experience: Math.round(expRatio * MATCH_WEIGHTS.experience),
    industry: Math.round(industryRatio * MATCH_WEIGHTS.industry),
    location: Math.round(locationRatio * MATCH_WEIGHTS.location),
  };
  const score = breakdown.skills + breakdown.experience + breakdown.industry + breakdown.location;
  if (missingSkills.length) reasons.push(`Gaps to close: ${missingSkills.slice(0, 4).join(', ')}.`);
  return { score, breakdown, matchingSkills, missingSkills, experienceFit, reasons };
}
