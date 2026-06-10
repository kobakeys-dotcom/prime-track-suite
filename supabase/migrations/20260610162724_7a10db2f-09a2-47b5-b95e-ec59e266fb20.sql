
-- Extend safety_inspections
ALTER TABLE public.safety_inspections
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS inspection_title text,
  ADD COLUMN IF NOT EXISTS inspection_type text DEFAULT 'General Safety Inspection',
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS floor_level text,
  ADD COLUMN IF NOT EXISTS work_activity text,
  ADD COLUMN IF NOT EXISTS wbs_id uuid,
  ADD COLUMN IF NOT EXISTS task_id uuid,
  ADD COLUMN IF NOT EXISTS subcontractor_id uuid,
  ADD COLUMN IF NOT EXISTS requested_by uuid,
  ADD COLUMN IF NOT EXISTS assigned_inspector_id uuid,
  ADD COLUMN IF NOT EXISTS inspected_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS inspection_date date,
  ADD COLUMN IF NOT EXISTS inspection_time time,
  ADD COLUMN IF NOT EXISTS inspection_result text DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS overall_risk_level text DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS checklist_safe_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checklist_unsafe_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checklist_na_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_checklist_items integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hazards_found integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS corrective_actions_open integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS corrective_actions_closed integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS findings text,
  ADD COLUMN IF NOT EXISTS corrective_action_summary text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS revision_notes text,
  ADD COLUMN IF NOT EXISTS approval_comments text,
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
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Backfill company_id and inspection_date
UPDATE public.safety_inspections si
SET company_id = p.company_id
FROM public.projects p
WHERE si.project_id = p.id AND si.company_id IS NULL;

UPDATE public.safety_inspections SET inspection_date = created_at::date WHERE inspection_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_si_project ON public.safety_inspections(project_id);
CREATE INDEX IF NOT EXISTS idx_si_company ON public.safety_inspections(company_id);
CREATE INDEX IF NOT EXISTS idx_si_status ON public.safety_inspections(status);

-- Checklist items
CREATE TABLE IF NOT EXISTS public.safety_inspection_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  safety_inspection_id uuid NOT NULL REFERENCES public.safety_inspections(id) ON DELETE CASCADE,
  item_number text,
  checklist_item text NOT NULL,
  safety_standard_reference text,
  requirement text,
  result text DEFAULT 'Pending',
  risk_level text DEFAULT 'Medium',
  remarks text,
  corrective_action text,
  responsible_user_id uuid,
  target_closeout_date date,
  closeout_status text DEFAULT 'Open',
  closeout_notes text,
  closed_by uuid,
  closed_at timestamptz,
  photo_required boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_by uuid,
  is_archived boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safety_inspection_checklist_items TO authenticated;
GRANT ALL ON public.safety_inspection_checklist_items TO service_role;
ALTER TABLE public.safety_inspection_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company users manage safety checklist" ON public.safety_inspection_checklist_items
  FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE INDEX IF NOT EXISTS idx_sici_si ON public.safety_inspection_checklist_items(safety_inspection_id);
CREATE TRIGGER trg_sici_updated_at BEFORE UPDATE ON public.safety_inspection_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Hazards
CREATE TABLE IF NOT EXISTS public.safety_hazards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  safety_inspection_id uuid NOT NULL REFERENCES public.safety_inspections(id) ON DELETE CASCADE,
  checklist_item_id uuid REFERENCES public.safety_inspection_checklist_items(id) ON DELETE SET NULL,
  hazard_title text NOT NULL,
  hazard_description text,
  hazard_category text DEFAULT 'General',
  risk_level text DEFAULT 'Medium',
  likelihood text,
  severity text,
  location text,
  responsible_user_id uuid,
  corrective_action text,
  target_closeout_date date,
  closeout_status text DEFAULT 'Open',
  closeout_notes text,
  closed_by uuid,
  closed_at timestamptz,
  created_by uuid,
  is_archived boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safety_hazards TO authenticated;
GRANT ALL ON public.safety_hazards TO service_role;
ALTER TABLE public.safety_hazards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company users manage safety hazards" ON public.safety_hazards
  FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE INDEX IF NOT EXISTS idx_sh_si ON public.safety_hazards(safety_inspection_id);
CREATE TRIGGER trg_sh_updated_at BEFORE UPDATE ON public.safety_hazards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Attachments
CREATE TABLE IF NOT EXISTS public.safety_inspection_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  safety_inspection_id uuid NOT NULL REFERENCES public.safety_inspections(id) ON DELETE CASCADE,
  checklist_item_id uuid REFERENCES public.safety_inspection_checklist_items(id) ON DELETE SET NULL,
  hazard_id uuid REFERENCES public.safety_hazards(id) ON DELETE SET NULL,
  uploaded_by uuid,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  description text,
  attachment_type text DEFAULT 'Safety Evidence',
  is_client_visible boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safety_inspection_attachments TO authenticated;
GRANT ALL ON public.safety_inspection_attachments TO service_role;
ALTER TABLE public.safety_inspection_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company users manage safety attachments" ON public.safety_inspection_attachments
  FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE INDEX IF NOT EXISTS idx_sia_si ON public.safety_inspection_attachments(safety_inspection_id);

-- Status history
CREATE TABLE IF NOT EXISTS public.safety_inspection_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  safety_inspection_id uuid NOT NULL REFERENCES public.safety_inspections(id) ON DELETE CASCADE,
  old_status text,
  new_status text,
  changed_by uuid,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safety_inspection_status_history TO authenticated;
GRANT ALL ON public.safety_inspection_status_history TO service_role;
ALTER TABLE public.safety_inspection_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company users view safety history" ON public.safety_inspection_status_history
  FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE INDEX IF NOT EXISTS idx_sish_si ON public.safety_inspection_status_history(safety_inspection_id);
