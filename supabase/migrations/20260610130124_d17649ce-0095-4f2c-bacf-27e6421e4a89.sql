
ALTER TABLE public.issues
  ADD COLUMN IF NOT EXISTS issue_number text,
  ADD COLUMN IF NOT EXISTS issue_type text NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS discipline text,
  ADD COLUMN IF NOT EXISTS target_resolution_date date,
  ADD COLUMN IF NOT EXISTS resolved_date date,
  ADD COLUMN IF NOT EXISTS root_cause text,
  ADD COLUMN IF NOT EXISTS corrective_action text,
  ADD COLUMN IF NOT EXISTS resolution_notes text,
  ADD COLUMN IF NOT EXISTS escalation_level integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_escalated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_client_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_task_id uuid,
  ADD COLUMN IF NOT EXISTS linked_daily_report_id uuid,
  ADD COLUMN IF NOT EXISTS linked_risk_id uuid;

CREATE INDEX IF NOT EXISTS idx_issues_project_status ON public.issues (project_id, status);
CREATE INDEX IF NOT EXISTS idx_issues_assigned_to ON public.issues (assigned_to);
CREATE INDEX IF NOT EXISTS idx_issues_archived ON public.issues (is_archived);
