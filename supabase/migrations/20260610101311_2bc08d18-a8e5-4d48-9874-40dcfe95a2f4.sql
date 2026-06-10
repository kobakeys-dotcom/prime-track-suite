
-- ============== SUPPLIERS (company-scoped) ==============
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  category text,
  rating numeric(2,1),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage suppliers" ON public.suppliers FOR ALL
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============== COST CODES (company-scoped) ==============
CREATE TABLE public.cost_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  parent_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_codes TO authenticated;
GRANT ALL ON public.cost_codes TO service_role;
ALTER TABLE public.cost_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage cost_codes" ON public.cost_codes FOR ALL
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE TRIGGER trg_cost_codes_updated BEFORE UPDATE ON public.cost_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============== PROCUREMENT REQUESTS ==============
CREATE TABLE public.procurement_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  request_number text NOT NULL,
  material_name text NOT NULL,
  unit text,
  quantity numeric(14,3) NOT NULL DEFAULT 0,
  required_date date,
  reason text,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'draft',
  requested_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.procurement_requests TO authenticated;
GRANT ALL ON public.procurement_requests TO service_role;
ALTER TABLE public.procurement_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage procurement_requests" ON public.procurement_requests FOR ALL
  USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE TRIGGER trg_procreq_updated BEFORE UPDATE ON public.procurement_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============== RFQs ==============
CREATE TABLE public.rfqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  rfq_number text NOT NULL,
  procurement_request_id uuid REFERENCES public.procurement_requests(id) ON DELETE SET NULL,
  supplier_ids uuid[] NOT NULL DEFAULT '{}',
  due_date date,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfqs TO authenticated;
GRANT ALL ON public.rfqs TO service_role;
ALTER TABLE public.rfqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage rfqs" ON public.rfqs FOR ALL
  USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE TRIGGER trg_rfqs_updated BEFORE UPDATE ON public.rfqs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============== PURCHASE ORDERS ==============
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  po_number text NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  procurement_request_id uuid REFERENCES public.procurement_requests(id) ON DELETE SET NULL,
  items jsonb NOT NULL DEFAULT '[]',
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  delivery_date date,
  status text NOT NULL DEFAULT 'draft',
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage purchase_orders" ON public.purchase_orders FOR ALL
  USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE TRIGGER trg_po_updated BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============== DELIVERIES ==============
CREATE TABLE public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  delivery_date date NOT NULL DEFAULT CURRENT_DATE,
  delivered_quantity numeric(14,3) NOT NULL DEFAULT 0,
  received_by uuid REFERENCES auth.users(id),
  delivery_note text,
  status text NOT NULL DEFAULT 'received',
  photos jsonb NOT NULL DEFAULT '[]',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliveries TO authenticated;
GRANT ALL ON public.deliveries TO service_role;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage deliveries" ON public.deliveries FOR ALL
  USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE TRIGGER trg_deliveries_updated BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============== VARIATIONS ==============
CREATE TABLE public.variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  variation_number text NOT NULL,
  title text NOT NULL,
  description text,
  reason text,
  cost_impact numeric(14,2) DEFAULT 0,
  time_impact_days integer DEFAULT 0,
  approved_amount numeric(14,2),
  approved_days integer,
  status text NOT NULL DEFAULT 'draft',
  submitted_by uuid REFERENCES auth.users(id),
  attachments jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.variations TO authenticated;
GRANT ALL ON public.variations TO service_role;
ALTER TABLE public.variations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage variations" ON public.variations FOR ALL
  USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE TRIGGER trg_variations_updated BEFORE UPDATE ON public.variations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============== PAYMENT CLAIMS (IPC) ==============
CREATE TABLE public.payment_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  claim_number text NOT NULL,
  period_start date,
  period_end date,
  work_done_value numeric(14,2) DEFAULT 0,
  variation_value numeric(14,2) DEFAULT 0,
  material_at_site_value numeric(14,2) DEFAULT 0,
  gross_claim numeric(14,2) DEFAULT 0,
  retention numeric(14,2) DEFAULT 0,
  advance_recovery numeric(14,2) DEFAULT 0,
  deductions numeric(14,2) DEFAULT 0,
  net_claim numeric(14,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  approved_at timestamptz,
  paid_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_claims TO authenticated;
GRANT ALL ON public.payment_claims TO service_role;
ALTER TABLE public.payment_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage payment_claims" ON public.payment_claims FOR ALL
  USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE TRIGGER trg_pc_updated BEFORE UPDATE ON public.payment_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============== QUALITY INSPECTIONS ==============
CREATE TABLE public.quality_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  inspection_number text NOT NULL,
  type text,
  location text,
  requested_by uuid REFERENCES auth.users(id),
  inspector_id uuid REFERENCES auth.users(id),
  inspection_date date,
  result text,
  checklist jsonb NOT NULL DEFAULT '[]',
  comments text,
  photos jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quality_inspections TO authenticated;
GRANT ALL ON public.quality_inspections TO service_role;
ALTER TABLE public.quality_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage quality_inspections" ON public.quality_inspections FOR ALL
  USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE TRIGGER trg_qi_updated BEFORE UPDATE ON public.quality_inspections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============== SAFETY INSPECTIONS ==============
CREATE TABLE public.safety_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  inspection_number text NOT NULL,
  location text,
  checklist jsonb NOT NULL DEFAULT '[]',
  unsafe_acts text,
  unsafe_conditions text,
  ppe_compliance text,
  corrective_action text,
  responsible_person uuid REFERENCES auth.users(id),
  due_date date,
  status text NOT NULL DEFAULT 'open',
  photos jsonb NOT NULL DEFAULT '[]',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safety_inspections TO authenticated;
GRANT ALL ON public.safety_inspections TO service_role;
ALTER TABLE public.safety_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage safety_inspections" ON public.safety_inspections FOR ALL
  USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE TRIGGER trg_si_updated BEFORE UPDATE ON public.safety_inspections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============== NCRs ==============
CREATE TABLE public.ncrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ncr_number text NOT NULL,
  description text,
  location text,
  responsible_person uuid REFERENCES auth.users(id),
  corrective_action text,
  due_date date,
  status text NOT NULL DEFAULT 'open',
  photos jsonb NOT NULL DEFAULT '[]',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ncrs TO authenticated;
GRANT ALL ON public.ncrs TO service_role;
ALTER TABLE public.ncrs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage ncrs" ON public.ncrs FOR ALL
  USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE TRIGGER trg_ncrs_updated BEFORE UPDATE ON public.ncrs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============== SNAGS ==============
CREATE TABLE public.snags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  snag_number text NOT NULL,
  location text,
  description text,
  assigned_to uuid REFERENCES auth.users(id),
  due_date date,
  status text NOT NULL DEFAULT 'open',
  before_photo text,
  after_photo text,
  client_approval boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.snags TO authenticated;
GRANT ALL ON public.snags TO service_role;
ALTER TABLE public.snags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage snags" ON public.snags FOR ALL
  USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE TRIGGER trg_snags_updated BEFORE UPDATE ON public.snags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============== RISKS ==============
CREATE TABLE public.risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text,
  description text,
  probability integer DEFAULT 1,
  impact integer DEFAULT 1,
  risk_score integer GENERATED ALWAYS AS (probability * impact) STORED,
  mitigation_action text,
  owner_id uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'open',
  due_date date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risks TO authenticated;
GRANT ALL ON public.risks TO service_role;
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage risks" ON public.risks FOR ALL
  USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE TRIGGER trg_risks_updated BEFORE UPDATE ON public.risks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============== ISSUES ==============
CREATE TABLE public.issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'normal',
  assigned_to uuid REFERENCES auth.users(id),
  due_date date,
  status text NOT NULL DEFAULT 'open',
  photos jsonb NOT NULL DEFAULT '[]',
  resolution text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.issues TO authenticated;
GRANT ALL ON public.issues TO service_role;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage issues" ON public.issues FOR ALL
  USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE TRIGGER trg_issues_updated BEFORE UPDATE ON public.issues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============== MEETINGS ==============
CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  meeting_date timestamptz NOT NULL,
  attendees jsonb NOT NULL DEFAULT '[]',
  agenda text,
  discussion_points text,
  decisions text,
  attachments jsonb NOT NULL DEFAULT '[]',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetings TO authenticated;
GRANT ALL ON public.meetings TO service_role;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage meetings" ON public.meetings FOR ALL
  USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE TRIGGER trg_meetings_updated BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============== MEETING ACTION ITEMS ==============
CREATE TABLE public.meeting_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  description text NOT NULL,
  responsible_person uuid REFERENCES auth.users(id),
  due_date date,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_action_items TO authenticated;
GRANT ALL ON public.meeting_action_items TO service_role;
ALTER TABLE public.meeting_action_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage meeting_action_items" ON public.meeting_action_items FOR ALL
  USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE TRIGGER trg_mai_updated BEFORE UPDATE ON public.meeting_action_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============== RESOURCES (manpower) ==============
CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  trade text,
  assigned_date date DEFAULT CURRENT_DATE,
  attendance_status text DEFAULT 'present',
  overtime_hours numeric(5,2) DEFAULT 0,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage resources" ON public.resources FOR ALL
  USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE TRIGGER trg_resources_updated BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============== EQUIPMENT ==============
CREATE TABLE public.equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  operator text,
  status text NOT NULL DEFAULT 'available',
  usage_hours numeric(8,2) DEFAULT 0,
  maintenance_due_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment TO authenticated;
GRANT ALL ON public.equipment TO service_role;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage equipment" ON public.equipment FOR ALL
  USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE TRIGGER trg_equipment_updated BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============== TIMESHEETS ==============
CREATE TABLE public.timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  work_date date NOT NULL DEFAULT CURRENT_DATE,
  hours numeric(5,2) NOT NULL DEFAULT 0,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timesheets TO authenticated;
GRANT ALL ON public.timesheets TO service_role;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage timesheets" ON public.timesheets FOR ALL
  USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE TRIGGER trg_timesheets_updated BEFORE UPDATE ON public.timesheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============== NOTIFICATION PREFERENCES (per user) ==============
CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled boolean NOT NULL DEFAULT true,
  in_app_enabled boolean NOT NULL DEFAULT true,
  whatsapp_enabled boolean NOT NULL DEFAULT false,
  reminder_days integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user manages own notif prefs" ON public.notification_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_np_updated BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
