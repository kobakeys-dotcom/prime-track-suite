
-- Extend audit_logs
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_email text,
  ADD COLUMN IF NOT EXISTS user_name text,
  ADD COLUMN IF NOT EXISTS action_type text DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS module_name text,
  ADD COLUMN IF NOT EXISTS record_id uuid,
  ADD COLUMN IF NOT EXISTS record_number text,
  ADD COLUMN IF NOT EXISTS record_title text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS old_values jsonb,
  ADD COLUMN IF NOT EXISTS new_values jsonb,
  ADD COLUMN IF NOT EXISTS changed_fields jsonb,
  ADD COLUMN IF NOT EXISTS severity text DEFAULT 'Info',
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'Web App',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Success',
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS is_sensitive boolean DEFAULT false;

-- Backfill module_name from entity_type if missing
UPDATE public.audit_logs SET module_name = entity_type WHERE module_name IS NULL AND entity_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created ON public.audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project ON public.audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs(module_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON public.audit_logs(entity_type, entity_id);

-- Append-only: explicitly forbid update/delete via RLS (no permissive policies for these ops means denied)
-- (Policies for INSERT and SELECT already exist.)

-- audit_log_exports
CREATE TABLE IF NOT EXISTS public.audit_log_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  exported_by uuid REFERENCES auth.users(id),
  export_name text,
  export_type text DEFAULT 'CSV',
  date_from date,
  date_to date,
  filters jsonb,
  total_records integer DEFAULT 0,
  file_name text,
  file_url text,
  status text DEFAULT 'Completed',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log_exports TO authenticated;
GRANT ALL ON public.audit_log_exports TO service_role;
ALTER TABLE public.audit_log_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit exports read" ON public.audit_log_exports FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY "audit exports insert" ON public.audit_log_exports FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() AND exported_by = auth.uid());

-- security_events
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL,
  event_description text,
  severity text DEFAULT 'Info',
  ip_address text,
  user_agent text,
  status text DEFAULT 'Success',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sec events read company admin" ON public.security_events FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'));
CREATE POLICY "sec events insert self" ON public.security_events FOR INSERT TO authenticated
  WITH CHECK ((company_id IS NULL OR company_id = public.current_company_id()) AND (user_id IS NULL OR user_id = auth.uid()));
