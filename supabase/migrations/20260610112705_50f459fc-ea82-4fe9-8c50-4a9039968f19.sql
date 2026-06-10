
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS consultant_name TEXT,
  ADD COLUMN IF NOT EXISTS contractor_name TEXT,
  ADD COLUMN IF NOT EXISTS project_type TEXT,
  ADD COLUMN IF NOT EXISTS contract_number TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS planned_end_date DATE,
  ADD COLUMN IF NOT EXISTS revised_end_date DATE,
  ADD COLUMN IF NOT EXISTS project_manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS budget_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS risk_level TEXT NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS projects_company_archived_idx ON public.projects(company_id, is_archived);
