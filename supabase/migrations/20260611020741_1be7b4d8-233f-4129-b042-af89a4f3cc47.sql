
CREATE TABLE IF NOT EXISTS public.report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  template_name TEXT NOT NULL,
  template_description TEXT,
  report_module TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'Standard',
  report_category TEXT NOT NULL DEFAULT 'General',
  selected_columns JSONB,
  filters JSONB,
  grouping JSONB,
  sorting JSONB,
  chart_config JSONB,
  layout_config JSONB,
  is_system_template BOOLEAN NOT NULL DEFAULT false,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  is_client_visible BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'Active',
  created_by UUID,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_templates TO authenticated;
GRANT ALL ON public.report_templates TO service_role;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rt_company_access" ON public.report_templates FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE TRIGGER trg_rt_updated BEFORE UPDATE ON public.report_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  project_id UUID,
  report_template_id UUID REFERENCES public.report_templates(id) ON DELETE SET NULL,
  report_name TEXT NOT NULL,
  report_description TEXT,
  report_module TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'Standard',
  report_category TEXT NOT NULL DEFAULT 'General',
  date_from DATE,
  date_to DATE,
  report_filters JSONB,
  report_data JSONB,
  report_summary JSONB,
  chart_data JSONB,
  generated_by UUID,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  shared_with JSONB,
  is_client_visible BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'Generated',
  created_by UUID,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_reports TO authenticated;
GRANT ALL ON public.saved_reports TO service_role;
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sr_company_access" ON public.saved_reports FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE TRIGGER trg_sr_updated BEFORE UPDATE ON public.saved_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.report_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  project_id UUID,
  saved_report_id UUID REFERENCES public.saved_reports(id) ON DELETE SET NULL,
  report_template_id UUID REFERENCES public.report_templates(id) ON DELETE SET NULL,
  export_type TEXT NOT NULL DEFAULT 'CSV',
  export_status TEXT NOT NULL DEFAULT 'Completed',
  file_name TEXT,
  file_url TEXT,
  exported_by UUID,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_exports TO authenticated;
GRANT ALL ON public.report_exports TO service_role;
ALTER TABLE public.report_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "re_company_access" ON public.report_exports FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

CREATE TABLE IF NOT EXISTS public.report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  project_id UUID,
  report_template_id UUID REFERENCES public.report_templates(id) ON DELETE CASCADE,
  schedule_name TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'Weekly',
  recipients JSONB,
  next_run_date DATE,
  last_run_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Active',
  created_by UUID,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_schedules TO authenticated;
GRANT ALL ON public.report_schedules TO service_role;
ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rs_company_access" ON public.report_schedules FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE TRIGGER trg_rs_updated BEFORE UPDATE ON public.report_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_rt_company ON public.report_templates(company_id) WHERE NOT is_archived;
CREATE INDEX IF NOT EXISTS idx_sr_company ON public.saved_reports(company_id) WHERE NOT is_archived;
CREATE INDEX IF NOT EXISTS idx_sr_project ON public.saved_reports(project_id) WHERE NOT is_archived;
CREATE INDEX IF NOT EXISTS idx_re_company ON public.report_exports(company_id);
CREATE INDEX IF NOT EXISTS idx_rs_company ON public.report_schedules(company_id) WHERE NOT is_archived;
