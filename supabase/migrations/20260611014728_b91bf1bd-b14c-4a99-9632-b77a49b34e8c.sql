
-- Extend documents
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS document_number text,
  ADD COLUMN IF NOT EXISTS document_title text,
  ADD COLUMN IF NOT EXISTS document_description text,
  ADD COLUMN IF NOT EXISTS document_type text DEFAULT 'General Document',
  ADD COLUMN IF NOT EXISTS document_category text DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS discipline text,
  ADD COLUMN IF NOT EXISTS folder_path text,
  ADD COLUMN IF NOT EXISTS document_status text DEFAULT 'Draft',
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'Not Submitted',
  ADD COLUMN IF NOT EXISTS revision text DEFAULT 'Rev 0',
  ADD COLUMN IF NOT EXISTS current_revision_id uuid,
  ADD COLUMN IF NOT EXISTS document_owner_id uuid,
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS prepared_by uuid,
  ADD COLUMN IF NOT EXISTS issue_date date,
  ADD COLUMN IF NOT EXISTS expiry_date date,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_accessed_at timestamptz,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS file_type text,
  ADD COLUMN IF NOT EXISTS storage_bucket text,
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS is_latest_revision boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_confidential boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_client_visible boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_downloadable boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS linked_module text,
  ADD COLUMN IF NOT EXISTS linked_record_id uuid,
  ADD COLUMN IF NOT EXISTS wbs_id uuid,
  ADD COLUMN IF NOT EXISTS task_id uuid,
  ADD COLUMN IF NOT EXISTS drawing_id uuid,
  ADD COLUMN IF NOT EXISTS rfi_id uuid,
  ADD COLUMN IF NOT EXISTS submittal_id uuid,
  ADD COLUMN IF NOT EXISTS variation_id uuid,
  ADD COLUMN IF NOT EXISTS payment_claim_id uuid,
  ADD COLUMN IF NOT EXISTS quality_inspection_id uuid,
  ADD COLUMN IF NOT EXISTS safety_inspection_id uuid,
  ADD COLUMN IF NOT EXISTS ncr_id uuid,
  ADD COLUMN IF NOT EXISTS risk_id uuid,
  ADD COLUMN IF NOT EXISTS meeting_id uuid,
  ADD COLUMN IF NOT EXISTS supplier_id uuid,
  ADD COLUMN IF NOT EXISTS purchase_order_id uuid,
  ADD COLUMN IF NOT EXISTS delivery_id uuid,
  ADD COLUMN IF NOT EXISTS tags text[],
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS revision_notes text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- backfill document_title from name
UPDATE public.documents SET document_title = name WHERE document_title IS NULL;

CREATE INDEX IF NOT EXISTS idx_documents_company ON public.documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_project ON public.documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(document_status);

DROP TRIGGER IF EXISTS trg_documents_updated_at ON public.documents;
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- document_revisions
CREATE TABLE IF NOT EXISTS public.document_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  revision text NOT NULL,
  revision_title text,
  revision_description text,
  revision_date date DEFAULT current_date,
  revision_status text DEFAULT 'Current',
  uploaded_by uuid,
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_revisions TO authenticated;
GRANT ALL ON public.document_revisions TO service_role;
ALTER TABLE public.document_revisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "doc revisions all" ON public.document_revisions;
CREATE POLICY "doc revisions all" ON public.document_revisions FOR ALL TO authenticated
  USING (((project_id IS NULL) AND (company_id = public.current_company_id())) OR public.project_in_company(project_id))
  WITH CHECK (((project_id IS NULL) AND (company_id = public.current_company_id())) OR public.project_in_company(project_id));
CREATE INDEX IF NOT EXISTS idx_doc_rev_document ON public.document_revisions(document_id);
DROP TRIGGER IF EXISTS trg_doc_rev_updated_at ON public.document_revisions;
CREATE TRIGGER trg_doc_rev_updated_at BEFORE UPDATE ON public.document_revisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- document_comments
CREATE TABLE IF NOT EXISTS public.document_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid,
  comment text NOT NULL,
  visibility text DEFAULT 'internal',
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_comments TO authenticated;
GRANT ALL ON public.document_comments TO service_role;
ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "doc comments all" ON public.document_comments;
CREATE POLICY "doc comments all" ON public.document_comments FOR ALL TO authenticated
  USING (((project_id IS NULL) AND (company_id = public.current_company_id())) OR public.project_in_company(project_id))
  WITH CHECK (((project_id IS NULL) AND (company_id = public.current_company_id())) OR public.project_in_company(project_id));
CREATE INDEX IF NOT EXISTS idx_doc_comments_document ON public.document_comments(document_id);

-- document_status_history
CREATE TABLE IF NOT EXISTS public.document_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  old_status text,
  new_status text,
  changed_by uuid,
  remarks text,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_status_history TO authenticated;
GRANT ALL ON public.document_status_history TO service_role;
ALTER TABLE public.document_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "doc status history all" ON public.document_status_history;
CREATE POLICY "doc status history all" ON public.document_status_history FOR ALL TO authenticated
  USING (((project_id IS NULL) AND (company_id = public.current_company_id())) OR public.project_in_company(project_id))
  WITH CHECK (((project_id IS NULL) AND (company_id = public.current_company_id())) OR public.project_in_company(project_id));
CREATE INDEX IF NOT EXISTS idx_doc_status_hist_doc ON public.document_status_history(document_id);
