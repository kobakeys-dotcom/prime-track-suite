
-- role_permissions overrides
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  permission_key text NOT NULL,
  is_allowed boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, role, permission_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rp read in company" ON public.role_permissions;
CREATE POLICY "rp read in company" ON public.role_permissions
  FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());

DROP POLICY IF EXISTS "rp admin manage" ON public.role_permissions;
CREATE POLICY "rp admin manage" ON public.role_permissions
  FOR ALL TO authenticated
  USING (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'))
  WITH CHECK (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'));

DROP TRIGGER IF EXISTS trg_rp_updated ON public.role_permissions;
CREATE TRIGGER trg_rp_updated BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- permission audit logs
CREATE TABLE IF NOT EXISTS public.permission_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_role text,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  action text NOT NULL,
  module_name text,
  permission_key text,
  old_value text,
  new_value text,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.permission_audit_logs TO authenticated;
GRANT ALL ON public.permission_audit_logs TO service_role;
ALTER TABLE public.permission_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pal read admin" ON public.permission_audit_logs;
CREATE POLICY "pal read admin" ON public.permission_audit_logs
  FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'company_admin'));

DROP POLICY IF EXISTS "pal insert in company" ON public.permission_audit_logs;
CREATE POLICY "pal insert in company" ON public.permission_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id());

-- Extend project_members
ALTER TABLE public.project_members
  ADD COLUMN IF NOT EXISTS access_level text NOT NULL DEFAULT 'Member',
  ADD COLUMN IF NOT EXISTS can_edit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_approve boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_export boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_view_cost boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_pm_updated ON public.project_members;
CREATE TRIGGER trg_pm_updated BEFORE UPDATE ON public.project_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Helper: returns true if any of the user's roles allow `permission_key`,
-- using only the override table. Defaults are evaluated client/server side
-- against the static MATRIX. This function only knows about overrides where
-- is_allowed=true.
CREATE OR REPLACE FUNCTION public.has_permission_override(_user_id uuid, _permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp
      ON rp.role = ur.role
     AND rp.company_id = ur.company_id
    WHERE ur.user_id = _user_id
      AND rp.permission_key = _permission_key
      AND rp.is_allowed = true
  );
$$;
REVOKE EXECUTE ON FUNCTION public.has_permission_override(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_permission_override(uuid, text) TO authenticated;
