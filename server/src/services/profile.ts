import type { Db } from '../db/index.js';
import { QA_CATEGORIES, PREFERRED_LOCATIONS } from '../lib/taxonomy.js';

/** Primary user profile from the product brief – used to pre-populate every new account. */
export const DEFAULT_PROFILE = {
  current_role_title: 'QA Engineer',
  total_experience_years: 3,
  current_location: 'Bengaluru',
  technical_skills: [
    'Manual Testing', 'Functional Testing', 'Regression Testing', 'API Testing', 'Postman', 'SQL', 'Jira', 'Spira',
    'Playwright', 'Selenium', 'Java', 'JavaScript', 'TypeScript', 'Cucumber', 'JMeter', 'Payment Gateway Testing',
    'Acquiring', 'Clearing', 'Settlement', 'Reconciliation', 'UPI', 'POS Transactions', 'ISO 8583',
  ],
  industries: ['Fintech', 'Payment Processing', 'Banking', 'Financial Technology', 'Payment Gateways', 'Product-Based Companies', 'Software Companies', 'Startups'],
};

export const DEFAULT_PREFERENCES = {
  roles: [...QA_CATEGORIES], // a QA-focused default; any IT role family can be chosen
  locations: [...PREFERRED_LOCATIONS],
  min_experience: 3,
  max_experience: 5,
  industries: DEFAULT_PROFILE.industries,
};

export async function createDefaultsForUser(db: Db, userId: string, fullName: string) {
  await db.query(
    `INSERT INTO user_profiles (user_id, full_name, current_role_title, total_experience_years, current_location, technical_skills, industries)
     VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (user_id) DO NOTHING`,
    [userId, fullName, DEFAULT_PROFILE.current_role_title, DEFAULT_PROFILE.total_experience_years, DEFAULT_PROFILE.current_location,
      DEFAULT_PROFILE.technical_skills, DEFAULT_PROFILE.industries],
  );
  await db.query(
    `INSERT INTO job_preferences (user_id, roles, locations, min_experience, max_experience, industries)
     VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (user_id) DO NOTHING`,
    [userId, DEFAULT_PREFERENCES.roles, DEFAULT_PREFERENCES.locations, DEFAULT_PREFERENCES.min_experience,
      DEFAULT_PREFERENCES.max_experience, DEFAULT_PREFERENCES.industries],
  );
  await db.query(
    `INSERT INTO notification_settings (user_id, roles, locations) VALUES ($1,$2,$3) ON CONFLICT (user_id) DO NOTHING`,
    [userId, DEFAULT_PREFERENCES.roles, DEFAULT_PREFERENCES.locations],
  );
}

export async function getFullProfile(db: Db, userId: string) {
  const [row] = await db.query(
    `SELECT u.id, u.email, u.created_at, p.full_name, p.current_role_title, p.total_experience_years, p.current_company,
            p.current_location, p.technical_skills, p.industries, p.projects, p.expected_salary_lpa, p.notice_period_days,
            p.linkedin_url, jp.roles AS pref_roles, jp.locations AS pref_locations, jp.min_experience, jp.max_experience,
            jp.industries AS pref_industries, jp.job_types AS pref_job_types, jp.min_salary_lpa,
            (SELECT json_build_object('id', r.id, 'filename', r.filename, 'created_at', r.created_at)
               FROM resumes r WHERE r.user_id=u.id ORDER BY r.created_at DESC LIMIT 1) AS latest_resume
       FROM users u JOIN user_profiles p ON p.user_id=u.id JOIN job_preferences jp ON jp.user_id=u.id WHERE u.id=$1`,
    [userId],
  );
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    createdAt: row.created_at,
    profile: {
      fullName: row.full_name,
      currentRole: row.current_role_title,
      totalExperience: Number(row.total_experience_years),
      currentCompany: row.current_company,
      currentLocation: row.current_location,
      technicalSkills: row.technical_skills,
      industries: row.industries,
      projects: row.projects,
      expectedSalaryLpa: row.expected_salary_lpa,
      noticePeriodDays: row.notice_period_days,
      linkedinUrl: row.linkedin_url,
    },
    preferences: {
      roles: row.pref_roles,
      locations: row.pref_locations,
      minExperience: row.min_experience,
      maxExperience: row.max_experience,
      industries: row.pref_industries,
      jobTypes: row.pref_job_types,
      minSalaryLpa: row.min_salary_lpa,
    },
    latestResume: row.latest_resume,
  };
}
