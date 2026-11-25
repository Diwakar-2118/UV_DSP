export const QA_ROLES = ['Manual QA', 'API Testing', 'Fintech QA', 'QA Automation', 'Performance Testing'] as const;
export const IT_ROLES = [
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
/** All IT role families (QA & testing plus every other IT role). */
export const ROLE_CATEGORIES = [...QA_ROLES, ...IT_ROLES] as const;
/** Search keyword for each role family (used for job-board deep links). */
export const ROLE_KEYWORDS: Record<string, string> = {
  'Manual QA': 'QA Engineer', 'API Testing': 'API Test Engineer', 'Fintech QA': 'QA Engineer', 'QA Automation': 'SDET', 'Performance Testing': 'Performance Test Engineer',
  'Software Engineering': 'Software Engineer', 'Frontend Development': 'Frontend Developer', 'Backend Development': 'Backend Developer',
  'Full Stack Development': 'Full Stack Developer', 'Mobile Development': 'Mobile Developer', 'DevOps / SRE': 'DevOps Engineer',
  'Cloud Engineering': 'Cloud Engineer', 'Data Engineering': 'Data Engineer', 'Data Science / ML': 'Data Scientist', 'Data Analytics': 'Data Analyst',
  Cybersecurity: 'Security Engineer', 'Product Management': 'Product Manager', 'UI/UX Design': 'UX Designer', 'Business Analysis': 'Business Analyst',
  'IT Support & Admin': 'IT Support', 'Engineering Management': 'Engineering Manager',
};
export const LOCATIONS = ['Bengaluru', 'Hyderabad', 'Remote'] as const;
export const APPLICATION_STATUSES = ['Interested', 'Applied', 'Resume Shortlisted', 'Interview Scheduled', 'Technical Round', 'HR Round', 'Selected', 'Rejected'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface User {
  id: string;
  email: string;
  createdAt: string;
  profile: {
    fullName: string;
    currentRole: string;
    totalExperience: number;
    currentCompany: string;
    currentLocation: string;
    technicalSkills: string[];
    industries: string[];
    projects: string;
    expectedSalaryLpa: number | null;
    noticePeriodDays: number | null;
    linkedinUrl: string;
  };
  preferences: {
    roles: string[];
    locations: string[];
    minExperience: number;
    maxExperience: number;
    industries: string[];
    jobTypes: string[];
    minSalaryLpa: number | null;
  };
  latestResume: { id: string; filename: string; created_at: string } | null;
}

export interface MatchResult {
  score: number;
  breakdown: { skills: number; experience: number; industry: number; location: number };
  matchingSkills: string[];
  missingSkills: string[];
  experienceFit: string;
  reasons: string[];
}

export interface Job {
  id: string;
  source_id: string;
  source_name: string;
  source_site: string;
  title: string;
  company: string;
  location: string;
  location_tags: string[];
  exp_min: number | null;
  exp_max: number | null;
  salary_min_lpa: number | null;
  salary_max_lpa: number | null;
  salary_text: string | null;
  job_type: string | null;
  industry: string | null;
  skills: string[];
  roles: string[];
  notice_period: string | null;
  description: string;
  posted_at: string;
  apply_url: string | null;
  saved: boolean;
  match: MatchResult;
}

export interface JobSearchResponse {
  total: number;
  page: number;
  pageSize: number;
  liveAvailable: boolean;
  jobs: Job[];
}

export interface Application {
  id: string;
  job_id: string | null;
  company: string;
  role_title: string;
  job_url: string;
  location: string;
  status: ApplicationStatus;
  applied_on: string | null;
  interview_at: string | null;
  recruiter_name: string;
  recruiter_email: string;
  recruiter_phone: string;
  company_notes: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  position: number;
  total: number;
  category: string;
  topic: string;
  difficulty: string;
  qtype: string;
  question: string;
  options: string[] | null;
  source: string;
}

export interface InterviewInfo {
  id: string;
  category: string;
  mode: string;
  difficulty: string;
  questionCount: number;
  durationMinutes: number | null;
  status: 'in_progress' | 'completed' | 'expired';
  startedAt: string;
  endsAt: string | null;
  totalScore: number | null;
  maxScore: number | null;
  answered: number;
  summary: null | {
    percentage: number;
    answered: number;
    unanswered: number;
    correct: number;
    topics: { category: string; topic: string; avg: number }[];
    weakTopics: { category: string; topic: string; avg: number }[];
    strongTopics: { category: string; topic: string; avg: number }[];
    suggestions: string[];
    recommendedNext: { category: string; topic: string | null; difficulty: string; mode: string };
  };
}

export interface Evaluation {
  score: number;
  isCorrect: boolean;
  coveredPoints: string[];
  missingPoints: string[];
  suggestions: string[];
  feedback: string;
  evaluator: 'ai' | 'offline';
}
