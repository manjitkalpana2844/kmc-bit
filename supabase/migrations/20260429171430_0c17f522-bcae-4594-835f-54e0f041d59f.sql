
-- Ratings (1-5 stars per user/PDF)
CREATE TABLE public.pdf_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_id UUID NOT NULL,
  user_id UUID NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pdf_id, user_id)
);
ALTER TABLE public.pdf_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY pdf_ratings_select_all ON public.pdf_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY pdf_ratings_own_write ON public.pdf_ratings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER pdf_ratings_updated BEFORE UPDATE ON public.pdf_ratings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_pdf_ratings_pdf ON public.pdf_ratings(pdf_id);

-- Comments
CREATE TABLE public.pdf_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_id UUID NOT NULL,
  user_id UUID NOT NULL,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pdf_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY pdf_comments_select_all ON public.pdf_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY pdf_comments_insert_own ON public.pdf_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY pdf_comments_update_own ON public.pdf_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY pdf_comments_delete_own_or_admin ON public.pdf_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE TRIGGER pdf_comments_updated BEFORE UPDATE ON public.pdf_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_pdf_comments_pdf ON public.pdf_comments(pdf_id, created_at DESC);

-- Personal notes
CREATE TABLE public.pdf_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_id UUID NOT NULL,
  user_id UUID NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pdf_id, user_id)
);
ALTER TABLE public.pdf_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY pdf_notes_own ON public.pdf_notes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER pdf_notes_updated BEFORE UPDATE ON public.pdf_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Streaks
CREATE TABLE public.user_streaks (
  user_id UUID PRIMARY KEY,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  total_active_days INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_streaks_own ON public.user_streaks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_streaks_admin_read ON public.user_streaks FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Badges catalog
CREATE TABLE public.badges (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'award',
  threshold INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'general'
);
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY badges_select_all ON public.badges FOR SELECT TO authenticated USING (true);
CREATE POLICY badges_admin_write ON public.badges FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

INSERT INTO public.badges (code, name, description, icon, threshold, category) VALUES
  ('streak_3', '3-Day Streak', 'Logged in 3 days in a row', 'flame', 3, 'streak'),
  ('streak_7', 'Week Warrior', '7-day study streak', 'flame', 7, 'streak'),
  ('streak_30', 'Monthly Master', '30-day study streak', 'flame', 30, 'streak'),
  ('views_10', 'Curious Mind', 'Viewed 10 PDFs', 'eye', 10, 'views'),
  ('views_50', 'Bookworm', 'Viewed 50 PDFs', 'book-open', 50, 'views'),
  ('downloads_5', 'Collector', 'Downloaded 5 PDFs', 'download', 5, 'downloads'),
  ('first_rating', 'Reviewer', 'Rated your first PDF', 'star', 1, 'engagement'),
  ('first_comment', 'Contributor', 'Posted your first comment', 'message-circle', 1, 'engagement');

-- User badges
CREATE TABLE public.user_badges (
  user_id UUID NOT NULL,
  badge_code TEXT NOT NULL REFERENCES public.badges(code) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_code)
);
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_badges_own ON public.user_badges FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_badges_admin_read ON public.user_badges FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Realtime
ALTER TABLE public.pdf_ratings REPLICA IDENTITY FULL;
ALTER TABLE public.pdf_comments REPLICA IDENTITY FULL;
ALTER TABLE public.pdf_notes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pdf_ratings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pdf_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pdf_notes;
