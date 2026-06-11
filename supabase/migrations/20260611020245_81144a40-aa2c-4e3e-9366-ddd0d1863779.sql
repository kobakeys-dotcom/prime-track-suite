
-- Expand drawings table
ALTER TABLE public.drawings
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS drawing_number text,
  ADD COLUMN IF NOT EXISTS drawing_title text,
  ADD COLUMN IF NOT EXISTS drawing_description text,
  ADD COLUMN IF NOT EXISTS drawing_type text DEFAULT 'General Arrangement',
  ADD COLUMN IF NOT EXISTS drawing_category text DEFAULT 'Construction',
  ADD COLUMN IF NOT EXISTS zone_area text,
  ADD COLUMN IF NOT EXISTS floor_level text,
  ADD COLUMN IF NOT EXISTS block_section text,
  ADD COLUMN IF NOT EXISTS drawing_status text DEFAULT 'Draft',
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'Not Submitted',
  ADD COLUMN IF NOT EXISTS issue_purpose text DEFAULT 'For Information',
  ADD COLUMN IF NOT EXISTS current_revision_id uuid,
  ADD COLUMN IF NOT EXISTS prepared_by uuid,
  ADD COLUMN IF NOT EXISTS checked_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS consultant_approved_by uuid,
  ADD COLUMN IF NOT EXISTS client_approved_by uuid,
  ADD COLUMN IF NOT EXISTS received_from text,
  ADD COLUMN IF NOT EXISTS issued_to text,
  ADD COLUMN IF NOT EXISTS issue_date date,
  ADD COLUMN IF NOT EXISTS received_date date,
  ADD COLUMN IF NOT EXISTS approved_date date,
  ADD COLUMN IF NOT EXISTS superseded_date date,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS file_type text,
  ADD COLUMN IF NOT EXISTS file_size numeric,
  ADD COLUMN IF NOT EXISTS storage_bucket text,
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS scale text,
  ADD COLUMN IF NOT EXISTS sheet_size text,
  ADD COLUMN IF NOT EXISTS drawing_origin text DEFAULT 'Internal',
  ADD COLUMN IF NOT EXISTS is_latest_revision boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_client_visible boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_downloadable boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_confidential boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS wbs_id uuid,
  ADD COLUMN IF NOT EXISTS task_id uuid,
  ADD COLUMN IF NOT EXISTS boq_item_id uuid,
  ADD COLUMN IF NOT EXISTS rfi_id uuid,
  ADD COLUMN IF NOT EXISTS submittal_id uuid,
  ADD COLUMN IF NOT EXISTS variation_id uuid,
  ADD COLUMN IF NOT EXISTS quality_inspection_id uuid,
  ADD COLUMN IF NOT EXISTS safety_inspection_id uuid,
  ADD COLUMN IF NOT EXISTS ncr_id uuid,
  ADD COLUMN IF NOT EXISTS document_id uuid,
  ADD COLUMN IF NOT EXISTS tags text[],
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS revision_notes text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill mirror columns and company_id from project
UPDATE public.drawings d SET drawing_number = number WHERE drawing_number IS NULL;
UPDATE public.drawings d SET drawing_title = COALESCE(title, number) WHERE drawing_title IS NULL;
UPDATE public.drawings d SET company_id = p.company_id
  FROM public.projects p WHERE p.id = d.project_id AND d.company_id IS NULL;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_drawings_updated_at ON public.drawings;
CREATE TRIGGER trg_drawings_updated_at BEFORE UPDATE ON public.drawings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Drawing revisions
CREATE TABLE IF NOT EXISTS public.drawing_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  drawing_id uuid NOT NULL REFERENCES public.drawings(id) ON DELETE CASCADE,
  revision text NOT NULL,
  revision_title text,
  revision_description text,
  revision_date date DEFAULT current_date,
  revision_status text DEFAULT 'Current',
  issue_purpose text,
  uploaded_by uuid,
  checked_by uuid,
  reviewed_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  file_name text,
  file_url text,
  file_path text,
  file_type text,
  file_size numeric,
  storage_bucket text,
  storage_path text,
  change_summary text,
  is_current boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drawing_revisions TO authenticated;
GRANT ALL ON public.drawing_revisions TO service_role;
ALTER TABLE public.drawing_revisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "drw_rev all" ON public.drawing_revisions;
CREATE POLICY "drw_rev all" ON public.drawing_revisions FOR ALL TO authenticated
  USING (public.project_in_company(project_id)) WITH CHECK (public.project_in_company(project_id));
DROP TRIGGER IF EXISTS trg_drawing_revisions_updated_at ON public.drawing_revisions;
CREATE TRIGGER trg_drawing_revisions_updated_at BEFORE UPDATE ON public.drawing_revisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Comments
CREATE TABLE IF NOT EXISTS public.drawing_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  drawing_id uuid NOT NULL REFERENCES public.drawings(id) ON DELETE CASCADE,
  user_id uuid,
  comment text NOT NULL,
  visibility text DEFAULT 'internal',
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drawing_comments TO authenticated;
GRANT ALL ON public.drawing_comments TO service_role;
ALTER TABLE public.drawing_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "drw_cmt all" ON public.drawing_comments;
CREATE POLICY "drw_cmt all" ON public.drawing_comments FOR ALL TO authenticated
  USING (public.project_in_company(project_id)) WITH CHECK (public.project_in_company(project_id));

-- Status history
CREATE TABLE IF NOT EXISTS public.drawing_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  drawing_id uuid NOT NULL REFERENCES public.drawings(id) ON DELETE CASCADE,
  old_status text,
  new_status text,
  changed_by uuid,
  remarks text,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drawing_status_history TO authenticated;
GRANT ALL ON public.drawing_status_history TO service_role;
ALTER TABLE public.drawing_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "drw_hist all" ON public.drawing_status_history;
CREATE POLICY "drw_hist all" ON public.drawing_status_history FOR ALL TO authenticated
  USING (public.project_in_company(project_id)) WITH CHECK (public.project_in_company(project_id));

-- Distribution logs
CREATE TABLE IF NOT EXISTS public.drawing_distribution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  drawing_id uuid NOT NULL REFERENCES public.drawings(id) ON DELETE CASCADE,
  revision_id uuid,
  distributed_to uuid,
  distributed_to_name text,
  distributed_to_email text,
  distribution_method text DEFAULT 'System',
  distributed_by uuid,
  distributed_at timestamptz DEFAULT now(),
  remarks text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drawing_distribution_logs TO authenticated;
GRANT ALL ON public.drawing_distribution_logs TO service_role;
ALTER TABLE public.drawing_distribution_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "drw_dist all" ON public.drawing_distribution_logs;
CREATE POLICY "drw_dist all" ON public.drawing_distribution_logs FOR ALL TO authenticated
  USING (public.project_in_company(project_id)) WITH CHECK (public.project_in_company(project_id));

-- Access logs
CREATE TABLE IF NOT EXISTS public.drawing_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  drawing_id uuid NOT NULL REFERENCES public.drawings(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drawing_access_logs TO authenticated;
GRANT ALL ON public.drawing_access_logs TO service_role;
ALTER TABLE public.drawing_access_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "drw_acc all" ON public.drawing_access_logs;
CREATE POLICY "drw_acc all" ON public.drawing_access_logs FOR ALL TO authenticated
  USING (public.project_in_company(project_id)) WITH CHECK (public.project_in_company(project_id));

CREATE INDEX IF NOT EXISTS idx_drawings_company ON public.drawings(company_id);
CREATE INDEX IF NOT EXISTS idx_drawings_project ON public.drawings(project_id);
CREATE INDEX IF NOT EXISTS idx_drawings_status ON public.drawings(drawing_status);
CREATE INDEX IF NOT EXISTS idx_drw_rev_drawing ON public.drawing_revisions(drawing_id);
