ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS motion_pref text NOT NULL DEFAULT 'auto';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_motion_pref_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_motion_pref_check
  CHECK (motion_pref IN ('auto', 'on', 'off'));