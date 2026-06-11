
-- Modules
CREATE TABLE IF NOT EXISTS public.functional_audit_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  module_name text NOT NULL,
  module_category text DEFAULT 'General',
  route_path text,
  sidebar_path text,
  primary_table text,
  related_tables text[],
  status text DEFAULT 'Not Checked',
  completion_percentage numeric DEFAULT 0,
  priority text DEFAULT 'Medium',
  owner_user_id uuid REFERENCES auth.users(id),
  target_completion_date date,
  last_checked_at timestamptz,
  last_checked_by uuid REFERENCES auth.users(id),
  notes text,
  is_core_module boolean DEFAULT false,
  is_client_visible_module boolean DEFAULT false,
  is_archived boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, module_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.functional_audit_modules TO authenticated;
GRANT ALL ON public.functional_audit_modules TO service_role;
ALTER TABLE public.functional_audit_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fa_modules read" ON public.functional_audit_modules FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'));
CREATE POLICY "fa_modules write" ON public.functional_audit_modules FOR ALL TO authenticated
  USING (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'))
  WITH CHECK (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'));
CREATE TRIGGER fa_modules_updated BEFORE UPDATE ON public.functional_audit_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Items
CREATE TABLE IF NOT EXISTS public.functional_audit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  audit_module_id uuid NOT NULL REFERENCES public.functional_audit_modules(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  audit_category text NOT NULL,
  checklist_item text NOT NULL,
  description text,
  expected_result text,
  actual_result text,
  status text DEFAULT 'Not Checked',
  severity text DEFAULT 'Medium',
  priority text DEFAULT 'Medium',
  assigned_to uuid REFERENCES auth.users(id),
  target_completion_date date,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  resolution_notes text,
  evidence_url text,
  is_automated boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.functional_audit_items TO authenticated;
GRANT ALL ON public.functional_audit_items TO service_role;
ALTER TABLE public.functional_audit_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fa_items read" ON public.functional_audit_items FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'));
CREATE POLICY "fa_items write" ON public.functional_audit_items FOR ALL TO authenticated
  USING (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'))
  WITH CHECK (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'));
CREATE INDEX IF NOT EXISTS idx_fa_items_module ON public.functional_audit_items(audit_module_id);
CREATE INDEX IF NOT EXISTS idx_fa_items_status ON public.functional_audit_items(status);
CREATE TRIGGER fa_items_updated BEFORE UPDATE ON public.functional_audit_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Runs
CREATE TABLE IF NOT EXISTS public.functional_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  audit_run_name text NOT NULL,
  audit_run_type text DEFAULT 'Manual',
  total_modules integer DEFAULT 0,
  completed_modules integer DEFAULT 0,
  failed_modules integer DEFAULT 0,
  total_items integer DEFAULT 0,
  passed_items integer DEFAULT 0,
  failed_items integer DEFAULT 0,
  warning_items integer DEFAULT 0,
  not_checked_items integer DEFAULT 0,
  overall_completion_percentage numeric DEFAULT 0,
  readiness_status text DEFAULT 'Not Ready',
  summary_notes text,
  started_by uuid REFERENCES auth.users(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text DEFAULT 'In Progress',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.functional_audit_runs TO authenticated;
GRANT ALL ON public.functional_audit_runs TO service_role;
ALTER TABLE public.functional_audit_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fa_runs read" ON public.functional_audit_runs FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'));
CREATE POLICY "fa_runs write" ON public.functional_audit_runs FOR ALL TO authenticated
  USING (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'))
  WITH CHECK (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'));
CREATE TRIGGER fa_runs_updated BEFORE UPDATE ON public.functional_audit_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Snapshots
CREATE TABLE IF NOT EXISTS public.functional_audit_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  audit_run_id uuid REFERENCES public.functional_audit_runs(id) ON DELETE SET NULL,
  snapshot_name text NOT NULL,
  snapshot_data jsonb NOT NULL,
  overall_completion_percentage numeric DEFAULT 0,
  readiness_status text DEFAULT 'Not Ready',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.functional_audit_snapshots TO authenticated;
GRANT ALL ON public.functional_audit_snapshots TO service_role;
ALTER TABLE public.functional_audit_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fa_snap read" ON public.functional_audit_snapshots FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'));
CREATE POLICY "fa_snap write" ON public.functional_audit_snapshots FOR ALL TO authenticated
  USING (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'))
  WITH CHECK (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'));
