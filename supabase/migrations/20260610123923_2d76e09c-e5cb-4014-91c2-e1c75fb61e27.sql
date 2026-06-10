
-- Extend tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS wbs_id uuid,
  ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actual_start date,
  ADD COLUMN IF NOT EXISTS actual_finish date,
  ADD COLUMN IF NOT EXISTS discipline text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- Extend milestones
ALTER TABLE public.milestones
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS progress numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_ms_u ON public.milestones;
CREATE TRIGGER trg_ms_u BEFORE UPDATE ON public.milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- WBS
CREATE TABLE IF NOT EXISTS public.wbs_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_wbs_id uuid REFERENCES public.wbs_items(id) ON DELETE SET NULL,
  wbs_code text,
  title text NOT NULL,
  description text,
  planned_start date,
  planned_finish date,
  progress numeric(5,2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'not_started',
  is_archived boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wbs_items TO authenticated;
GRANT ALL ON public.wbs_items TO service_role;

ALTER TABLE public.wbs_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wbs all" ON public.wbs_items;
CREATE POLICY "wbs all" ON public.wbs_items
  FOR ALL TO authenticated
  USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));

DROP TRIGGER IF EXISTS trg_wbs_u ON public.wbs_items;
CREATE TRIGGER trg_wbs_u BEFORE UPDATE ON public.wbs_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_wbs_id_fkey;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_wbs_id_fkey FOREIGN KEY (wbs_id)
  REFERENCES public.wbs_items(id) ON DELETE SET NULL;
