
ALTER TABLE public.boq_items
  ADD COLUMN IF NOT EXISTS item_number text,
  ADD COLUMN IF NOT EXISTS section text,
  ADD COLUMN IF NOT EXISTS trade text,
  ADD COLUMN IF NOT EXISTS discipline text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS certified_qty numeric(14,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS variation_qty numeric(14,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_code_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS wbs_id uuid REFERENCES public.wbs_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS milestone_id uuid REFERENCES public.milestones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS boq_items_project_idx ON public.boq_items(project_id) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS boq_items_section_idx ON public.boq_items(project_id, section) WHERE is_archived = false;
