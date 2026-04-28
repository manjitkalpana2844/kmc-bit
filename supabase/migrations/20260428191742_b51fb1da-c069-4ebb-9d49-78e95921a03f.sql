-- Access type enum
CREATE TYPE public.access_type AS ENUM ('semester_pass', 'monthly_all_access');

-- User access table
CREATE TABLE public.user_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  access_type public.access_type NOT NULL,
  semester INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT semester_required_for_pass CHECK (
    (access_type = 'semester_pass' AND semester IS NOT NULL) OR
    (access_type = 'monthly_all_access')
  )
);

CREATE INDEX idx_user_access_user_id ON public.user_access(user_id);
CREATE INDEX idx_user_access_active ON public.user_access(user_id, is_active) WHERE is_active = true;

ALTER TABLE public.user_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_access_admin_all"
  ON public.user_access FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_access_select_own"
  ON public.user_access FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_access_updated_at
BEFORE UPDATE ON public.user_access
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: does user have active paid access for a given semester?
CREATE OR REPLACE FUNCTION public.user_can_access_semester(_user_id UUID, _semester INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_access
    WHERE user_id = _user_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND (
        access_type = 'monthly_all_access'
        OR (access_type = 'semester_pass' AND semester = _semester)
      )
  )
$$;

-- Replace pdf_files SELECT policy: admin OR (semester unlocked AND user has paid access)
DROP POLICY IF EXISTS "pdf_files_select_unlocked" ON public.pdf_files;

CREATE POLICY "pdf_files_select_paid"
  ON public.pdf_files FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      EXISTS (
        SELECT 1 FROM public.semester_status s
        WHERE s.semester = pdf_files.semester AND s.is_locked = false
      )
      AND public.user_can_access_semester(auth.uid(), pdf_files.semester)
    )
  );