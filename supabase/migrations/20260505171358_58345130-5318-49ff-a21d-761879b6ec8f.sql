INSERT INTO storage.buckets (id, name, public) VALUES ('books', 'books', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "books_bucket_authenticated_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'books');

CREATE POLICY "books_bucket_admin_write"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'books' AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'books' AND has_role(auth.uid(), 'admin'::app_role));