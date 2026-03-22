-- ============================================================
-- WalkThru Database Export - Full Schema + Data
-- Generated: 2026-03-17
-- Target: Azure PostgreSQL / Any PostgreSQL instance
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  url text DEFAULT '',
  icon_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.apps(id),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tour_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid NOT NULL REFERENCES public.tours(id),
  title text NOT NULL DEFAULT 'New Step',
  content text NOT NULL DEFAULT 'Describe what happens here.',
  selector text DEFAULT '',
  placement text NOT NULL DEFAULT 'bottom',
  target_url text,
  click_selector text,
  step_type text NOT NULL DEFAULT 'standard',
  video_url text,
  sort_order integer NOT NULL DEFAULT 0,
  fallback_selectors jsonb DEFAULT '[]'::jsonb,
  element_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tour_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid NOT NULL REFERENCES public.tours(id),
  app_id uuid NOT NULL REFERENCES public.apps(id),
  event_type text NOT NULL,
  session_id text NOT NULL,
  step_index integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.apps(id),
  name text NOT NULL,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.checklists(id),
  tour_id uuid NOT NULL REFERENCES public.tours(id),
  sort_order integer NOT NULL DEFAULT 0,
  is_required boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.launchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.apps(id),
  tour_id uuid REFERENCES public.tours(id),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'beacon',
  selector text NOT NULL DEFAULT '',
  label text DEFAULT '',
  color text DEFAULT '#1e6b45',
  pulse boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.process_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.apps(id),
  tour_id uuid REFERENCES public.tours(id),
  title text NOT NULL DEFAULT 'Untitled Recording',
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.process_recording_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id uuid NOT NULL REFERENCES public.process_recordings(id),
  action_type text NOT NULL DEFAULT 'click',
  instruction text NOT NULL DEFAULT '',
  notes text DEFAULT '',
  selector text DEFAULT '',
  target_url text DEFAULT '',
  screenshot_url text DEFAULT '',
  element_text text DEFAULT '',
  element_tag text DEFAULT '',
  input_value text DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER update_apps_updated_at BEFORE UPDATE ON public.apps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tours_updated_at BEFORE UPDATE ON public.tours
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tour_steps_updated_at BEFORE UPDATE ON public.tour_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checklists_updated_at BEFORE UPDATE ON public.checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_launchers_updated_at BEFORE UPDATE ON public.launchers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_process_recordings_updated_at BEFORE UPDATE ON public.process_recordings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_process_recording_steps_updated_at BEFORE UPDATE ON public.process_recording_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- DATA: apps
-- ============================================================

INSERT INTO public.apps (id, name, description, url, icon_url, created_at, updated_at) VALUES
  ('058f0b18-92f4-4187-9d33-ff4c5ce2a951', 'Employee Self-Service', 'An Employee Self-Service (ESS) portal is an internal system that allows employees to access and manage their own HR-related information and services online, e.g: viewing payslips, submitting leave requests, updating personal information, and accessing HR policies.', 'https://extranet.isdb.org', 'https://nuormxxwdqynyydkzlsd.supabase.co/storage/v1/object/public/app-icons/058f0b18-92f4-4187-9d33-ff4c5ce2a951/icon.png?t=1773350080700', '2026-03-12T21:09:19.456949+00:00', '2026-03-12T21:14:41.611324+00:00'),
  ('7b56fba9-d4d0-46f0-aebd-ca7718f4b644', 'Careers - IsDB', 'The Careers portal is an online recruitment platform where candidates can explore job opportunities, submit applications, and track their application status. The portal allows prospective employees to create profiles, upload resumes, and apply for positions across different departments and locations within the organization, helping streamline the hiring process and connect qualified talent with career opportunities at IsDB.', 'https://careers.isdb.org', NULL, '2026-03-12T21:11:03.712523+00:00', '2026-03-15T15:22:32.503306+00:00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DATA: tours
-- ============================================================

INSERT INTO public.tours (id, app_id, name, sort_order, created_at, updated_at) VALUES
  ('764079c0-16a7-49b0-a38e-504683349cfe', '058f0b18-92f4-4187-9d33-ff4c5ce2a951', 'Remote Work Request', 1, '2026-03-12T21:32:35.601995+00:00', '2026-03-12T21:38:40.357772+00:00'),
  ('bc4e9cbe-8982-4c54-bc1e-5577a787715e', '058f0b18-92f4-4187-9d33-ff4c5ce2a951', 'Digital Business Card', 2, '2026-03-12T21:41:33.693382+00:00', '2026-03-12T21:41:33.693382+00:00'),
  ('03c6f5d1-3b1e-45e0-8732-4d7ea1daa0bd', '058f0b18-92f4-4187-9d33-ff4c5ce2a951', 'Certification', 0, '2026-03-12T21:30:27.768607+00:00', '2026-03-12T21:44:10.9463+00:00'),
  ('c47e5a30-7d51-421b-9d58-9a52a07f917f', '7b56fba9-d4d0-46f0-aebd-ca7718f4b644', 'Career Portal Overview', 0, '2026-03-14T18:55:00.111917+00:00', '2026-03-14T19:21:40.89223+00:00'),
  ('dfb065b7-3d3d-43c2-9262-685fb2177e7e', '7b56fba9-d4d0-46f0-aebd-ca7718f4b644', 'Create Job Alert', 1, '2026-03-14T17:38:57.550952+00:00', '2026-03-14T19:21:40.892061+00:00'),
  ('7add15c1-0e25-4ecf-ba20-9b5f1466486a', '7b56fba9-d4d0-46f0-aebd-ca7718f4b644', 'Apply for a Job', 2, '2026-03-14T17:38:55.897562+00:00', '2026-03-14T19:21:40.895607+00:00'),
  ('18b12ede-2352-48b7-9a55-64891a4ed194', '7b56fba9-d4d0-46f0-aebd-ca7718f4b644', 'Join Talent Community', 3, '2026-03-14T17:38:56.481911+00:00', '2026-03-14T19:21:40.892086+00:00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DATA: tour_steps
-- ============================================================

INSERT INTO public.tour_steps (id, tour_id, title, content, selector, placement, target_url, click_selector, step_type, video_url, sort_order, created_at, updated_at) VALUES
  -- Certification steps
  ('b8308b9d-df62-49f4-8d84-afadb1f5c377', '03c6f5d1-3b1e-45e0-8732-4d7ea1daa0bd', 'Employee Certifcation', 'click on Employee Certification', '.nepTileB5138C665FA7711FE10000000AC6024A', 'bottom', NULL, NULL, 'standard', NULL, 0, '2026-03-13T21:06:08.747187+00:00', '2026-03-14T14:42:35.562736+00:00'),
  ('7edd2302-4bf2-41a8-9a83-a2f1fa07753d', '03c6f5d1-3b1e-45e0-8732-4d7ea1daa0bd', 'Language', 'Select the certificate language', '[id$="--SimpleForm2"] > div > div > div > div > div > div > div > div', 'bottom', 'https://extranet.isdb.org/neptune/webapp/?sap-client=100&launchpad=ESS#StaffCertificates-Display', NULL, 'standard', NULL, 1, '2026-03-14T14:42:41.698334+00:00', '2026-03-14T14:50:05.568581+00:00'),
  ('56b078f8-3ca4-44dd-8e75-e29fe21a1544', '03c6f5d1-3b1e-45e0-8732-4d7ea1daa0bd', 'Type', 'Choose the form type', '[id$="--SimpleForm4"] div:nth-of-type(3)', 'bottom', NULL, '[id$="--RadioEnglish-Button"]', 'standard', NULL, 2, '2026-03-14T14:44:20.063157+00:00', '2026-03-14T14:45:27.590602+00:00'),
  -- Apply for a Job steps
  ('01d77f15-de74-49a4-bfa4-3695ab642e5b', '7add15c1-0e25-4ecf-ba20-9b5f1466486a', 'Welcome to IsDB Careers', 'Welcome! This guide will show you how to search and apply for a job at the Islamic Development Bank.', '', 'center', 'https://careers.isdb.org/', NULL, 'standard', NULL, 0, '2026-03-14T17:38:56.262058+00:00', '2026-03-14T17:38:56.262058+00:00'),
  ('ed694e7c-7eb7-4510-9e7c-d6b938a85e47', '7add15c1-0e25-4ecf-ba20-9b5f1466486a', 'Open Job Opportunities', 'Click here to explore current job opportunities available at IsDB.', 'a[href*=''search'']', 'bottom', 'https://careers.isdb.org/', NULL, 'standard', NULL, 1, '2026-03-14T17:38:56.262058+00:00', '2026-03-14T17:38:56.262058+00:00'),
  ('9fd9795e-f65c-4503-a0fc-2514d7b736b8', '7add15c1-0e25-4ecf-ba20-9b5f1466486a', 'Search Jobs', 'Use this search field to find jobs by keyword, department, or location.', 'input[type=''search'']', 'bottom', 'https://careers.isdb.org/search', NULL, 'standard', NULL, 2, '2026-03-14T17:38:56.262058+00:00', '2026-03-14T17:38:56.262058+00:00'),
  ('1f3dddec-1dd7-4782-a90e-467cd328337d', '7add15c1-0e25-4ecf-ba20-9b5f1466486a', 'Apply Filters', 'You can refine your search using filters such as location, category, or posting date.', '.filters, .search-filters', 'bottom', 'https://careers.isdb.org/search', NULL, 'standard', NULL, 3, '2026-03-14T17:38:56.262058+00:00', '2026-03-14T17:38:56.262058+00:00'),
  ('893de23a-7fb3-4304-af61-f381605ebfc3', '7add15c1-0e25-4ecf-ba20-9b5f1466486a', 'Select a Job', 'Click a job title to view the full description and requirements.', 'a[href*=''/job/'']', 'bottom', 'https://careers.isdb.org/search', NULL, 'standard', NULL, 4, '2026-03-14T17:38:56.262058+00:00', '2026-03-14T17:38:56.262058+00:00'),
  ('86e1ae72-ff32-4948-b0e9-9bbdbd7bada3', '7add15c1-0e25-4ecf-ba20-9b5f1466486a', 'Review Job Description', 'Review the job responsibilities, qualifications, and required skills.', '.job-description, #jobDescriptionText', 'bottom', NULL, NULL, 'standard', NULL, 5, '2026-03-14T17:38:56.262058+00:00', '2026-03-14T17:38:56.262058+00:00'),
  ('184ffdc8-3562-44ad-b654-e4a183a8d83f', '7add15c1-0e25-4ecf-ba20-9b5f1466486a', 'Apply Now', 'If this role matches your skills and experience, click Apply to start your application.', 'a[data-ph-at-id=''apply-button''], .apply-button', 'bottom', NULL, NULL, 'standard', NULL, 6, '2026-03-14T17:38:56.262058+00:00', '2026-03-14T17:38:56.262058+00:00'),
  ('05156901-9901-45a2-928f-16604473c4be', '7add15c1-0e25-4ecf-ba20-9b5f1466486a', 'Sign In or Register', 'Sign in or create an account to continue the application process.', 'input[type=''email'']', 'bottom', NULL, NULL, 'standard', NULL, 7, '2026-03-14T17:38:56.262058+00:00', '2026-03-14T17:38:56.262058+00:00'),
  ('f7a51a71-6f7a-4a47-b037-d11ebedcb327', '7add15c1-0e25-4ecf-ba20-9b5f1466486a', 'Upload CV', 'Upload your resume or CV so the recruitment team can review your experience.', 'input[type=''file'']', 'bottom', NULL, NULL, 'standard', NULL, 8, '2026-03-14T17:38:56.262058+00:00', '2026-03-14T17:38:56.262058+00:00'),
  ('a716f369-7682-4cf3-b1a9-50fa7862838d', '7add15c1-0e25-4ecf-ba20-9b5f1466486a', 'Submit Application', 'Once all required information is completed, submit your application.', 'button[type=''submit'']', 'bottom', NULL, NULL, 'standard', NULL, 9, '2026-03-14T17:38:56.262058+00:00', '2026-03-14T17:38:56.262058+00:00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DATA: process_recordings
-- ============================================================

INSERT INTO public.process_recordings (id, app_id, tour_id, title, description, status, created_at, updated_at) VALUES
  ('451a5f57-1a52-4a30-a599-acd014761dff', '058f0b18-92f4-4187-9d33-ff4c5ce2a951', NULL, 'Recording 3/14/2026, 12:19:10 PM', '', 'recording', '2026-03-14T09:19:10.222898+00:00', '2026-03-14T09:19:10.222898+00:00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DATA: tour_events (analytics - partial, may be large)
-- Note: tour_events data is large. Run this query on your
-- Lovable Cloud to get the full export if needed:
--   SELECT * FROM tour_events;
-- ============================================================

-- (tour_events data omitted due to volume - see note above)

-- ============================================================
-- INDEXES (optional, for performance)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tours_app_id ON public.tours(app_id);
CREATE INDEX IF NOT EXISTS idx_tour_steps_tour_id ON public.tour_steps(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_events_tour_id ON public.tour_events(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_events_app_id ON public.tour_events(app_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON public.checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_launchers_app_id ON public.launchers(app_id);
CREATE INDEX IF NOT EXISTS idx_process_recordings_app_id ON public.process_recordings(app_id);
CREATE INDEX IF NOT EXISTS idx_process_recording_steps_recording_id ON public.process_recording_steps(recording_id);
