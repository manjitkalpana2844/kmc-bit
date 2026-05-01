
-- Allow admins to insert semester_status rows (upsert support)
CREATE POLICY "semester_status_admin_insert"
ON public.semester_status
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed 8 semesters as unlocked (no-op if rows already exist)
INSERT INTO public.semester_status (semester, is_locked)
SELECT s, false FROM generate_series(1, 8) AS s
ON CONFLICT (semester) DO NOTHING;

-- Seed branding settings if missing
INSERT INTO public.app_settings (key, value)
VALUES (
  'branding',
  jsonb_build_object(
    'campus_name', 'BIT KMC Question Bank',
    'campus_subtitle', 'Kailali Multiple Campus',
    'logo_url', '',
    'contact_email', '',
    'contact_phone', '',
    'footer_text', 'Made for BIT students of Kailali Multiple Campus'
  )
)
ON CONFLICT (key) DO NOTHING;

-- Seed feature flags if missing
INSERT INTO public.app_settings (key, value)
VALUES (
  'features',
  jsonb_build_object(
    'comments_enabled', true,
    'ratings_enabled', true,
    'bookmarks_enabled', true,
    'offline_enabled', true,
    'notifications_enabled', true,
    'feedback_enabled', true
  )
)
ON CONFLICT (key) DO NOTHING;
