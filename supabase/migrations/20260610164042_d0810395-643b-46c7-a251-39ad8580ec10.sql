
-- Extend risks table
ALTER TABLE public.risks
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS risk_number text,
  ADD COLUMN IF NOT EXISTS risk_category text DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS risk_type text DEFAULT 'Threat',
  ADD COLUMN IF NOT EXISTS risk_source text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS wbs_id uuid,
  ADD COLUMN IF NOT EXISTS task_id uuid,
  ADD COLUMN IF NOT EXISTS milestone_id uuid,
  ADD COLUMN IF NOT EXISTS boq_item_id uuid,
  ADD COLUMN IF NOT EXISTS variation_id uuid,
  ADD COLUMN IF NOT EXISTS issue_id uuid,
  ADD COLUMN IF NOT EXISTS ncr_id uuid,
  ADD COLUMN IF NOT EXISTS quality_inspection_id uuid,
  ADD COLUMN IF NOT EXISTS safety_inspection_id uuid,
  ADD COLUMN IF NOT EXISTS risk_owner_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS identified_by uuid,
  ADD COLUMN IF NOT EXISTS risk_level text DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS response_strategy text DEFAULT 'Mitigate',
  ADD COLUMN IF NOT EXISTS mitigation_plan text,
  ADD COLUMN IF NOT EXISTS contingency_plan text,
  ADD COLUMN IF NOT EXISTS trigger_condition text,
  ADD COLUMN IF NOT EXISTS early_warning_signs text,
  ADD COLUMN IF NOT EXISTS residual_probability integer,
  ADD COLUMN IF NOT EXISTS residual_impact integer,
  ADD COLUMN IF NOT EXISTS residual_risk_score integer,
  ADD COLUMN IF NOT EXISTS residual_risk_level text,
  ADD COLUMN IF NOT EXISTS target_mitigation_date date,
  ADD COLUMN IF NOT EXISTS actual_mitigation_date date,
  ADD COLUMN IF NOT EXISTS review_date date,
  ADD COLUMN IF NOT EXISTS escalation_status text DEFAULT 'Not Escalated',
  ADD COLUMN IF NOT EXISTS escalated_to uuid,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalation_reason text,
  ADD COLUMN IF NOT EXISTS converted_to_issue boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS converted_issue_id uuid,
  ADD COLUMN IF NOT EXISTS cost_impact boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cost_impact_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS time_impact boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS time_impact_days numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS safety_impact boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS quality_impact boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_impact boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS is_client_visible boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reopened_at timestamptz;

-- Backfill company_id from projects
UPDATE public.risks r SET company_id = p.company_id
  FROM public.projects p WHERE r.project_id = p.id AND r.company_id IS NULL;

-- risk_actions
CREATE TABLE IF NOT EXISTS public.risk_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  risk_id uuid NOT NULL REFERENCES public.risks(id) ON DELETE CASCADE,
  action_title text NOT NULL,
  action_description text,
  action_type text DEFAULT 'Mitigation',
  assigned_to uuid,
  target_date date,
  completed_date date,
  status text DEFAULT 'Open',
  priority text DEFAULT 'Medium',
  progress_percentage numeric DEFAULT 0,
  completion_notes text,
  created_by uuid,
  is_archived boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_actions TO authenticated;
GRANT ALL ON public.risk_actions TO service_role;
ALTER TABLE public.risk_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "risk_actions company" ON public.risk_actions FOR ALL TO authenticated
  USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());

-- risk_attachments
CREATE TABLE IF NOT EXISTS public.risk_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  risk_id uuid NOT NULL REFERENCES public.risks(id) ON DELETE CASCADE,
  risk_action_id uuid,
  uploaded_by uuid,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  description text,
  attachment_type text DEFAULT 'Risk Document',
  is_client_visible boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_attachments TO authenticated;
GRANT ALL ON public.risk_attachments TO service_role;
ALTER TABLE public.risk_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "risk_attachments company" ON public.risk_attachments FOR ALL TO authenticated
  USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());

-- risk_comments
CREATE TABLE IF NOT EXISTS public.risk_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  risk_id uuid NOT NULL REFERENCES public.risks(id) ON DELETE CASCADE,
  user_id uuid,
  comment text NOT NULL,
  visibility text DEFAULT 'internal',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_comments TO authenticated;
GRANT ALL ON public.risk_comments TO service_role;
ALTER TABLE public.risk_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "risk_comments company" ON public.risk_comments FOR ALL TO authenticated
  USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());

-- risk_status_history
CREATE TABLE IF NOT EXISTS public.risk_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  risk_id uuid NOT NULL REFERENCES public.risks(id) ON DELETE CASCADE,
  old_status text,
  new_status text,
  changed_by uuid,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_status_history TO authenticated;
GRANT ALL ON public.risk_status_history TO service_role;
ALTER TABLE public.risk_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "risk_status_history company" ON public.risk_status_history FOR ALL TO authenticated
  USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());

-- risk_reviews
CREATE TABLE IF NOT EXISTS public.risk_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  risk_id uuid NOT NULL REFERENCES public.risks(id) ON DELETE CASCADE,
  review_date date DEFAULT current_date,
  reviewed_by uuid,
  probability integer,
  impact integer,
  risk_score integer,
  risk_level text,
  review_notes text,
  next_review_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_reviews TO authenticated;
GRANT ALL ON public.risk_reviews TO service_role;
ALTER TABLE public.risk_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "risk_reviews company" ON public.risk_reviews FOR ALL TO authenticated
  USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());

-- Risks RLS: replace if exists
DROP POLICY IF EXISTS "risks company" ON public.risks;
CREATE POLICY "risks company" ON public.risks FOR ALL TO authenticated
  USING (company_id = public.current_company_id() OR (company_id IS NULL AND public.project_in_company(project_id)))
  WITH CHECK (company_id = public.current_company_id() OR (company_id IS NULL AND public.project_in_company(project_id)));

-- Triggers for updated_at on risk_actions
DROP TRIGGER IF EXISTS update_risk_actions_updated_at ON public.risk_actions;
CREATE TRIGGER update_risk_actions_updated_at BEFORE UPDATE ON public.risk_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
