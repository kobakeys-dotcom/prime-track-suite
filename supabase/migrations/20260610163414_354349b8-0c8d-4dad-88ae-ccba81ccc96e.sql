
-- Extend ncrs table
ALTER TABLE public.ncrs
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS ncr_title text,
  ADD COLUMN IF NOT EXISTS ncr_type text DEFAULT 'Quality',
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS severity text DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS ncr_source text,
  ADD COLUMN IF NOT EXISTS source_record_id uuid,
  ADD COLUMN IF NOT EXISTS quality_inspection_id uuid,
  ADD COLUMN IF NOT EXISTS safety_inspection_id uuid,
  ADD COLUMN IF NOT EXISTS issue_id uuid,
  ADD COLUMN IF NOT EXISTS snag_id uuid,
  ADD COLUMN IF NOT EXISTS wbs_id uuid,
  ADD COLUMN IF NOT EXISTS task_id uuid,
  ADD COLUMN IF NOT EXISTS boq_item_id uuid,
  ADD COLUMN IF NOT EXISTS drawing_id uuid,
  ADD COLUMN IF NOT EXISTS submittal_id uuid,
  ADD COLUMN IF NOT EXISTS material_id uuid,
  ADD COLUMN IF NOT EXISTS delivery_id uuid,
  ADD COLUMN IF NOT EXISTS supplier_id uuid,
  ADD COLUMN IF NOT EXISTS subcontractor_id uuid,
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS floor_level text,
  ADD COLUMN IF NOT EXISTS non_conformance_details text,
  ADD COLUMN IF NOT EXISTS specification_reference text,
  ADD COLUMN IF NOT EXISTS drawing_reference text,
  ADD COLUMN IF NOT EXISTS standard_reference text,
  ADD COLUMN IF NOT EXISTS detected_by uuid,
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS responsible_user_id uuid,
  ADD COLUMN IF NOT EXISTS responsible_party text,
  ADD COLUMN IF NOT EXISTS root_cause text,
  ADD COLUMN IF NOT EXISTS root_cause_category text,
  ADD COLUMN IF NOT EXISTS preventive_action text,
  ADD COLUMN IF NOT EXISTS containment_action text,
  ADD COLUMN IF NOT EXISTS target_closeout_date date,
  ADD COLUMN IF NOT EXISTS actual_closeout_date date,
  ADD COLUMN IF NOT EXISTS verification_required boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS verification_notes text,
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS rejected_by uuid,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS revision_notes text,
  ADD COLUMN IF NOT EXISTS closeout_notes text,
  ADD COLUMN IF NOT EXISTS cost_impact boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cost_impact_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS time_impact boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS time_impact_days numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recurrence_risk text DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS is_client_visible boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Backfill company_id from projects
UPDATE public.ncrs n SET company_id = p.company_id
  FROM public.projects p WHERE n.project_id = p.id AND n.company_id IS NULL;

-- Make ncr_number nullable so we can auto-generate
ALTER TABLE public.ncrs ALTER COLUMN ncr_number DROP NOT NULL;

-- ncr_actions
CREATE TABLE IF NOT EXISTS public.ncr_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ncr_id uuid NOT NULL REFERENCES public.ncrs(id) ON DELETE CASCADE,
  action_type text DEFAULT 'Corrective Action',
  action_title text NOT NULL,
  action_description text,
  assigned_to uuid,
  target_date date,
  completed_date date,
  status text DEFAULT 'Open',
  priority text DEFAULT 'Medium',
  completion_notes text,
  verification_notes text,
  verified_by uuid,
  verified_at timestamptz,
  created_by uuid,
  is_archived boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ncr_actions TO authenticated;
GRANT ALL ON public.ncr_actions TO service_role;
ALTER TABLE public.ncr_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "co members manage ncr_actions" ON public.ncr_actions;
CREATE POLICY "co members manage ncr_actions" ON public.ncr_actions
  FOR ALL USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE TRIGGER trg_ncr_actions_updated BEFORE UPDATE ON public.ncr_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ncr_attachments
CREATE TABLE IF NOT EXISTS public.ncr_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ncr_id uuid NOT NULL REFERENCES public.ncrs(id) ON DELETE CASCADE,
  ncr_action_id uuid REFERENCES public.ncr_actions(id) ON DELETE SET NULL,
  uploaded_by uuid,
  file_name text,
  file_url text,
  file_type text,
  description text,
  attachment_type text DEFAULT 'NCR Evidence',
  is_client_visible boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ncr_attachments TO authenticated;
GRANT ALL ON public.ncr_attachments TO service_role;
ALTER TABLE public.ncr_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "co members manage ncr_attachments" ON public.ncr_attachments;
CREATE POLICY "co members manage ncr_attachments" ON public.ncr_attachments
  FOR ALL USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));

-- ncr_comments
CREATE TABLE IF NOT EXISTS public.ncr_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ncr_id uuid NOT NULL REFERENCES public.ncrs(id) ON DELETE CASCADE,
  user_id uuid,
  comment text NOT NULL,
  visibility text DEFAULT 'internal',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ncr_comments TO authenticated;
GRANT ALL ON public.ncr_comments TO service_role;
ALTER TABLE public.ncr_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "co members manage ncr_comments" ON public.ncr_comments;
CREATE POLICY "co members manage ncr_comments" ON public.ncr_comments
  FOR ALL USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));

-- ncr_status_history
CREATE TABLE IF NOT EXISTS public.ncr_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ncr_id uuid NOT NULL REFERENCES public.ncrs(id) ON DELETE CASCADE,
  old_status text,
  new_status text,
  changed_by uuid,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ncr_status_history TO authenticated;
GRANT ALL ON public.ncr_status_history TO service_role;
ALTER TABLE public.ncr_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "co members manage ncr_status_history" ON public.ncr_status_history;
CREATE POLICY "co members manage ncr_status_history" ON public.ncr_status_history
  FOR ALL USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));

CREATE INDEX IF NOT EXISTS idx_ncrs_project ON public.ncrs(project_id);
CREATE INDEX IF NOT EXISTS idx_ncrs_company ON public.ncrs(company_id);
CREATE INDEX IF NOT EXISTS idx_ncrs_status ON public.ncrs(status);
CREATE INDEX IF NOT EXISTS idx_ncr_actions_ncr ON public.ncr_actions(ncr_id);
CREATE INDEX IF NOT EXISTS idx_ncr_attachments_ncr ON public.ncr_attachments(ncr_id);
CREATE INDEX IF NOT EXISTS idx_ncr_comments_ncr ON public.ncr_comments(ncr_id);
CREATE INDEX IF NOT EXISTS idx_ncr_status_history_ncr ON public.ncr_status_history(ncr_id);
