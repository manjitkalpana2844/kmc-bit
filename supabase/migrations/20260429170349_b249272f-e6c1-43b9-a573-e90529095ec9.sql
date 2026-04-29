-- Bookmarks
CREATE TABLE public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pdf_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, pdf_id)
);
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookmarks_own" ON public.bookmarks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bookmarks_admin_read" ON public.bookmarks FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Recently viewed
CREATE TABLE public.recently_viewed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pdf_id uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, pdf_id)
);
CREATE INDEX idx_recently_viewed_user_time ON public.recently_viewed (user_id, viewed_at DESC);
ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recently_viewed_own" ON public.recently_viewed FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PDF views (aggregate counter)
CREATE TABLE public.pdf_views (
  pdf_id uuid PRIMARY KEY,
  view_count bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pdf_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdf_views_select_all" ON public.pdf_views FOR SELECT TO authenticated USING (true);
CREATE POLICY "pdf_views_admin_all" ON public.pdf_views FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.increment_pdf_view(_pdf_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.pdf_views (pdf_id, view_count, updated_at)
  VALUES (_pdf_id, 1, now())
  ON CONFLICT (pdf_id) DO UPDATE
    SET view_count = public.pdf_views.view_count + 1,
        updated_at = now();

  INSERT INTO public.recently_viewed (user_id, pdf_id, viewed_at)
  VALUES (auth.uid(), _pdf_id, now())
  ON CONFLICT (user_id, pdf_id) DO UPDATE SET viewed_at = now();
END;
$$;

-- PDF downloads log
CREATE TABLE public.pdf_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pdf_id uuid NOT NULL,
  downloaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pdf_downloads_user_time ON public.pdf_downloads (user_id, downloaded_at DESC);
CREATE INDEX idx_pdf_downloads_pdf ON public.pdf_downloads (pdf_id);
ALTER TABLE public.pdf_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdf_downloads_own" ON public.pdf_downloads FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pdf_downloads_admin_read" ON public.pdf_downloads FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Feedback
CREATE TYPE public.feedback_status AS ENUM ('open', 'resolved');
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status public.feedback_status NOT NULL DEFAULT 'open',
  admin_reply text,
  replied_by uuid,
  replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_feedback_user_time ON public.feedback (user_id, created_at DESC);
CREATE INDEX idx_feedback_status ON public.feedback (status, created_at DESC);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback_select_own" ON public.feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "feedback_insert_own" ON public.feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "feedback_admin_all" ON public.feedback FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER feedback_updated_at BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Avatars bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookmarks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pdf_views;