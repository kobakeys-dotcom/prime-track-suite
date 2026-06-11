
-- 1) Restrict audit_log_exports SELECT to admins only
DROP POLICY IF EXISTS "audit exports read" ON public.audit_log_exports;
CREATE POLICY "audit exports read admins"
ON public.audit_log_exports FOR SELECT
TO authenticated
USING (
  company_id = public.current_company_id()
  AND (public.has_role(auth.uid(), 'company_admin'::app_role)
       OR public.has_role(auth.uid(), 'super_admin'::app_role))
);

-- 2) Convert every policy in public schema that targets PUBLIC role to AUTHENTICATED.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND 'public' = ANY(roles)
  LOOP
    EXECUTE format('ALTER POLICY %I ON %I.%I TO authenticated',
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;
