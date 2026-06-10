
-- PROJECT BUDGETS
CREATE TABLE IF NOT EXISTS public.project_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  budget_name text NOT NULL DEFAULT 'Main Project Budget',
  budget_version text DEFAULT 'Original',
  description text,
  original_budget numeric(16,2) NOT NULL DEFAULT 0,
  approved_changes numeric(16,2) NOT NULL DEFAULT 0,
  revised_budget numeric(16,2) NOT NULL DEFAULT 0,
  actual_cost numeric(16,2) NOT NULL DEFAULT 0,
  committed_cost numeric(16,2) NOT NULL DEFAULT 0,
  forecast_cost numeric(16,2) NOT NULL DEFAULT 0,
  cost_to_complete numeric(16,2) NOT NULL DEFAULT 0,
  cost_at_completion numeric(16,2) NOT NULL DEFAULT 0,
  variance_amount numeric(16,2) NOT NULL DEFAULT 0,
  variance_percentage numeric(8,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Active',
  approved_by uuid,
  approved_at timestamptz,
  created_by uuid,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_budgets TO authenticated;
GRANT ALL ON public.project_budgets TO service_role;
ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pb_company_access" ON public.project_budgets FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE INDEX IF NOT EXISTS pb_project_idx ON public.project_budgets(project_id);
CREATE TRIGGER trg_pb_updated BEFORE UPDATE ON public.project_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- BUDGET LINES
CREATE TABLE IF NOT EXISTS public.budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  project_budget_id uuid REFERENCES public.project_budgets(id) ON DELETE SET NULL,
  cost_code_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  boq_item_id uuid REFERENCES public.boq_items(id) ON DELETE SET NULL,
  line_code text,
  line_name text NOT NULL,
  description text,
  category text DEFAULT 'General',
  trade text,
  discipline text,
  cost_type text DEFAULT 'Direct Cost',
  original_budget numeric(16,2) NOT NULL DEFAULT 0,
  approved_changes numeric(16,2) NOT NULL DEFAULT 0,
  revised_budget numeric(16,2) NOT NULL DEFAULT 0,
  actual_cost numeric(16,2) NOT NULL DEFAULT 0,
  committed_cost numeric(16,2) NOT NULL DEFAULT 0,
  forecast_cost numeric(16,2) NOT NULL DEFAULT 0,
  cost_to_complete numeric(16,2) NOT NULL DEFAULT 0,
  cost_at_completion numeric(16,2) NOT NULL DEFAULT 0,
  variance_amount numeric(16,2) NOT NULL DEFAULT 0,
  variance_percentage numeric(8,2) NOT NULL DEFAULT 0,
  budget_utilization_percentage numeric(8,2) NOT NULL DEFAULT 0,
  forecast_overrun_amount numeric(16,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Active',
  remarks text,
  created_by uuid,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_lines TO authenticated;
GRANT ALL ON public.budget_lines TO service_role;
ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bl_company_access" ON public.budget_lines FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE INDEX IF NOT EXISTS bl_project_idx ON public.budget_lines(project_id);
CREATE INDEX IF NOT EXISTS bl_costcode_idx ON public.budget_lines(cost_code_id);
CREATE TRIGGER trg_bl_updated BEFORE UPDATE ON public.budget_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ACTUAL COST ENTRIES
CREATE TABLE IF NOT EXISTS public.actual_cost_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  budget_line_id uuid REFERENCES public.budget_lines(id) ON DELETE SET NULL,
  cost_code_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  source_module text DEFAULT 'Manual',
  source_record_id uuid,
  cost_date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  supplier_name text,
  invoice_number text,
  amount numeric(16,2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'MVR',
  status text NOT NULL DEFAULT 'Recorded',
  entered_by uuid,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.actual_cost_entries TO authenticated;
GRANT ALL ON public.actual_cost_entries TO service_role;
ALTER TABLE public.actual_cost_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ace_company_access" ON public.actual_cost_entries FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE INDEX IF NOT EXISTS ace_project_idx ON public.actual_cost_entries(project_id);
CREATE INDEX IF NOT EXISTS ace_bl_idx ON public.actual_cost_entries(budget_line_id);
CREATE TRIGGER trg_ace_updated BEFORE UPDATE ON public.actual_cost_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- COMMITTED COST ENTRIES
CREATE TABLE IF NOT EXISTS public.committed_cost_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  budget_line_id uuid REFERENCES public.budget_lines(id) ON DELETE SET NULL,
  cost_code_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  source_module text DEFAULT 'Manual',
  source_record_id uuid,
  commitment_date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  supplier_name text,
  po_number text,
  amount numeric(16,2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'MVR',
  status text NOT NULL DEFAULT 'Committed',
  entered_by uuid,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.committed_cost_entries TO authenticated;
GRANT ALL ON public.committed_cost_entries TO service_role;
ALTER TABLE public.committed_cost_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cce_company_access" ON public.committed_cost_entries FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE INDEX IF NOT EXISTS cce_project_idx ON public.committed_cost_entries(project_id);
CREATE INDEX IF NOT EXISTS cce_bl_idx ON public.committed_cost_entries(budget_line_id);
CREATE TRIGGER trg_cce_updated BEFORE UPDATE ON public.committed_cost_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- BUDGET CHANGE ORDERS
CREATE TABLE IF NOT EXISTS public.budget_change_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  project_budget_id uuid REFERENCES public.project_budgets(id) ON DELETE SET NULL,
  budget_line_id uuid REFERENCES public.budget_lines(id) ON DELETE SET NULL,
  variation_id uuid REFERENCES public.variations(id) ON DELETE SET NULL,
  change_number text,
  title text NOT NULL,
  description text,
  change_amount numeric(16,2) NOT NULL DEFAULT 0,
  approved_amount numeric(16,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Draft',
  approved_by uuid,
  approved_at timestamptz,
  created_by uuid,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_change_orders TO authenticated;
GRANT ALL ON public.budget_change_orders TO service_role;
ALTER TABLE public.budget_change_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bco_company_access" ON public.budget_change_orders FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE INDEX IF NOT EXISTS bco_project_idx ON public.budget_change_orders(project_id);
CREATE TRIGGER trg_bco_updated BEFORE UPDATE ON public.budget_change_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Add budget_line_id to purchase_orders for direct linking
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS budget_line_id uuid REFERENCES public.budget_lines(id) ON DELETE SET NULL;
