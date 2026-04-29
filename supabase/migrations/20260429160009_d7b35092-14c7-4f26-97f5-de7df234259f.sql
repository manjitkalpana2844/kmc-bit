
-- 1. Payment requests
CREATE TYPE public.payment_request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.payment_plan AS ENUM ('semester_pass', 'monthly_all_access');

CREATE TABLE public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan public.payment_plan NOT NULL,
  semester INTEGER,
  amount INTEGER NOT NULL,
  transaction_id TEXT,
  proof_path TEXT NOT NULL,
  note TEXT,
  status public.payment_request_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_requests_select_own" ON public.payment_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "payment_requests_insert_own" ON public.payment_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "payment_requests_admin_all" ON public.payment_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_payment_requests_updated
  BEFORE UPDATE ON public.payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.payment_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_requests;

-- 2. App settings (single row keyed by 'payment')
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings_select_all" ON public.app_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "app_settings_admin_write" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_settings (key, value) VALUES
  ('payment', '{"account_label":"JazzCash","account_number":"03XX-XXXXXXX","account_name":"Manjit Rana","instructions":"Send the exact amount and upload screenshot below. Access is granted after admin verification (usually within a few hours).","semester_pass_price":599,"monthly_price":199}'::jsonb);

-- 3. Auto-expiry for monthly subscriptions
CREATE OR REPLACE FUNCTION public.set_monthly_expiry()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.access_type = 'monthly_all_access' AND NEW.expires_at IS NULL THEN
    NEW.expires_at := now() + INTERVAL '1 month';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_access_monthly_expiry
  BEFORE INSERT ON public.user_access
  FOR EACH ROW EXECUTE FUNCTION public.set_monthly_expiry();

-- 4. Storage bucket for proofs (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false);

CREATE POLICY "payment_proofs_user_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "payment_proofs_user_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "payment_proofs_admin_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'));
