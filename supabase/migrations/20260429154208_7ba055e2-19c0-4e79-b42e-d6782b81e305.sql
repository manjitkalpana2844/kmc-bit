DROP POLICY IF EXISTS pdf_files_select_paid ON public.pdf_files;

CREATE POLICY pdf_files_select_paid ON public.pdf_files
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR user_can_access_semester(auth.uid(), semester)
);