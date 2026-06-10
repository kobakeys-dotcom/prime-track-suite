
ALTER TABLE public.cost_codes
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS trade text,
  ADD COLUMN IF NOT EXISTS discipline text,
  ADD COLUMN IF NOT EXISTS cost_type text NOT NULL DEFAULT 'Direct Cost',
  ADD COLUMN IF NOT EXISTS budget_amount numeric(16,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_amount numeric(16,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS committed_amount numeric(16,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS forecast_amount numeric(16,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS cost_codes_company_idx ON public.cost_codes(company_id) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS cost_codes_project_idx ON public.cost_codes(project_id) WHERE is_archived = false;

ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS cost_code_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL;

ALTER TABLE public.procurement_requests
  ADD COLUMN IF NOT EXISTS cost_code_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL;
