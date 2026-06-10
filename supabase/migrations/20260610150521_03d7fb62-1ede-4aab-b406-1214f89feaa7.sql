
CREATE TABLE IF NOT EXISTS public.cash_flow_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  plan_name text NOT NULL DEFAULT 'Main Cash Flow Plan',
  plan_type text NOT NULL DEFAULT 'Monthly',
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  currency text NOT NULL DEFAULT 'MVR',
  opening_balance numeric NOT NULL DEFAULT 0,
  total_planned_inflow numeric NOT NULL DEFAULT 0,
  total_actual_inflow numeric NOT NULL DEFAULT 0,
  total_forecast_inflow numeric NOT NULL DEFAULT 0,
  total_planned_outflow numeric NOT NULL DEFAULT 0,
  total_actual_outflow numeric NOT NULL DEFAULT 0,
  total_forecast_outflow numeric NOT NULL DEFAULT 0,
  net_planned_cash_flow numeric NOT NULL DEFAULT 0,
  net_actual_cash_flow numeric NOT NULL DEFAULT 0,
  net_forecast_cash_flow numeric NOT NULL DEFAULT 0,
  closing_balance numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Active',
  created_by uuid,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_flow_plans TO authenticated;
GRANT ALL ON public.cash_flow_plans TO service_role;
ALTER TABLE public.cash_flow_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY cfp_company_access ON public.cash_flow_plans FOR ALL TO authenticated
  USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
CREATE INDEX IF NOT EXISTS idx_cfp_project ON public.cash_flow_plans(project_id);
CREATE TRIGGER trg_cfp_updated BEFORE UPDATE ON public.cash_flow_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.cash_flow_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  cash_flow_plan_id uuid REFERENCES public.cash_flow_plans(id) ON DELETE CASCADE,
  period_label text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  entry_type text NOT NULL DEFAULT 'Both',
  category text NOT NULL DEFAULT 'General',
  source_module text NOT NULL DEFAULT 'Manual',
  source_record_id uuid,
  description text,
  planned_inflow numeric NOT NULL DEFAULT 0,
  actual_inflow numeric NOT NULL DEFAULT 0,
  forecast_inflow numeric NOT NULL DEFAULT 0,
  planned_outflow numeric NOT NULL DEFAULT 0,
  actual_outflow numeric NOT NULL DEFAULT 0,
  forecast_outflow numeric NOT NULL DEFAULT 0,
  net_planned numeric NOT NULL DEFAULT 0,
  net_actual numeric NOT NULL DEFAULT 0,
  net_forecast numeric NOT NULL DEFAULT 0,
  cumulative_planned numeric NOT NULL DEFAULT 0,
  cumulative_actual numeric NOT NULL DEFAULT 0,
  cumulative_forecast numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Active',
  remarks text,
  created_by uuid,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_flow_entries TO authenticated;
GRANT ALL ON public.cash_flow_entries TO service_role;
ALTER TABLE public.cash_flow_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY cfe_company_access ON public.cash_flow_entries FOR ALL TO authenticated
  USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
CREATE INDEX IF NOT EXISTS idx_cfe_project ON public.cash_flow_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_cfe_plan ON public.cash_flow_entries(cash_flow_plan_id);
CREATE TRIGGER trg_cfe_updated BEFORE UPDATE ON public.cash_flow_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.cash_flow_receivables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  cash_flow_plan_id uuid REFERENCES public.cash_flow_plans(id) ON DELETE SET NULL,
  payment_claim_id uuid,
  invoice_number text,
  claim_number text,
  description text,
  expected_receipt_date date,
  actual_receipt_date date,
  claimed_amount numeric NOT NULL DEFAULT 0,
  certified_amount numeric NOT NULL DEFAULT 0,
  received_amount numeric NOT NULL DEFAULT 0,
  outstanding_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Expected',
  created_by uuid,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_flow_receivables TO authenticated;
GRANT ALL ON public.cash_flow_receivables TO service_role;
ALTER TABLE public.cash_flow_receivables ENABLE ROW LEVEL SECURITY;
CREATE POLICY cfr_company_access ON public.cash_flow_receivables FOR ALL TO authenticated
  USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
CREATE INDEX IF NOT EXISTS idx_cfr_project ON public.cash_flow_receivables(project_id);
CREATE TRIGGER trg_cfr_updated BEFORE UPDATE ON public.cash_flow_receivables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.cash_flow_payables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  cash_flow_plan_id uuid REFERENCES public.cash_flow_plans(id) ON DELETE SET NULL,
  purchase_order_id uuid,
  supplier_id uuid,
  subcontractor_id uuid,
  payment_reference text,
  description text,
  expected_payment_date date,
  actual_payment_date date,
  committed_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  outstanding_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Expected',
  created_by uuid,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_flow_payables TO authenticated;
GRANT ALL ON public.cash_flow_payables TO service_role;
ALTER TABLE public.cash_flow_payables ENABLE ROW LEVEL SECURITY;
CREATE POLICY cfpa_company_access ON public.cash_flow_payables FOR ALL TO authenticated
  USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
CREATE INDEX IF NOT EXISTS idx_cfpa_project ON public.cash_flow_payables(project_id);
CREATE TRIGGER trg_cfpa_updated BEFORE UPDATE ON public.cash_flow_payables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.cash_flow_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  snapshot_date date NOT NULL DEFAULT current_date,
  planned_inflow numeric NOT NULL DEFAULT 0,
  actual_inflow numeric NOT NULL DEFAULT 0,
  forecast_inflow numeric NOT NULL DEFAULT 0,
  planned_outflow numeric NOT NULL DEFAULT 0,
  actual_outflow numeric NOT NULL DEFAULT 0,
  forecast_outflow numeric NOT NULL DEFAULT 0,
  net_cash_flow numeric NOT NULL DEFAULT 0,
  cumulative_cash_flow numeric NOT NULL DEFAULT 0,
  closing_balance numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_flow_snapshots TO authenticated;
GRANT ALL ON public.cash_flow_snapshots TO service_role;
ALTER TABLE public.cash_flow_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY cfs_company_access ON public.cash_flow_snapshots FOR ALL TO authenticated
  USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
CREATE INDEX IF NOT EXISTS idx_cfs_project ON public.cash_flow_snapshots(project_id);
