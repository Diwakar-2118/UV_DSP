-- How many fetched listings were QA/testing roles in the last run (fetched → relevant → new).
ALTER TABLE job_sources ADD COLUMN IF NOT EXISTS last_relevant integer NOT NULL DEFAULT 0;

-- Remotive's public feed no longer honours the QA category/search, so it only returns unrelated roles.
-- Turn it off by default; it can be re-enabled in Settings → Job sources.
UPDATE job_sources SET enabled = false WHERE id = 'remotive';
