-- Optional defence-in-depth for Supabase deployments.
--
-- The CareerPilot API connects with a privileged database role and enforces per-user access in every query
-- (WHERE user_id = <session user>). These policies additionally lock the tables down so that the public
-- Supabase REST/Realtime APIs (anon / authenticated roles) cannot read anyone's data directly.
--
-- Run AFTER the app has applied its migrations (server/src/db/migrations), in the Supabase SQL editor.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','user_profiles','job_preferences','jobs','job_sources','saved_jobs','job_notifications','notification_settings',
    'notification_log','applications','interviews','interview_questions','interview_attempts','interview_feedback',
    'resumes','resume_analysis','study_plans','study_progress','company_prep_cache','schema_migrations'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END $$;

-- Authenticated Supabase users may read only their own rows (useful if you later query from the browser).
-- users.external_auth_id holds auth.users.id when AUTH_PROVIDER=supabase.
CREATE POLICY own_user ON public.users FOR SELECT TO authenticated USING (external_auth_id = auth.uid()::text);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'user_profiles','job_preferences','saved_jobs','job_notifications','notification_settings','notification_log',
    'applications','interviews','resumes','resume_analysis','study_plans','study_progress'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY own_rows ON public.%I FOR SELECT TO authenticated USING (user_id IN (SELECT id FROM public.users WHERE external_auth_id = auth.uid()::text))', t);
  END LOOP;
END $$;

-- Public job listings and the curated question bank are readable by signed-in users.
CREATE POLICY read_jobs ON public.jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY read_sources ON public.job_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY read_curated_questions ON public.interview_questions FOR SELECT TO authenticated USING (source = 'curated');
-- No INSERT/UPDATE/DELETE policies: all writes go through the API.
