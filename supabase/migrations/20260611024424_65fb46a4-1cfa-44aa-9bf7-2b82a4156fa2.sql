
-- company_settings
CREATE TABLE public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  legal_name TEXT, registration_number TEXT, tax_number TEXT,
  address TEXT, country TEXT, city TEXT, phone TEXT, email TEXT, website TEXT,
  logo_url TEXT, logo_storage_path TEXT,
  default_currency TEXT NOT NULL DEFAULT 'MVR',
  default_timezone TEXT NOT NULL DEFAULT 'Indian/Maldives',
  date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  time_format TEXT NOT NULL DEFAULT '24h',
  number_format TEXT NOT NULL DEFAULT '1,234.56',
  financial_year_start_month INTEGER NOT NULL DEFAULT 1 CHECK (financial_year_start_month BETWEEN 1 AND 12),
  working_days TEXT[],
  working_hours_start TIME, working_hours_end TIME,
  status TEXT NOT NULL DEFAULT 'Active',
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_settings TO authenticated;
GRANT ALL ON public.company_settings TO service_role;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own company_settings" ON public.company_settings FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY "admin manage company_settings" ON public.company_settings FOR ALL TO authenticated
  USING (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'))
  WITH CHECK (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'));
CREATE TRIGGER company_settings_uat BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- system_settings
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB,
  setting_type TEXT DEFAULT 'General',
  module_name TEXT,
  description TEXT,
  is_system_setting BOOLEAN NOT NULL DEFAULT false,
  is_sensitive BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, setting_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view system_settings" ON public.system_settings FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY "admin manage system_settings" ON public.system_settings FOR ALL TO authenticated
  USING (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'))
  WITH CHECK (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'));
CREATE TRIGGER system_settings_uat BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- module_settings
CREATE TABLE public.module_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  module_label TEXT,
  module_order INTEGER NOT NULL DEFAULT 0,
  settings JSONB,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, module_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_settings TO authenticated;
GRANT ALL ON public.module_settings TO service_role;
ALTER TABLE public.module_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view module_settings" ON public.module_settings FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY "admin manage module_settings" ON public.module_settings FOR ALL TO authenticated
  USING (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'))
  WITH CHECK (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'));
CREATE TRIGGER module_settings_uat BEFORE UPDATE ON public.module_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- numbering_settings
CREATE TABLE public.numbering_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  format_pattern TEXT NOT NULL,
  next_sequence INTEGER NOT NULL DEFAULT 1 CHECK (next_sequence >= 0),
  sequence_padding INTEGER NOT NULL DEFAULT 3 CHECK (sequence_padding BETWEEN 1 AND 10),
  reset_frequency TEXT NOT NULL DEFAULT 'Never',
  include_project_code BOOLEAN NOT NULL DEFAULT true,
  include_year BOOLEAN NOT NULL DEFAULT true,
  include_month BOOLEAN NOT NULL DEFAULT false,
  separator TEXT NOT NULL DEFAULT '-',
  sample_output TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, module_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.numbering_settings TO authenticated;
GRANT ALL ON public.numbering_settings TO service_role;
ALTER TABLE public.numbering_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view numbering_settings" ON public.numbering_settings FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY "admin manage numbering_settings" ON public.numbering_settings FOR ALL TO authenticated
  USING (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'))
  WITH CHECK (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'));
CREATE TRIGGER numbering_settings_uat BEFORE UPDATE ON public.numbering_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- approval_settings
CREATE TABLE public.approval_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  approval_required BOOLEAN NOT NULL DEFAULT false,
  approval_mode TEXT NOT NULL DEFAULT 'Single',
  default_approver_role TEXT,
  default_approver_user_id UUID,
  escalation_enabled BOOLEAN NOT NULL DEFAULT false,
  escalation_days INTEGER NOT NULL DEFAULT 3 CHECK (escalation_days >= 0),
  settings JSONB,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, module_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_settings TO authenticated;
GRANT ALL ON public.approval_settings TO service_role;
ALTER TABLE public.approval_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view approval_settings" ON public.approval_settings FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY "admin manage approval_settings" ON public.approval_settings FOR ALL TO authenticated
  USING (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'))
  WITH CHECK (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'));
CREATE TRIGGER approval_settings_uat BEFORE UPDATE ON public.approval_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- integration_settings
CREATE TABLE public.integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_name TEXT NOT NULL,
  integration_type TEXT NOT NULL DEFAULT 'General',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'Not Configured',
  settings JSONB,
  masked_config JSONB,
  last_tested_at TIMESTAMPTZ,
  last_test_status TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, integration_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_settings TO authenticated;
GRANT ALL ON public.integration_settings TO service_role;
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view integration_settings" ON public.integration_settings FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY "admin manage integration_settings" ON public.integration_settings FOR ALL TO authenticated
  USING (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'))
  WITH CHECK (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'));
CREATE TRIGGER integration_settings_uat BEFORE UPDATE ON public.integration_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- client_portal_settings
CREATE TABLE public.client_portal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  portal_enabled BOOLEAN NOT NULL DEFAULT false,
  default_client_visibility BOOLEAN NOT NULL DEFAULT false,
  allow_client_comments BOOLEAN NOT NULL DEFAULT false,
  allow_client_downloads BOOLEAN NOT NULL DEFAULT true,
  show_project_progress BOOLEAN NOT NULL DEFAULT true,
  show_documents BOOLEAN NOT NULL DEFAULT true,
  show_drawings BOOLEAN NOT NULL DEFAULT true,
  show_reports BOOLEAN NOT NULL DEFAULT true,
  show_rfis BOOLEAN NOT NULL DEFAULT false,
  show_submittals BOOLEAN NOT NULL DEFAULT false,
  show_meetings BOOLEAN NOT NULL DEFAULT false,
  hide_internal_cost BOOLEAN NOT NULL DEFAULT true,
  hide_supplier_pricing BOOLEAN NOT NULL DEFAULT true,
  hide_payroll_data BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_portal_settings TO authenticated;
GRANT ALL ON public.client_portal_settings TO service_role;
ALTER TABLE public.client_portal_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view client_portal_settings" ON public.client_portal_settings FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY "admin manage client_portal_settings" ON public.client_portal_settings FOR ALL TO authenticated
  USING (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'))
  WITH CHECK (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'));
CREATE TRIGGER client_portal_settings_uat BEFORE UPDATE ON public.client_portal_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- settings_audit_logs
CREATE TABLE public.settings_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  changed_by UUID,
  setting_area TEXT NOT NULL,
  setting_key TEXT,
  old_value JSONB,
  new_value JSONB,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.settings_audit_logs TO authenticated;
GRANT ALL ON public.settings_audit_logs TO service_role;
ALTER TABLE public.settings_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin view settings_audit_logs" ON public.settings_audit_logs FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'));
CREATE POLICY "admin insert settings_audit_logs" ON public.settings_audit_logs FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'));
