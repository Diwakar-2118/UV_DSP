-- CareerPilot AI – initial schema (PostgreSQL 14+ / Supabase / PGlite compatible)

CREATE TABLE users (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            text NOT NULL,
  password_hash    text,                       -- null when auth is delegated to Supabase
  auth_provider    text NOT NULL DEFAULT 'local' CHECK (auth_provider IN ('local', 'supabase')),
  external_auth_id text,                       -- Supabase auth.users.id
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_login_at    timestamptz
);
CREATE UNIQUE INDEX users_email_uq ON users (lower(email));
CREATE UNIQUE INDEX users_external_auth_uq ON users (external_auth_id) WHERE external_auth_id IS NOT NULL;

CREATE TABLE user_profiles (
  user_id                uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name              text NOT NULL DEFAULT '',
  current_role_title     text NOT NULL DEFAULT '',
  total_experience_years numeric(4,1) NOT NULL DEFAULT 0 CHECK (total_experience_years >= 0 AND total_experience_years <= 60),
  current_company        text NOT NULL DEFAULT '',
  current_location       text NOT NULL DEFAULT '',
  technical_skills       text[] NOT NULL DEFAULT '{}',
  industries             text[] NOT NULL DEFAULT '{}',
  projects               text NOT NULL DEFAULT '',
  expected_salary_lpa    numeric(6,2),
  notice_period_days     integer CHECK (notice_period_days IS NULL OR notice_period_days BETWEEN 0 AND 365),
  linkedin_url           text NOT NULL DEFAULT '',
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE job_preferences (
  user_id        uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  roles          text[] NOT NULL DEFAULT '{}',
  locations      text[] NOT NULL DEFAULT '{}',
  min_experience integer NOT NULL DEFAULT 3,
  max_experience integer NOT NULL DEFAULT 5,
  industries     text[] NOT NULL DEFAULT '{}',
  job_types      text[] NOT NULL DEFAULT '{}',
  min_salary_lpa numeric(6,2),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (min_experience <= max_experience)
);

CREATE TABLE job_sources (
  id                   text PRIMARY KEY,
  name                 text NOT NULL,
  kind                 text NOT NULL CHECK (kind IN ('api', 'career_page', 'search_link', 'demo')),
  website              text NOT NULL DEFAULT '',
  description          text NOT NULL DEFAULT '',
  enabled              boolean NOT NULL DEFAULT true,
  requires_credentials boolean NOT NULL DEFAULT false,
  is_live              boolean NOT NULL DEFAULT true,
  last_run_at          timestamptz,
  last_status          text,
  last_error           text,
  last_fetched         integer NOT NULL DEFAULT 0,
  last_inserted        integer NOT NULL DEFAULT 0
);

CREATE TABLE jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id       text NOT NULL REFERENCES job_sources(id) ON DELETE CASCADE,
  external_id     text NOT NULL,
  source_site     text NOT NULL DEFAULT '',     -- website the listing originates from (e.g. LinkedIn via JSearch)
  title           text NOT NULL,
  company         text NOT NULL,
  location        text NOT NULL DEFAULT '',
  location_tags   text[] NOT NULL DEFAULT '{}',   -- normalised: Bengaluru, Hyderabad, Remote, Other
  exp_min         integer,
  exp_max         integer,
  salary_min_lpa  numeric(8,2),
  salary_max_lpa  numeric(8,2),
  salary_text     text,
  job_type        text,
  industry        text,
  skills          text[] NOT NULL DEFAULT '{}',
  roles           text[] NOT NULL DEFAULT '{}',   -- normalised role categories
  notice_period   text,
  description     text NOT NULL DEFAULT '',
  posted_at       timestamptz NOT NULL DEFAULT now(),
  apply_url       text,
  normalized_url  text,
  fingerprint     text NOT NULL,                 -- normalised title|company|location for cross-source dedupe
  is_demo         boolean NOT NULL DEFAULT false,
  is_active       boolean NOT NULL DEFAULT true,
  first_seen_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, external_id)
);
CREATE UNIQUE INDEX jobs_normalized_url_uq ON jobs (normalized_url) WHERE normalized_url IS NOT NULL;
CREATE INDEX jobs_fingerprint_idx ON jobs (fingerprint);
CREATE INDEX jobs_posted_at_idx ON jobs (posted_at DESC);
CREATE INDEX jobs_first_seen_idx ON jobs (first_seen_at DESC);
CREATE INDEX jobs_roles_gin ON jobs USING gin (roles);
CREATE INDEX jobs_location_tags_gin ON jobs USING gin (location_tags);

CREATE TABLE saved_jobs (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id     uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);

CREATE TABLE notification_settings (
  user_id              uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled              boolean NOT NULL DEFAULT true,
  frequency            text NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily')),
  delivery_time        text NOT NULL DEFAULT '09:00' CHECK (delivery_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  timezone             text NOT NULL DEFAULT 'Asia/Kolkata',
  min_match_score      integer NOT NULL DEFAULT 60 CHECK (min_match_score BETWEEN 0 AND 100),
  roles                text[] NOT NULL DEFAULT '{}',
  locations            text[] NOT NULL DEFAULT '{}',
  in_app_enabled       boolean NOT NULL DEFAULT true,
  email_enabled        boolean NOT NULL DEFAULT true,
  email_verified_at    timestamptz,             -- set only after a successful test email
  telegram_enabled     boolean NOT NULL DEFAULT false,
  telegram_chat_id     text,
  telegram_verified_at timestamptz,             -- set only after a successful test message
  last_digest_on       date,
  last_alert_run_at    timestamptz
);

CREATE TABLE job_notifications (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id           uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  match_score      integer NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  read_at          timestamptz,
  emailed_at       timestamptz,
  telegram_sent_at timestamptz,
  UNIQUE (user_id, job_id)                      -- a job is never notified twice to the same user
);
CREATE INDEX job_notifications_user_idx ON job_notifications (user_id, created_at DESC);

CREATE TABLE notification_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel    text NOT NULL CHECK (channel IN ('email', 'telegram', 'in_app')),
  kind       text NOT NULL CHECK (kind IN ('digest', 'test')),
  status     text NOT NULL CHECK (status IN ('sent', 'failed', 'skipped', 'recorded')),
  job_count  integer NOT NULL DEFAULT 0,
  transport  text,
  detail     text,
  payload    jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notification_log_user_idx ON notification_log (user_id, created_at DESC);

CREATE TABLE applications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id          uuid REFERENCES jobs(id) ON DELETE SET NULL,
  company         text NOT NULL,
  role_title      text NOT NULL,
  job_url         text NOT NULL DEFAULT '',
  location        text NOT NULL DEFAULT '',
  status          text NOT NULL DEFAULT 'Interested' CHECK (status IN
                  ('Interested','Applied','Resume Shortlisted','Interview Scheduled','Technical Round','HR Round','Selected','Rejected')),
  applied_on      date,
  interview_at    timestamptz,
  recruiter_name  text NOT NULL DEFAULT '',
  recruiter_email text NOT NULL DEFAULT '',
  recruiter_phone text NOT NULL DEFAULT '',
  company_notes   text NOT NULL DEFAULT '',
  notes           text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX applications_user_idx ON applications (user_id, updated_at DESC);

CREATE TABLE interview_questions (
  id             text PRIMARY KEY,
  category       text NOT NULL,
  topic          text NOT NULL,
  difficulty     text NOT NULL CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  qtype          text NOT NULL CHECK (qtype IN ('mcq', 'technical', 'scenario', 'practical', 'hr')),
  question       text NOT NULL,
  options        jsonb,
  correct_option integer,
  ideal_answer   text NOT NULL,
  key_points     jsonb NOT NULL DEFAULT '[]',
  source         text NOT NULL DEFAULT 'curated' CHECK (source IN ('curated', 'ai_generated')),
  company        text,
  created_by     uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX interview_questions_cat_idx ON interview_questions (category, difficulty);

CREATE TABLE interviews (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category         text NOT NULL,
  mode             text NOT NULL,
  difficulty       text NOT NULL,
  experience_level text NOT NULL DEFAULT '3-5 years',
  question_count   integer NOT NULL CHECK (question_count BETWEEN 1 AND 30),
  duration_minutes integer,
  status           text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'expired')),
  question_ids     text[] NOT NULL,
  started_at       timestamptz NOT NULL DEFAULT now(),
  ends_at          timestamptz,
  completed_at     timestamptz,
  total_score      numeric(6,2),
  max_score        numeric(6,2),
  summary          jsonb
);
CREATE INDEX interviews_user_idx ON interviews (user_id, started_at DESC);

CREATE TABLE interview_attempts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id   uuid NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  question_id    text NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
  position       integer NOT NULL,
  answer         text NOT NULL DEFAULT '',
  selected_option integer,
  answered_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (interview_id, position)
);

CREATE TABLE interview_feedback (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id     uuid NOT NULL UNIQUE REFERENCES interview_attempts(id) ON DELETE CASCADE,
  score          numeric(4,1) NOT NULL CHECK (score BETWEEN 0 AND 10),
  is_correct     boolean NOT NULL,
  covered_points jsonb NOT NULL DEFAULT '[]',
  missing_points jsonb NOT NULL DEFAULT '[]',
  suggestions    jsonb NOT NULL DEFAULT '[]',
  feedback       text NOT NULL DEFAULT '',
  evaluator      text NOT NULL CHECK (evaluator IN ('ai', 'offline')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE resumes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename       text NOT NULL,
  mime_type      text NOT NULL,
  size_bytes     integer NOT NULL,
  file_data      bytea NOT NULL,
  extracted_text text NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX resumes_user_idx ON resumes (user_id, created_at DESC);

CREATE TABLE resume_analysis (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id       uuid NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_description text,
  match_score     integer,
  ats_score       integer NOT NULL,
  result          jsonb NOT NULL,
  evaluator       text NOT NULL CHECK (evaluator IN ('ai', 'offline')),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX resume_analysis_user_idx ON resume_analysis (user_id, created_at DESC);

CREATE TABLE study_plans (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title              text NOT NULL,
  start_date         date NOT NULL,
  days               integer NOT NULL CHECK (days BETWEEN 1 AND 90),
  daily_goal_minutes integer NOT NULL DEFAULT 90 CHECK (daily_goal_minutes BETWEEN 15 AND 600),
  focus_areas        text[] NOT NULL DEFAULT '{}',
  is_active          boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX study_plans_user_idx ON study_plans (user_id, created_at DESC);

CREATE TABLE study_progress (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id      uuid NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_number   integer NOT NULL,
  plan_date    date NOT NULL,
  category     text NOT NULL,
  topic        text NOT NULL,
  task         text NOT NULL,
  minutes      integer NOT NULL DEFAULT 30,
  completed_at timestamptz,
  notes        text NOT NULL DEFAULT ''
);
CREATE INDEX study_progress_plan_idx ON study_progress (plan_id, day_number);

CREATE TABLE company_prep_cache (
  company_key text NOT NULL,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payload     jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_key, user_id)
);
