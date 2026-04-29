ALTER TABLE public.user_access REPLICA IDENTITY FULL;
ALTER TABLE public.payment_requests REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_access;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;