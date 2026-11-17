import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { asyncH, parse, uid } from '../lib/http.js';
import { getFullProfile } from '../services/profile.js';
import { ROLE_CATEGORIES } from '../lib/taxonomy.js';

const router = Router();
const strList = (max = 60) => z.array(z.string().trim().min(1).max(80)).max(max);

const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  currentRole: z.string().trim().max(120),
  totalExperience: z.coerce.number().min(0).max(60),
  currentCompany: z.string().trim().max(120),
  currentLocation: z.string().trim().max(120),
  technicalSkills: strList(),
  industries: strList(),
  projects: z.string().max(5000),
  expectedSalaryLpa: z.coerce.number().min(0).max(1000).nullable(),
  noticePeriodDays: z.coerce.number().int().min(0).max(365).nullable(),
  linkedinUrl: z.union([z.literal(''), z.string().url().max(300).refine((u) => /^https:\/\/([a-z]+\.)?linkedin\.com\//i.test(u), 'Must be a linkedin.com URL')]),
});

const prefsSchema = z
  .object({
    roles: z.array(z.enum(ROLE_CATEGORIES)).max(10),
    locations: strList(20),
    minExperience: z.coerce.number().int().min(0).max(40),
    maxExperience: z.coerce.number().int().min(0).max(40),
    industries: strList(),
    jobTypes: strList(10),
    minSalaryLpa: z.coerce.number().min(0).max(1000).nullable(),
  })
  .refine((p) => p.minExperience <= p.maxExperience, { message: 'Minimum experience cannot exceed maximum', path: ['minExperience'] });

router.get(
  '/',
  asyncH(async (req, res) => {
    res.json({ user: await getFullProfile(await getDb(), uid(req)) });
  }),
);

router.put(
  '/',
  asyncH(async (req, res) => {
    const p = parse(profileSchema, req.body);
    const db = await getDb();
    await db.query(
      `UPDATE user_profiles SET full_name=$2, current_role_title=$3, total_experience_years=$4, current_company=$5, current_location=$6,
         technical_skills=$7, industries=$8, projects=$9, expected_salary_lpa=$10, notice_period_days=$11, linkedin_url=$12, updated_at=now()
       WHERE user_id=$1`,
      [uid(req), p.fullName, p.currentRole, p.totalExperience, p.currentCompany, p.currentLocation, [...new Set(p.technicalSkills)],
        [...new Set(p.industries)], p.projects, p.expectedSalaryLpa, p.noticePeriodDays, p.linkedinUrl],
    );
    res.json({ user: await getFullProfile(db, uid(req)) });
  }),
);

router.put(
  '/preferences',
  asyncH(async (req, res) => {
    const p = parse(prefsSchema, req.body);
    const db = await getDb();
    await db.query(
      `UPDATE job_preferences SET roles=$2, locations=$3, min_experience=$4, max_experience=$5, industries=$6, job_types=$7, min_salary_lpa=$8, updated_at=now() WHERE user_id=$1`,
      [uid(req), p.roles, p.locations, p.minExperience, p.maxExperience, p.industries, p.jobTypes, p.minSalaryLpa],
    );
    res.json({ user: await getFullProfile(db, uid(req)) });
  }),
);

export default router;
