
-- Extend equipment master
ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS equipment_code text,
  ADD COLUMN IF NOT EXISTS equipment_name text,
  ADD COLUMN IF NOT EXISTS equipment_type text DEFAULT 'General Equipment',
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS make_brand text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS serial_number text,
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS asset_number text,
  ADD COLUMN IF NOT EXISTS ownership_type text DEFAULT 'Owned',
  ADD COLUMN IF NOT EXISTS supplier_id uuid,
  ADD COLUMN IF NOT EXISTS subcontractor_id uuid,
  ADD COLUMN IF NOT EXISTS current_location text,
  ADD COLUMN IF NOT EXISTS assigned_to_project_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_operator_id uuid,
  ADD COLUMN IF NOT EXISTS operator_name text,
  ADD COLUMN IF NOT EXISTS operator_phone text,
  ADD COLUMN IF NOT EXISTS purchase_date date,
  ADD COLUMN IF NOT EXISTS purchase_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rental_rate_hourly numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rental_rate_daily numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fuel_type text,
  ADD COLUMN IF NOT EXISTS fuel_capacity numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_meter_reading numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_status text DEFAULT 'Available',
  ADD COLUMN IF NOT EXISTS availability_status text DEFAULT 'Available',
  ADD COLUMN IF NOT EXISTS condition_status text DEFAULT 'Good',
  ADD COLUMN IF NOT EXISTS last_maintenance_date date,
  ADD COLUMN IF NOT EXISTS next_maintenance_date date,
  ADD COLUMN IF NOT EXISTS insurance_expiry_date date,
  ADD COLUMN IF NOT EXISTS registration_expiry_date date,
  ADD COLUMN IF NOT EXISTS inspection_expiry_date date,
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Make project_id nullable, backfill equipment_name from legacy name, backfill company_id
ALTER TABLE public.equipment ALTER COLUMN project_id DROP NOT NULL;
UPDATE public.equipment SET equipment_name = COALESCE(equipment_name, name) WHERE equipment_name IS NULL;
UPDATE public.equipment e SET company_id = p.company_id
  FROM public.projects p WHERE e.project_id = p.id AND e.company_id IS NULL;
ALTER TABLE public.equipment ALTER COLUMN equipment_name SET NOT NULL;

-- Replace RLS so company-level access works
DROP POLICY IF EXISTS "co members manage equipment" ON public.equipment;
CREATE POLICY "co manage equipment" ON public.equipment
  FOR ALL TO authenticated
  USING (company_id = public.current_company_id() OR (project_id IS NOT NULL AND public.project_in_company(project_id)))
  WITH CHECK (company_id = public.current_company_id() OR (project_id IS NOT NULL AND public.project_in_company(project_id)));

-- ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.equipment_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  wbs_id uuid, task_id uuid, milestone_id uuid,
  work_area text,
  assignment_start_date date NOT NULL,
  assignment_end_date date,
  assigned_operator_id uuid,
  operator_name text,
  status text DEFAULT 'Active',
  assigned_by uuid,
  released_by uuid,
  released_at timestamptz,
  remarks text,
  created_by uuid,
  is_archived boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_assignments TO authenticated;
GRANT ALL ON public.equipment_assignments TO service_role;
ALTER TABLE public.equipment_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co manage eq assignments" ON public.equipment_assignments FOR ALL TO authenticated
  USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
CREATE TRIGGER trg_eq_assignments_updated BEFORE UPDATE ON public.equipment_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- USAGE LOGS
CREATE TABLE IF NOT EXISTS public.equipment_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  assignment_id uuid,
  daily_report_id uuid,
  usage_date date NOT NULL,
  shift text DEFAULT 'Day',
  work_area text,
  wbs_id uuid, task_id uuid,
  operator_name text,
  start_meter_reading numeric DEFAULT 0,
  end_meter_reading numeric DEFAULT 0,
  working_hours numeric DEFAULT 0,
  idle_hours numeric DEFAULT 0,
  breakdown_hours numeric DEFAULT 0,
  total_hours numeric DEFAULT 0,
  fuel_consumed numeric DEFAULT 0,
  fuel_unit text DEFAULT 'Liter',
  productivity_quantity numeric DEFAULT 0,
  productivity_unit text,
  productivity_rate numeric DEFAULT 0,
  hourly_rate numeric DEFAULT 0,
  rental_cost numeric DEFAULT 0,
  fuel_cost numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  status text DEFAULT 'Draft',
  remarks text,
  approved_by uuid,
  approved_at timestamptz,
  created_by uuid,
  is_archived boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_usage_logs TO authenticated;
GRANT ALL ON public.equipment_usage_logs TO service_role;
ALTER TABLE public.equipment_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co manage eq usage" ON public.equipment_usage_logs FOR ALL TO authenticated
  USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
CREATE TRIGGER trg_eq_usage_updated BEFORE UPDATE ON public.equipment_usage_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- MAINTENANCE
CREATE TABLE IF NOT EXISTS public.equipment_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  project_id uuid,
  maintenance_number text,
  maintenance_type text DEFAULT 'Preventive',
  maintenance_title text NOT NULL,
  description text,
  scheduled_date date,
  completed_date date,
  meter_reading numeric,
  performed_by text,
  service_provider text,
  cost numeric DEFAULT 0,
  status text DEFAULT 'Scheduled',
  priority text DEFAULT 'Medium',
  findings text,
  action_taken text,
  next_maintenance_date date,
  created_by uuid,
  is_archived boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_maintenance TO authenticated;
GRANT ALL ON public.equipment_maintenance TO service_role;
ALTER TABLE public.equipment_maintenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co manage eq maint" ON public.equipment_maintenance FOR ALL TO authenticated
  USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
CREATE TRIGGER trg_eq_maint_updated BEFORE UPDATE ON public.equipment_maintenance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- BREAKDOWNS
CREATE TABLE IF NOT EXISTS public.equipment_breakdowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  project_id uuid,
  breakdown_number text,
  breakdown_date date NOT NULL,
  breakdown_time time,
  reported_by uuid,
  operator_name text,
  location text,
  problem_description text NOT NULL,
  severity text DEFAULT 'Medium',
  downtime_hours numeric DEFAULT 0,
  repair_action text,
  repair_cost numeric DEFAULT 0,
  repaired_by text,
  resolved_date date,
  resolved_time time,
  status text DEFAULT 'Open',
  remarks text,
  created_by uuid,
  is_archived boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_breakdowns TO authenticated;
GRANT ALL ON public.equipment_breakdowns TO service_role;
ALTER TABLE public.equipment_breakdowns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co manage eq break" ON public.equipment_breakdowns FOR ALL TO authenticated
  USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
CREATE TRIGGER trg_eq_break_updated BEFORE UPDATE ON public.equipment_breakdowns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- INSPECTIONS
CREATE TABLE IF NOT EXISTS public.equipment_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  project_id uuid,
  inspection_number text,
  inspection_date date NOT NULL,
  inspected_by uuid,
  inspection_type text DEFAULT 'Routine',
  condition_status text DEFAULT 'Good',
  result text DEFAULT 'Pass',
  findings text,
  corrective_action text,
  next_inspection_date date,
  status text DEFAULT 'Completed',
  created_by uuid,
  is_archived boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_inspections TO authenticated;
GRANT ALL ON public.equipment_inspections TO service_role;
ALTER TABLE public.equipment_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co manage eq insp" ON public.equipment_inspections FOR ALL TO authenticated
  USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
CREATE TRIGGER trg_eq_insp_updated BEFORE UPDATE ON public.equipment_inspections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- DOCUMENTS
CREATE TABLE IF NOT EXISTS public.equipment_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  uploaded_by uuid,
  document_name text NOT NULL,
  document_type text DEFAULT 'General',
  document_number text,
  issue_date date,
  expiry_date date,
  file_name text,
  file_url text,
  file_type text,
  status text DEFAULT 'Valid',
  remarks text,
  is_archived boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_documents TO authenticated;
GRANT ALL ON public.equipment_documents TO service_role;
ALTER TABLE public.equipment_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co manage eq docs" ON public.equipment_documents FOR ALL TO authenticated
  USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
CREATE TRIGGER trg_eq_docs_updated BEFORE UPDATE ON public.equipment_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ATTACHMENTS
CREATE TABLE IF NOT EXISTS public.equipment_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  equipment_id uuid REFERENCES public.equipment(id) ON DELETE CASCADE,
  project_id uuid,
  uploaded_by uuid,
  file_name text,
  file_url text,
  file_type text,
  description text,
  attachment_type text DEFAULT 'Equipment File',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_attachments TO authenticated;
GRANT ALL ON public.equipment_attachments TO service_role;
ALTER TABLE public.equipment_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co manage eq atts" ON public.equipment_attachments FOR ALL TO authenticated
  USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());

-- COMMENTS
CREATE TABLE IF NOT EXISTS public.equipment_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  equipment_id uuid REFERENCES public.equipment(id) ON DELETE CASCADE,
  project_id uuid,
  user_id uuid,
  comment text,
  visibility text DEFAULT 'internal',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_comments TO authenticated;
GRANT ALL ON public.equipment_comments TO service_role;
ALTER TABLE public.equipment_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co manage eq comments" ON public.equipment_comments FOR ALL TO authenticated
  USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());

-- STATUS HISTORY
CREATE TABLE IF NOT EXISTS public.equipment_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  equipment_id uuid REFERENCES public.equipment(id) ON DELETE CASCADE,
  project_id uuid,
  old_status text,
  new_status text,
  changed_by uuid,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_status_history TO authenticated;
GRANT ALL ON public.equipment_status_history TO service_role;
ALTER TABLE public.equipment_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co manage eq hist" ON public.equipment_status_history FOR ALL TO authenticated
  USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());

CREATE INDEX IF NOT EXISTS idx_equipment_company ON public.equipment(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_project ON public.equipment(project_id);
CREATE INDEX IF NOT EXISTS idx_eq_usage_equipment ON public.equipment_usage_logs(equipment_id);
CREATE INDEX IF NOT EXISTS idx_eq_usage_project ON public.equipment_usage_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_eq_assign_equipment ON public.equipment_assignments(equipment_id);
CREATE INDEX IF NOT EXISTS idx_eq_assign_project ON public.equipment_assignments(project_id);
