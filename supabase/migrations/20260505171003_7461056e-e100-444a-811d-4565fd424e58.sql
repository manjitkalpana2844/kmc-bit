-- Books library table (reference books, view-only for students)
CREATE TABLE public.books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  description TEXT,
  semester INTEGER,
  subject TEXT,
  cover_url TEXT,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "books_select_authenticated" ON public.books
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "books_admin_all" ON public.books
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reuse the existing private "pdfs" bucket for book files (admins upload via service role / RLS).
-- Existing pdfs bucket policies already allow admin uploads.