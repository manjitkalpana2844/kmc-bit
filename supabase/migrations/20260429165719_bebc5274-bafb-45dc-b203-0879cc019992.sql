ALTER TABLE public.pdf_files REPLICA IDENTITY FULL;
ALTER TABLE public.semester_status REPLICA IDENTITY FULL;
ALTER TABLE public.app_settings REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.pdf_files;
ALTER PUBLICATION supabase_realtime ADD TABLE public.semester_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;