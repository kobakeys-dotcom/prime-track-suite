
-- Extend approval_status enum with reopened and cancelled
ALTER TYPE public.approval_status ADD VALUE IF NOT EXISTS 'reopened';
ALTER TYPE public.approval_status ADD VALUE IF NOT EXISTS 'cancelled';

-- Extend rfis table
ALTER TABLE public.rfis
  ADD COLUMN IF NOT EXISTS rfi_number text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS response text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS discipline text,
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS reviewer_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS responded_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS cost_impact boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cost_impact_description text,
  ADD COLUMN IF NOT EXISTS time_impact boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS time_impact_days numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS time_impact_description text,
  ADD COLUMN IF NOT EXISTS reference_drawing text,
  ADD COLUMN IF NOT EXISTS linked_drawing_id uuid,
  ADD COLUMN IF NOT EXISTS linked_task_id uuid,
  ADD COLUMN IF NOT EXISTS linked_document_id uuid,
  ADD COLUMN IF NOT EXISTS linked_submittal_id uuid,
  ADD COLUMN IF NOT EXISTS linked_issue_id uuid,
  ADD COLUMN IF NOT EXISTS is_client_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

UPDATE public.rfis SET rfi_number = number WHERE rfi_number IS NULL AND number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rfis_project_status ON public.rfis(project_id, status);
CREATE INDEX IF NOT EXISTS idx_rfis_archived ON public.rfis(is_archived);
CREATE INDEX IF NOT EXISTS idx_rfis_assigned_to ON public.rfis(assigned_to);

-- RFI attachments
CREATE TABLE IF NOT EXISTS public.rfi_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  rfi_id uuid NOT NULL REFERENCES public.rfis(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES auth.users(id),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  description text,
  is_client_visible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfi_attachments TO authenticated;
GRANT ALL ON public.rfi_attachments TO service_role;

ALTER TABLE public.rfi_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rfi_attachments all" ON public.rfi_attachments
  FOR ALL TO authenticated
  USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));

CREATE INDEX IF NOT EXISTS idx_rfi_attachments_rfi ON public.rfi_attachments(rfi_id);
