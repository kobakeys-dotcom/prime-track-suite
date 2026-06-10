
-- 1. Extend approval_status enum
ALTER TYPE approval_status ADD VALUE IF NOT EXISTS 'approved_with_comments';
ALTER TYPE approval_status ADD VALUE IF NOT EXISTS 'superseded';

-- 2. Extend submittals table
ALTER TABLE public.submittals
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS submittal_type text DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS discipline text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS revision text DEFAULT 'Rev 0',
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_comments text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS revision_notes text,
  ADD COLUMN IF NOT EXISTS boq_item_id uuid,
  ADD COLUMN IF NOT EXISTS material_id uuid,
  ADD COLUMN IF NOT EXISTS linked_drawing_id uuid,
  ADD COLUMN IF NOT EXISTS linked_document_id uuid,
  ADD COLUMN IF NOT EXISTS linked_task_id uuid,
  ADD COLUMN IF NOT EXISTS linked_rfi_id uuid,
  ADD COLUMN IF NOT EXISTS linked_issue_id uuid,
  ADD COLUMN IF NOT EXISTS previous_revision_id uuid,
  ADD COLUMN IF NOT EXISTS superseded_by uuid,
  ADD COLUMN IF NOT EXISTS is_current_revision boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_client_visible boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- 3. submittal_attachments
CREATE TABLE IF NOT EXISTS public.submittal_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  submittal_id uuid NOT NULL REFERENCES public.submittals(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES auth.users(id),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  description text,
  attachment_type text DEFAULT 'Submittal File',
  is_client_visible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submittal_attachments_submittal ON public.submittal_attachments(submittal_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.submittal_attachments TO authenticated;
GRANT ALL ON public.submittal_attachments TO service_role;

ALTER TABLE public.submittal_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "submittal_attachments all" ON public.submittal_attachments;
CREATE POLICY "submittal_attachments all" ON public.submittal_attachments
  FOR ALL TO authenticated
  USING (project_in_company(project_id))
  WITH CHECK (project_in_company(project_id));
