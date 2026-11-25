-- No demo data: remove the demo source and every demo listing (saved/alert rows cascade;
-- applications keep their own copy of title/company and just lose the job link).
DELETE FROM jobs WHERE is_demo;
DELETE FROM job_sources WHERE id = 'demo' OR kind = 'demo';

-- Allow a 'user' kind for jobs the user pastes in themselves.
ALTER TABLE job_sources DROP CONSTRAINT IF EXISTS job_sources_kind_check;
ALTER TABLE job_sources ADD CONSTRAINT job_sources_kind_check CHECK (kind IN ('api', 'career_page', 'search_link', 'user'));

INSERT INTO job_sources (id, name, kind, website, description, requires_credentials, is_live, enabled)
VALUES ('manual', 'Added by you', 'user', '', 'Jobs you pasted in yourself (text and link). Nothing is fetched from the link.', false, true, true)
ON CONFLICT (id) DO NOTHING;
