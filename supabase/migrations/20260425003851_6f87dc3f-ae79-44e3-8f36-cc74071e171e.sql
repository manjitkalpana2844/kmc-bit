
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'student');
CREATE TYPE public.exam_type AS ENUM ('first_term', 'mid_term', 'final', 'board', 'model_questions');
CREATE TYPE public.notification_type AS ENUM ('new_paper', 'exam_reminder', 'announcement');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  login_provider TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles (separate table - critical for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Semester status
CREATE TABLE public.semester_status (
  semester INT PRIMARY KEY CHECK (semester BETWEEN 1 AND 8),
  is_locked BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.semester_status ENABLE ROW LEVEL SECURITY;

INSERT INTO public.semester_status (semester, is_locked) VALUES
  (1, FALSE), (2, TRUE), (3, TRUE), (4, TRUE),
  (5, TRUE), (6, TRUE), (7, TRUE), (8, TRUE);

-- PDF files
CREATE TABLE public.pdf_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semester INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
  subject TEXT NOT NULL,
  exam_type public.exam_type NOT NULL,
  year INT NOT NULL CHECK (year BETWEEN 2078 AND 2090),
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pdf_files ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_pdf_semester_subject ON public.pdf_files(semester, subject);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type public.notification_type NOT NULL,
  pdf_id UUID REFERENCES public.pdf_files(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notification reads
CREATE TABLE public.notification_reads (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, notification_id)
);
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- ===== RLS Policies =====

-- profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_select_admin" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- user_roles
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- semester_status
CREATE POLICY "semester_status_select_all" ON public.semester_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "semester_status_admin_update" ON public.semester_status FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- pdf_files
CREATE POLICY "pdf_files_select_unlocked" ON public.pdf_files FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1 FROM public.semester_status s WHERE s.semester = pdf_files.semester AND s.is_locked = FALSE
  )
);
CREATE POLICY "pdf_files_admin_all" ON public.pdf_files FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- notifications
CREATE POLICY "notifications_select_all" ON public.notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "notifications_admin_all" ON public.notifications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- notification_reads
CREATE POLICY "notification_reads_own" ON public.notification_reads FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== Auto-create profile + role on signup =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url, login_provider)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== Storage bucket for PDFs =====
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('pdfs', 'pdfs', false, 52428800, ARRAY['application/pdf']);

-- Storage policies
CREATE POLICY "pdfs_admin_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'pdfs' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'pdfs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "pdfs_student_read_unlocked" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'pdfs' AND (
      public.has_role(auth.uid(), 'admin') OR
      EXISTS (
        SELECT 1 FROM public.pdf_files p
        JOIN public.semester_status s ON s.semester = p.semester
        WHERE p.file_path = storage.objects.name AND s.is_locked = FALSE
      )
    )
  );
