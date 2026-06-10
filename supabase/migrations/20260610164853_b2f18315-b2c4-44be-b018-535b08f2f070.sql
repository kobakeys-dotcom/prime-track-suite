
-- ===== manpower_plans =====
CREATE TABLE IF NOT EXISTS public.manpower_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  plan_name text DEFAULT 'Main Manpower Plan',
  plan_date date NOT NULL DEFAULT CURRENT_DATE,
  week_start date,
  week_end date,
  month text,
  trade text,
  manpower_category text DEFAULT 'General',
  planned_count integer DEFAULT 0,
  planned_hours numeric DEFAULT 0,
  planned_overtime_hours numeric DEFAULT 0,
  planned_cost numeric DEFAULT 0,
  remarks text,
  status text DEFAULT 'Active',
  created_by uuid,
  is_archived boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manpower_plans TO authenticated;
GRANT ALL ON public.manpower_plans TO service_role;
ALTER TABLE public.manpower_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage manpower_plans" ON public.manpower_plans
  FOR ALL USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE TRIGGER trg_manpower_plans_updated BEFORE UPDATE ON public.manpower_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ===== manpower_records =====
CREATE TABLE IF NOT EXISTS public.manpower_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  record_number text,
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  shift text DEFAULT 'Day',
  work_area text,
  location text,
  wbs_id uuid,
  task_id uuid,
  milestone_id uuid,
  boq_item_id uuid,
  cost_code_id uuid,
  daily_report_id uuid,
  subcontractor_id uuid,
  manpower_source text DEFAULT 'Company',
  trade text NOT NULL DEFAULT 'General Labour',
  manpower_category text DEFAULT 'Skilled',
  planned_count integer DEFAULT 0,
  actual_count integer DEFAULT 0,
  present_count integer DEFAULT 0,
  absent_count integer DEFAULT 0,
  idle_count integer DEFAULT 0,
  regular_hours numeric DEFAULT 0,
  overtime_hours numeric DEFAULT 0,
  idle_hours numeric DEFAULT 0,
  total_hours numeric DEFAULT 0,
  productivity_quantity numeric DEFAULT 0,
  productivity_unit text,
  productivity_rate numeric DEFAULT 0,
  hourly_rate numeric DEFAULT 0,
  overtime_rate numeric DEFAULT 0,
  regular_cost numeric DEFAULT 0,
  overtime_cost numeric DEFAULT 0,
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manpower_records TO authenticated;
GRANT ALL ON public.manpower_records TO service_role;
ALTER TABLE public.manpower_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage manpower_records" ON public.manpower_records
  FOR ALL USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE INDEX IF NOT EXISTS idx_manpower_records_project ON public.manpower_records(project_id, record_date);
CREATE TRIGGER trg_manpower_records_updated BEFORE UPDATE ON public.manpower_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ===== manpower_workers =====
CREATE TABLE IF NOT EXISTS public.manpower_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  employee_id uuid,
  worker_code text,
  worker_name text NOT NULL,
  worker_type text DEFAULT 'Company Worker',
  trade text,
  skill_level text,
  designation text,
  subcontractor_id uuid,
  phone text,
  id_number text,
  joining_date date,
  status text DEFAULT 'Active',
  hourly_rate numeric DEFAULT 0,
  overtime_rate numeric DEFAULT 0,
  created_by uuid,
  is_archived boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manpower_workers TO authenticated;
GRANT ALL ON public.manpower_workers TO service_role;
ALTER TABLE public.manpower_workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage manpower_workers" ON public.manpower_workers
  FOR ALL USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE TRIGGER trg_manpower_workers_updated BEFORE UPDATE ON public.manpower_workers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ===== manpower_attendance =====
CREATE TABLE IF NOT EXISTS public.manpower_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  manpower_record_id uuid REFERENCES public.manpower_records(id) ON DELETE CASCADE,
  worker_id uuid REFERENCES public.manpower_workers(id) ON DELETE SET NULL,
  employee_id uuid,
  attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  shift text DEFAULT 'Day',
  trade text,
  work_area text,
  check_in_time time,
  check_out_time time,
  status text DEFAULT 'Present',
  regular_hours numeric DEFAULT 0,
  overtime_hours numeric DEFAULT 0,
  idle_hours numeric DEFAULT 0,
  total_hours numeric DEFAULT 0,
  remarks text,
  source text DEFAULT 'Manual',
  created_by uuid,
  is_archived boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manpower_attendance TO authenticated;
GRANT ALL ON public.manpower_attendance TO service_role;
ALTER TABLE public.manpower_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage manpower_attendance" ON public.manpower_attendance
  FOR ALL USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE TRIGGER trg_manpower_attendance_updated BEFORE UPDATE ON public.manpower_attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ===== manpower_productivity =====
CREATE TABLE IF NOT EXISTS public.manpower_productivity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  manpower_record_id uuid REFERENCES public.manpower_records(id) ON DELETE CASCADE,
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  work_activity text NOT NULL,
  trade text,
  output_quantity numeric DEFAULT 0,
  output_unit text,
  labour_hours numeric DEFAULT 0,
  productivity_rate numeric DEFAULT 0,
  remarks text,
  created_by uuid,
  is_archived boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manpower_productivity TO authenticated;
GRANT ALL ON public.manpower_productivity TO service_role;
ALTER TABLE public.manpower_productivity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage manpower_productivity" ON public.manpower_productivity
  FOR ALL USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE TRIGGER trg_manpower_productivity_updated BEFORE UPDATE ON public.manpower_productivity
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ===== manpower_attachments =====
CREATE TABLE IF NOT EXISTS public.manpower_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  project_id uuid,
  manpower_record_id uuid REFERENCES public.manpower_records(id) ON DELETE CASCADE,
  uploaded_by uuid,
  file_name text,
  file_url text,
  file_type text,
  description text,
  attachment_type text DEFAULT 'Manpower Document',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manpower_attachments TO authenticated;
GRANT ALL ON public.manpower_attachments TO service_role;
ALTER TABLE public.manpower_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage manpower_attachments" ON public.manpower_attachments
  FOR ALL USING (project_id IS NULL OR public.project_in_company(project_id))
  WITH CHECK (project_id IS NULL OR public.project_in_company(project_id));

-- ===== manpower_comments =====
CREATE TABLE IF NOT EXISTS public.manpower_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  project_id uuid,
  manpower_record_id uuid REFERENCES public.manpower_records(id) ON DELETE CASCADE,
  user_id uuid,
  comment text NOT NULL,
  visibility text DEFAULT 'internal',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manpower_comments TO authenticated;
GRANT ALL ON public.manpower_comments TO service_role;
ALTER TABLE public.manpower_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage manpower_comments" ON public.manpower_comments
  FOR ALL USING (project_id IS NULL OR public.project_in_company(project_id))
  WITH CHECK (project_id IS NULL OR public.project_in_company(project_id));

-- ===== manpower_status_history =====
CREATE TABLE IF NOT EXISTS public.manpower_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  project_id uuid,
  manpower_record_id uuid REFERENCES public.manpower_records(id) ON DELETE CASCADE,
  old_status text,
  new_status text,
  changed_by uuid,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manpower_status_history TO authenticated;
GRANT ALL ON public.manpower_status_history TO service_role;
ALTER TABLE public.manpower_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage manpower_status_history" ON public.manpower_status_history
  FOR ALL USING (project_id IS NULL OR public.project_in_company(project_id))
  WITH CHECK (project_id IS NULL OR public.project_in_company(project_id));
