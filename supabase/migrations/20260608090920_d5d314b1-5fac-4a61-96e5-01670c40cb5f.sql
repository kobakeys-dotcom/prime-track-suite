
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM (
  'super_admin','company_admin','project_director','project_manager',
  'site_engineer','planning_engineer','quantity_surveyor','finance_manager',
  'procurement_officer','safety_officer','quality_inspector',
  'client_representative','consultant','subcontractor','viewer'
);

CREATE TYPE public.project_status AS ENUM ('planning','active','on_hold','completed','cancelled');
CREATE TYPE public.task_status AS ENUM ('todo','in_progress','blocked','done','cancelled');
CREATE TYPE public.task_priority AS ENUM ('low','medium','high','critical');
CREATE TYPE public.approval_status AS ENUM ('draft','submitted','under_review','approved','rejected','revise_resubmit','closed');
CREATE TYPE public.report_status AS ENUM ('draft','submitted','approved');

-- ============ COMPANIES ============
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  industry TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  job_title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, company_id)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ HELPER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============ INVITATIONS ============
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'viewer',
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24),'hex'),
  invited_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;
GRANT ALL ON public.invitations TO service_role;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- ============ PROJECTS ============
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT,
  name TEXT NOT NULL,
  description TEXT,
  client TEXT,
  location TEXT,
  status public.project_status NOT NULL DEFAULT 'planning',
  start_date DATE,
  end_date DATE,
  contract_value NUMERIC(14,2),
  progress NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- ============ TASKS / MILESTONES ============
CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.milestones TO authenticated;
GRANT ALL ON public.milestones TO service_role;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES auth.users(id),
  status public.task_status NOT NULL DEFAULT 'todo',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  progress NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- ============ DAILY REPORTS ============
CREATE TABLE public.daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  weather TEXT,
  temperature_c NUMERIC(4,1),
  manpower JSONB NOT NULL DEFAULT '[]'::jsonb,
  equipment JSONB NOT NULL DEFAULT '[]'::jsonb,
  materials_used JSONB NOT NULL DEFAULT '[]'::jsonb,
  work_completed TEXT,
  issues TEXT,
  next_day_plan TEXT,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  status public.report_status NOT NULL DEFAULT 'draft',
  author_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_reports TO authenticated;
GRANT ALL ON public.daily_reports TO service_role;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

-- ============ BOQ ============
CREATE TABLE public.boq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  item_code TEXT,
  description TEXT NOT NULL,
  unit TEXT,
  quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
  unit_rate NUMERIC(14,2) NOT NULL DEFAULT 0,
  completed_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boq_items TO authenticated;
GRANT ALL ON public.boq_items TO service_role;
ALTER TABLE public.boq_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.progress_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boq_item_id UUID NOT NULL REFERENCES public.boq_items(id) ON DELETE CASCADE,
  qty NUMERIC(14,3) NOT NULL,
  note TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_updates TO authenticated;
GRANT ALL ON public.progress_updates TO service_role;
ALTER TABLE public.progress_updates ENABLE ROW LEVEL SECURITY;

-- ============ RFIs / SUBMITTALS / DRAWINGS / DOCS / APPROVALS ============
CREATE TABLE public.rfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  number TEXT,
  subject TEXT NOT NULL,
  question TEXT,
  answer TEXT,
  status public.approval_status NOT NULL DEFAULT 'draft',
  due_date DATE,
  raised_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfis TO authenticated;
GRANT ALL ON public.rfis TO service_role;
ALTER TABLE public.rfis ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.submittals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  number TEXT,
  title TEXT NOT NULL,
  spec_section TEXT,
  status public.approval_status NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  due_date DATE,
  submitted_by UUID REFERENCES auth.users(id),
  reviewer_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submittals TO authenticated;
GRANT ALL ON public.submittals TO service_role;
ALTER TABLE public.submittals ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  title TEXT,
  discipline TEXT,
  revision TEXT,
  file_url TEXT,
  issued_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drawings TO authenticated;
GRANT ALL ON public.drawings TO service_role;
ALTER TABLE public.drawings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  file_url TEXT,
  file_size BIGINT,
  expires_at DATE,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  title TEXT NOT NULL,
  status public.approval_status NOT NULL DEFAULT 'submitted',
  requested_by UUID REFERENCES auth.users(id),
  approver_id UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approvals TO authenticated;
GRANT ALL ON public.approvals TO service_role;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

-- ============ NOTIFICATIONS / COMMENTS / AUDIT ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  severity TEXT NOT NULL DEFAULT 'info',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============ updated_at triggers ============
CREATE TRIGGER trg_companies_u BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_profiles_u BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_projects_u BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_tasks_u BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_dr_u BEFORE UPDATE ON public.daily_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_boq_u BEFORE UPDATE ON public.boq_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_rfis_u BEFORE UPDATE ON public.rfis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_subs_u BEFORE UPDATE ON public.submittals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_appr_u BEFORE UPDATE ON public.approvals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============ NEW USER HANDLER (auto profile + invitation acceptance) ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv RECORD;
  v_company_id UUID;
  v_company_name TEXT;
  v_full_name TEXT;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);

  -- Try invitation token
  IF NEW.raw_user_meta_data ? 'invitation_token' THEN
    SELECT * INTO inv FROM public.invitations
      WHERE token = NEW.raw_user_meta_data->>'invitation_token'
        AND accepted_at IS NULL
        AND expires_at > now()
      LIMIT 1;
    IF FOUND THEN
      v_company_id := inv.company_id;
      INSERT INTO public.user_roles (user_id, company_id, role) VALUES (NEW.id, inv.company_id, inv.role);
      UPDATE public.invitations SET accepted_at = now() WHERE id = inv.id;
    END IF;
  END IF;

  -- Otherwise create a new company (first signup)
  IF v_company_id IS NULL THEN
    v_company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', v_full_name || '''s Company');
    INSERT INTO public.companies (name, slug)
      VALUES (v_company_name, lower(regexp_replace(v_company_name,'[^a-zA-Z0-9]+','-','g')) || '-' || substr(NEW.id::text,1,8))
      RETURNING id INTO v_company_id;
    INSERT INTO public.user_roles (user_id, company_id, role) VALUES (NEW.id, v_company_id, 'company_admin');
  END IF;

  INSERT INTO public.profiles (id, company_id, full_name, email)
    VALUES (NEW.id, v_company_id, v_full_name, NEW.email);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS POLICIES ============
-- companies
CREATE POLICY "members read own company" ON public.companies FOR SELECT TO authenticated
  USING (id = public.current_company_id());
CREATE POLICY "admins update company" ON public.companies FOR UPDATE TO authenticated
  USING (id = public.current_company_id() AND public.has_role(auth.uid(),'company_admin'));

-- profiles
CREATE POLICY "read profiles in company" ON public.profiles FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR id = auth.uid());
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- user_roles
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR company_id = public.current_company_id());

-- invitations
CREATE POLICY "admins manage invitations" ON public.invitations FOR ALL TO authenticated
  USING (company_id = public.current_company_id() AND public.has_role(auth.uid(),'company_admin'))
  WITH CHECK (company_id = public.current_company_id() AND public.has_role(auth.uid(),'company_admin'));

-- Generic company-scoped policy helper macro via repetition
CREATE POLICY "company read projects" ON public.projects FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "company write projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "company update projects" ON public.projects FOR UPDATE TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "company delete projects" ON public.projects FOR DELETE TO authenticated USING (company_id = public.current_company_id() AND public.has_role(auth.uid(),'company_admin'));

-- helper: project belongs to current company
CREATE OR REPLACE FUNCTION public.project_in_company(_project_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = _project_id AND company_id = public.current_company_id())
$$;

CREATE POLICY "pm all" ON public.project_members FOR ALL TO authenticated
  USING (public.project_in_company(project_id)) WITH CHECK (public.project_in_company(project_id));
CREATE POLICY "ms all" ON public.milestones FOR ALL TO authenticated
  USING (public.project_in_company(project_id)) WITH CHECK (public.project_in_company(project_id));
CREATE POLICY "tasks all" ON public.tasks FOR ALL TO authenticated
  USING (public.project_in_company(project_id)) WITH CHECK (public.project_in_company(project_id));
CREATE POLICY "dr all" ON public.daily_reports FOR ALL TO authenticated
  USING (public.project_in_company(project_id)) WITH CHECK (public.project_in_company(project_id));
CREATE POLICY "boq all" ON public.boq_items FOR ALL TO authenticated
  USING (public.project_in_company(project_id)) WITH CHECK (public.project_in_company(project_id));
CREATE POLICY "pu all" ON public.progress_updates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.boq_items b WHERE b.id = boq_item_id AND public.project_in_company(b.project_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.boq_items b WHERE b.id = boq_item_id AND public.project_in_company(b.project_id)));
CREATE POLICY "rfis all" ON public.rfis FOR ALL TO authenticated
  USING (public.project_in_company(project_id)) WITH CHECK (public.project_in_company(project_id));
CREATE POLICY "subs all" ON public.submittals FOR ALL TO authenticated
  USING (public.project_in_company(project_id)) WITH CHECK (public.project_in_company(project_id));
CREATE POLICY "drw all" ON public.drawings FOR ALL TO authenticated
  USING (public.project_in_company(project_id)) WITH CHECK (public.project_in_company(project_id));
CREATE POLICY "docs all" ON public.documents FOR ALL TO authenticated
  USING ((project_id IS NULL AND company_id = public.current_company_id()) OR public.project_in_company(project_id))
  WITH CHECK ((project_id IS NULL AND company_id = public.current_company_id()) OR public.project_in_company(project_id));
CREATE POLICY "appr all" ON public.approvals FOR ALL TO authenticated
  USING (public.project_in_company(project_id)) WITH CHECK (public.project_in_company(project_id));

CREATE POLICY "notif own" ON public.notifications FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "comments read company" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "comments insert auth" ON public.comments FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "audit read company" ON public.audit_logs FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "audit insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);
