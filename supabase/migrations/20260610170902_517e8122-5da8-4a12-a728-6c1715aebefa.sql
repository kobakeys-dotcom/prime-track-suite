
-- =========== Extend timesheets ===========
ALTER TABLE public.timesheets
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN hours DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS timesheet_number text,
  ADD COLUMN IF NOT EXISTS timesheet_title text,
  ADD COLUMN IF NOT EXISTS timesheet_type text NOT NULL DEFAULT 'Daily',
  ADD COLUMN IF NOT EXISTS timesheet_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS week_start date,
  ADD COLUMN IF NOT EXISTS week_end date,
  ADD COLUMN IF NOT EXISTS month text,
  ADD COLUMN IF NOT EXISTS shift text NOT NULL DEFAULT 'Day',
  ADD COLUMN IF NOT EXISTS work_area text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS daily_report_id uuid REFERENCES public.daily_reports(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS manpower_record_id uuid REFERENCES public.manpower_records(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prepared_by uuid,
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Draft',
  ADD COLUMN IF NOT EXISTS total_workers integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_regular_hours numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_overtime_hours numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_night_hours numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_weekend_hours numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_holiday_hours numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_idle_hours numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_leave_hours numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_hours numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'MVR',
  ADD COLUMN IF NOT EXISTS payroll_exported boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payroll_exported_at timestamptz,
  ADD COLUMN IF NOT EXISTS payroll_exported_by uuid,
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS revision_notes text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- Backfill company_id from project
UPDATE public.timesheets t SET company_id = p.company_id
FROM public.projects p WHERE p.id = t.project_id AND t.company_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_timesheets_project ON public.timesheets(project_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_company ON public.timesheets(company_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_date ON public.timesheets(timesheet_date);

-- =========== timesheet_entries ===========
CREATE TABLE IF NOT EXISTS public.timesheet_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  timesheet_id uuid NOT NULL REFERENCES public.timesheets(id) ON DELETE CASCADE,
  employee_id uuid,
  worker_id uuid REFERENCES public.manpower_workers(id) ON DELETE SET NULL,
  subcontractor_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  worker_code text,
  worker_name text NOT NULL,
  worker_type text NOT NULL DEFAULT 'Company Worker',
  trade text,
  designation text,
  skill_level text,
  wbs_id uuid REFERENCES public.wbs_items(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  milestone_id uuid REFERENCES public.milestones(id) ON DELETE SET NULL,
  boq_item_id uuid REFERENCES public.boq_items(id) ON DELETE SET NULL,
  cost_code_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  work_activity text,
  work_area text,
  location text,
  attendance_status text NOT NULL DEFAULT 'Present',
  check_in_time time,
  check_out_time time,
  break_hours numeric NOT NULL DEFAULT 0,
  regular_hours numeric NOT NULL DEFAULT 0,
  overtime_hours numeric NOT NULL DEFAULT 0,
  night_hours numeric NOT NULL DEFAULT 0,
  weekend_hours numeric NOT NULL DEFAULT 0,
  holiday_hours numeric NOT NULL DEFAULT 0,
  idle_hours numeric NOT NULL DEFAULT 0,
  leave_hours numeric NOT NULL DEFAULT 0,
  total_hours numeric NOT NULL DEFAULT 0,
  hourly_rate numeric NOT NULL DEFAULT 0,
  overtime_rate numeric NOT NULL DEFAULT 0,
  cost_amount numeric NOT NULL DEFAULT 0,
  productivity_quantity numeric NOT NULL DEFAULT 0,
  productivity_unit text,
  remarks text,
  source text NOT NULL DEFAULT 'Manual',
  created_by uuid,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timesheet_entries TO authenticated;
GRANT ALL ON public.timesheet_entries TO service_role;
ALTER TABLE public.timesheet_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage timesheet entries" ON public.timesheet_entries
  FOR ALL USING (project_in_company(project_id)) WITH CHECK (project_in_company(project_id));
CREATE INDEX IF NOT EXISTS idx_te_timesheet ON public.timesheet_entries(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_te_project ON public.timesheet_entries(project_id);
CREATE TRIGGER trg_te_updated BEFORE UPDATE ON public.timesheet_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =========== timesheet_attachments ===========
CREATE TABLE IF NOT EXISTS public.timesheet_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  timesheet_id uuid NOT NULL REFERENCES public.timesheets(id) ON DELETE CASCADE,
  uploaded_by uuid,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  description text,
  attachment_type text NOT NULL DEFAULT 'Timesheet Document',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timesheet_attachments TO authenticated;
GRANT ALL ON public.timesheet_attachments TO service_role;
ALTER TABLE public.timesheet_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage timesheet attachments" ON public.timesheet_attachments
  FOR ALL USING (project_in_company(project_id)) WITH CHECK (project_in_company(project_id));

-- =========== timesheet_comments ===========
CREATE TABLE IF NOT EXISTS public.timesheet_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  timesheet_id uuid NOT NULL REFERENCES public.timesheets(id) ON DELETE CASCADE,
  user_id uuid,
  comment text NOT NULL,
  visibility text NOT NULL DEFAULT 'internal',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timesheet_comments TO authenticated;
GRANT ALL ON public.timesheet_comments TO service_role;
ALTER TABLE public.timesheet_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage timesheet comments" ON public.timesheet_comments
  FOR ALL USING (project_in_company(project_id)) WITH CHECK (project_in_company(project_id));

-- =========== timesheet_status_history ===========
CREATE TABLE IF NOT EXISTS public.timesheet_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  timesheet_id uuid NOT NULL REFERENCES public.timesheets(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timesheet_status_history TO authenticated;
GRANT ALL ON public.timesheet_status_history TO service_role;
ALTER TABLE public.timesheet_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage timesheet status history" ON public.timesheet_status_history
  FOR ALL USING (project_in_company(project_id)) WITH CHECK (project_in_company(project_id));

-- =========== timesheet_payroll_exports ===========
CREATE TABLE IF NOT EXISTS public.timesheet_payroll_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  export_number text,
  export_period_start date NOT NULL,
  export_period_end date NOT NULL,
  total_timesheets integer NOT NULL DEFAULT 0,
  total_workers integer NOT NULL DEFAULT 0,
  total_regular_hours numeric NOT NULL DEFAULT 0,
  total_overtime_hours numeric NOT NULL DEFAULT 0,
  total_hours numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  export_status text NOT NULL DEFAULT 'Generated',
  exported_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timesheet_payroll_exports TO authenticated;
GRANT ALL ON public.timesheet_payroll_exports TO service_role;
ALTER TABLE public.timesheet_payroll_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage timesheet payroll exports" ON public.timesheet_payroll_exports
  FOR ALL USING (
    company_id = current_company_id()
    AND (project_id IS NULL OR project_in_company(project_id))
  )
  WITH CHECK (
    company_id = current_company_id()
    AND (project_id IS NULL OR project_in_company(project_id))
  );
