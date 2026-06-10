
-- Extend quality_inspections
ALTER TABLE public.quality_inspections
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS inspection_title text,
  ADD COLUMN IF NOT EXISTS inspection_type text DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS discipline text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS floor_level text,
  ADD COLUMN IF NOT EXISTS room_zone text,
  ADD COLUMN IF NOT EXISTS wbs_id uuid,
  ADD COLUMN IF NOT EXISTS task_id uuid,
  ADD COLUMN IF NOT EXISTS boq_item_id uuid,
  ADD COLUMN IF NOT EXISTS drawing_id uuid,
  ADD COLUMN IF NOT EXISTS submittal_id uuid,
  ADD COLUMN IF NOT EXISTS material_id uuid,
  ADD COLUMN IF NOT EXISTS delivery_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_inspector_id uuid,
  ADD COLUMN IF NOT EXISTS inspected_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS inspection_time time,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS inspection_result text DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS checklist_pass_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checklist_fail_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checklist_na_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_checklist_items integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS findings text,
  ADD COLUMN IF NOT EXISTS corrective_action text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS revision_notes text,
  ADD COLUMN IF NOT EXISTS approval_comments text,
  ADD COLUMN IF NOT EXISTS reinspection_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_inspection_id uuid,
  ADD COLUMN IF NOT EXISTS snag_created boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS snag_id uuid,
  ADD COLUMN IF NOT EXISTS issue_created boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS issue_id uuid,
  ADD COLUMN IF NOT EXISTS ncr_created boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ncr_id uuid,
  ADD COLUMN IF NOT EXISTS is_client_visible boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS inspected_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Backfill company_id from project
UPDATE public.quality_inspections qi
SET company_id = p.company_id
FROM public.projects p
WHERE qi.project_id = p.id AND qi.company_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_qi_project ON public.quality_inspections(project_id);
CREATE INDEX IF NOT EXISTS idx_qi_company ON public.quality_inspections(company_id);
CREATE INDEX IF NOT EXISTS idx_qi_status ON public.quality_inspections(status);

-- Checklist items
CREATE TABLE IF NOT EXISTS public.quality_inspection_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  quality_inspection_id uuid NOT NULL REFERENCES public.quality_inspections(id) ON DELETE CASCADE,
  item_number text,
  checklist_item text NOT NULL,
  specification_reference text,
  acceptance_criteria text,
  result text DEFAULT 'Pending',
  remarks text,
  corrective_action text,
  responsible_user_id uuid,
  target_date date,
  photo_required boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_by uuid,
  is_archived boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quality_inspection_checklist_items TO authenticated;
GRANT ALL ON public.quality_inspection_checklist_items TO service_role;
ALTER TABLE public.quality_inspection_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company users manage checklist" ON public.quality_inspection_checklist_items
  FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE INDEX IF NOT EXISTS idx_qici_qi ON public.quality_inspection_checklist_items(quality_inspection_id);
CREATE TRIGGER trg_qici_updated_at BEFORE UPDATE ON public.quality_inspection_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Attachments
CREATE TABLE IF NOT EXISTS public.quality_inspection_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  quality_inspection_id uuid NOT NULL REFERENCES public.quality_inspections(id) ON DELETE CASCADE,
  checklist_item_id uuid REFERENCES public.quality_inspection_checklist_items(id) ON DELETE SET NULL,
  uploaded_by uuid,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  description text,
  attachment_type text DEFAULT 'Inspection Evidence',
  is_client_visible boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quality_inspection_attachments TO authenticated;
GRANT ALL ON public.quality_inspection_attachments TO service_role;
ALTER TABLE public.quality_inspection_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company users manage qi attachments" ON public.quality_inspection_attachments
  FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE INDEX IF NOT EXISTS idx_qia_qi ON public.quality_inspection_attachments(quality_inspection_id);

-- Status history
CREATE TABLE IF NOT EXISTS public.quality_inspection_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  quality_inspection_id uuid NOT NULL REFERENCES public.quality_inspections(id) ON DELETE CASCADE,
  old_status text,
  new_status text,
  changed_by uuid,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quality_inspection_status_history TO authenticated;
GRANT ALL ON public.quality_inspection_status_history TO service_role;
ALTER TABLE public.quality_inspection_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company users view qi history" ON public.quality_inspection_status_history
  FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE INDEX IF NOT EXISTS idx_qish_qi ON public.quality_inspection_status_history(quality_inspection_id);
