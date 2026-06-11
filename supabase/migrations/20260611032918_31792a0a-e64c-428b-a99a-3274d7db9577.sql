
-- Tighten RLS for security findings: restrict writes to elevated roles, restrict sensitive audit reads, harden security_events inserts, clear invitation tokens on consumption.

-- audit_logs: restrict SELECT to admins
DROP POLICY IF EXISTS "audit read company" ON public.audit_logs;
CREATE POLICY "audit read admins"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    company_id = current_company_id()
    AND (has_role(auth.uid(), 'company_admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  );

-- security_events: require non-null company_id on insert
DROP POLICY IF EXISTS "sec events insert self" ON public.security_events;
CREATE POLICY "sec events insert self"
  ON public.security_events FOR INSERT TO authenticated
  WITH CHECK (
    company_id = current_company_id()
    AND ((user_id IS NULL) OR (user_id = auth.uid()))
  );

-- invitations: clear token after consumption / revocation so admins cannot replay
CREATE OR REPLACE FUNCTION public.clear_invitation_token_on_consume()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('accepted','expired','revoked','cancelled')
  THEN
    NEW.token := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_invitation_token ON public.invitations;
CREATE TRIGGER trg_clear_invitation_token
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.clear_invitation_token_on_consume();

-- suppliers: split read (any company member) from write (procurement / finance / admin)
DROP POLICY IF EXISTS "co members manage suppliers" ON public.suppliers;
CREATE POLICY "suppliers read company"
  ON public.suppliers FOR SELECT TO authenticated
  USING (company_id = current_company_id());
CREATE POLICY "suppliers write privileged"
  ON public.suppliers FOR INSERT TO authenticated
  WITH CHECK (company_id = current_company_id() AND (
    has_role(auth.uid(),'company_admin'::app_role)
    OR has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'procurement_officer'::app_role)
    OR has_role(auth.uid(),'finance_manager'::app_role)
  ));
CREATE POLICY "suppliers update privileged"
  ON public.suppliers FOR UPDATE TO authenticated
  USING (company_id = current_company_id() AND (
    has_role(auth.uid(),'company_admin'::app_role)
    OR has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'procurement_officer'::app_role)
    OR has_role(auth.uid(),'finance_manager'::app_role)
  ))
  WITH CHECK (company_id = current_company_id());
CREATE POLICY "suppliers delete privileged"
  ON public.suppliers FOR DELETE TO authenticated
  USING (company_id = current_company_id() AND (
    has_role(auth.uid(),'company_admin'::app_role)
    OR has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'procurement_officer'::app_role)
  ));

-- supplier_contacts: same split
DROP POLICY IF EXISTS "co manage supplier_contacts" ON public.supplier_contacts;
CREATE POLICY "supplier_contacts read company"
  ON public.supplier_contacts FOR SELECT TO authenticated
  USING (company_id = current_company_id());
CREATE POLICY "supplier_contacts write privileged"
  ON public.supplier_contacts FOR INSERT TO authenticated
  WITH CHECK (company_id = current_company_id() AND (
    has_role(auth.uid(),'company_admin'::app_role)
    OR has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'procurement_officer'::app_role)
    OR has_role(auth.uid(),'finance_manager'::app_role)
  ));
CREATE POLICY "supplier_contacts update privileged"
  ON public.supplier_contacts FOR UPDATE TO authenticated
  USING (company_id = current_company_id() AND (
    has_role(auth.uid(),'company_admin'::app_role)
    OR has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'procurement_officer'::app_role)
    OR has_role(auth.uid(),'finance_manager'::app_role)
  ))
  WITH CHECK (company_id = current_company_id());
CREATE POLICY "supplier_contacts delete privileged"
  ON public.supplier_contacts FOR DELETE TO authenticated
  USING (company_id = current_company_id() AND (
    has_role(auth.uid(),'company_admin'::app_role)
    OR has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'procurement_officer'::app_role)
  ));

-- purchase_orders: split — keep broad read, restrict writes
DROP POLICY IF EXISTS "co members manage purchase_orders" ON public.purchase_orders;
CREATE POLICY "purchase_orders read project"
  ON public.purchase_orders FOR SELECT TO authenticated
  USING (project_in_company(project_id));
CREATE POLICY "purchase_orders write privileged"
  ON public.purchase_orders FOR INSERT TO authenticated
  WITH CHECK (project_in_company(project_id) AND (
    has_role(auth.uid(),'company_admin'::app_role)
    OR has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'project_director'::app_role)
    OR has_role(auth.uid(),'project_manager'::app_role)
    OR has_role(auth.uid(),'procurement_officer'::app_role)
    OR has_role(auth.uid(),'finance_manager'::app_role)
  ));
CREATE POLICY "purchase_orders update privileged"
  ON public.purchase_orders FOR UPDATE TO authenticated
  USING (project_in_company(project_id) AND (
    has_role(auth.uid(),'company_admin'::app_role)
    OR has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'project_director'::app_role)
    OR has_role(auth.uid(),'project_manager'::app_role)
    OR has_role(auth.uid(),'procurement_officer'::app_role)
    OR has_role(auth.uid(),'finance_manager'::app_role)
  ))
  WITH CHECK (project_in_company(project_id));
CREATE POLICY "purchase_orders delete privileged"
  ON public.purchase_orders FOR DELETE TO authenticated
  USING (project_in_company(project_id) AND (
    has_role(auth.uid(),'company_admin'::app_role)
    OR has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'project_director'::app_role)
    OR has_role(auth.uid(),'procurement_officer'::app_role)
  ));

-- manpower_records: split
DROP POLICY IF EXISTS "co members manage manpower_records" ON public.manpower_records;
CREATE POLICY "manpower_records read project"
  ON public.manpower_records FOR SELECT TO authenticated
  USING (project_in_company(project_id));
CREATE POLICY "manpower_records write privileged"
  ON public.manpower_records FOR INSERT TO authenticated
  WITH CHECK (project_in_company(project_id) AND (
    has_role(auth.uid(),'company_admin'::app_role)
    OR has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'project_director'::app_role)
    OR has_role(auth.uid(),'project_manager'::app_role)
    OR has_role(auth.uid(),'site_engineer'::app_role)
    OR has_role(auth.uid(),'finance_manager'::app_role)
  ));
CREATE POLICY "manpower_records update privileged"
  ON public.manpower_records FOR UPDATE TO authenticated
  USING (project_in_company(project_id) AND (
    has_role(auth.uid(),'company_admin'::app_role)
    OR has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'project_director'::app_role)
    OR has_role(auth.uid(),'project_manager'::app_role)
    OR has_role(auth.uid(),'site_engineer'::app_role)
    OR has_role(auth.uid(),'finance_manager'::app_role)
  ))
  WITH CHECK (project_in_company(project_id));
CREATE POLICY "manpower_records delete privileged"
  ON public.manpower_records FOR DELETE TO authenticated
  USING (project_in_company(project_id) AND (
    has_role(auth.uid(),'company_admin'::app_role)
    OR has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'project_director'::app_role)
    OR has_role(auth.uid(),'project_manager'::app_role)
  ));

-- manpower_workers: split
DROP POLICY IF EXISTS "co members manage manpower_workers" ON public.manpower_workers;
CREATE POLICY "manpower_workers read company"
  ON public.manpower_workers FOR SELECT TO authenticated
  USING (company_id = current_company_id());
CREATE POLICY "manpower_workers write privileged"
  ON public.manpower_workers FOR INSERT TO authenticated
  WITH CHECK (company_id = current_company_id() AND (
    has_role(auth.uid(),'company_admin'::app_role)
    OR has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'project_director'::app_role)
    OR has_role(auth.uid(),'project_manager'::app_role)
    OR has_role(auth.uid(),'site_engineer'::app_role)
    OR has_role(auth.uid(),'finance_manager'::app_role)
  ));
CREATE POLICY "manpower_workers update privileged"
  ON public.manpower_workers FOR UPDATE TO authenticated
  USING (company_id = current_company_id() AND (
    has_role(auth.uid(),'company_admin'::app_role)
    OR has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'project_director'::app_role)
    OR has_role(auth.uid(),'project_manager'::app_role)
    OR has_role(auth.uid(),'site_engineer'::app_role)
    OR has_role(auth.uid(),'finance_manager'::app_role)
  ))
  WITH CHECK (company_id = current_company_id());
CREATE POLICY "manpower_workers delete privileged"
  ON public.manpower_workers FOR DELETE TO authenticated
  USING (company_id = current_company_id() AND (
    has_role(auth.uid(),'company_admin'::app_role)
    OR has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'project_director'::app_role)
  ));

-- timesheet_entries: split
DROP POLICY IF EXISTS "co members manage timesheet entries" ON public.timesheet_entries;
CREATE POLICY "timesheet_entries read project"
  ON public.timesheet_entries FOR SELECT TO authenticated
  USING (project_in_company(project_id));
CREATE POLICY "timesheet_entries write privileged"
  ON public.timesheet_entries FOR INSERT TO authenticated
  WITH CHECK (project_in_company(project_id) AND (
    has_role(auth.uid(),'company_admin'::app_role)
    OR has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'project_director'::app_role)
    OR has_role(auth.uid(),'project_manager'::app_role)
    OR has_role(auth.uid(),'site_engineer'::app_role)
    OR has_role(auth.uid(),'finance_manager'::app_role)
  ));
CREATE POLICY "timesheet_entries update privileged"
  ON public.timesheet_entries FOR UPDATE TO authenticated
  USING (project_in_company(project_id) AND (
    has_role(auth.uid(),'company_admin'::app_role)
    OR has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'project_director'::app_role)
    OR has_role(auth.uid(),'project_manager'::app_role)
    OR has_role(auth.uid(),'site_engineer'::app_role)
    OR has_role(auth.uid(),'finance_manager'::app_role)
  ))
  WITH CHECK (project_in_company(project_id));
CREATE POLICY "timesheet_entries delete privileged"
  ON public.timesheet_entries FOR DELETE TO authenticated
  USING (project_in_company(project_id) AND (
    has_role(auth.uid(),'company_admin'::app_role)
    OR has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'project_director'::app_role)
    OR has_role(auth.uid(),'project_manager'::app_role)
  ));
