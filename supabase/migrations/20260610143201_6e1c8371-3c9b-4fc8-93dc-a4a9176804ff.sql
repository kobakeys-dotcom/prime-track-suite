
-- Extend variations table
ALTER TABLE public.variations 
  ADD COLUMN IF NOT EXISTS variation_type text DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS instruction_reference text,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS client_approved_by uuid,
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_amount numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejected_amount numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_amount numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS submitted_days numeric(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_impact_description text,
  ADD COLUMN IF NOT EXISTS time_impact_description text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS revision_notes text,
  ADD COLUMN IF NOT EXISTS review_comments text,
  ADD COLUMN IF NOT EXISTS approval_comments text,
  ADD COLUMN IF NOT EXISTS linked_rfi_id uuid,
  ADD COLUMN IF NOT EXISTS linked_drawing_id uuid,
  ADD COLUMN IF NOT EXISTS linked_document_id uuid,
  ADD COLUMN IF NOT EXISTS linked_task_id uuid,
  ADD COLUMN IF NOT EXISTS linked_wbs_id uuid,
  ADD COLUMN IF NOT EXISTS linked_boq_item_id uuid,
  ADD COLUMN IF NOT EXISTS payment_claim_id uuid,
  ADD COLUMN IF NOT EXISTS included_in_payment_claim boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_client_visible boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Make variation_number generated automatically (nullable for new inserts that auto-generate)
ALTER TABLE public.variations ALTER COLUMN variation_number DROP NOT NULL;

-- Line items table
CREATE TABLE IF NOT EXISTS public.variation_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  variation_id uuid NOT NULL REFERENCES public.variations(id) ON DELETE CASCADE,
  boq_item_id uuid,
  cost_code_id uuid,
  description text NOT NULL,
  unit text,
  quantity numeric(14,3) DEFAULT 0,
  rate numeric(14,2) DEFAULT 0,
  amount numeric(14,2) DEFAULT 0,
  approved_quantity numeric(14,3) DEFAULT 0,
  approved_rate numeric(14,2) DEFAULT 0,
  approved_amount numeric(14,2) DEFAULT 0,
  item_type text DEFAULT 'Addition',
  remarks text,
  created_by uuid,
  is_archived boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.variation_line_items TO authenticated;
GRANT ALL ON public.variation_line_items TO service_role;
ALTER TABLE public.variation_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "co members manage variation_line_items" ON public.variation_line_items;
CREATE POLICY "co members manage variation_line_items" ON public.variation_line_items
  FOR ALL USING (project_in_company(project_id)) WITH CHECK (project_in_company(project_id));
DROP TRIGGER IF EXISTS trg_variation_line_items_updated ON public.variation_line_items;
CREATE TRIGGER trg_variation_line_items_updated BEFORE UPDATE ON public.variation_line_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Attachments table
CREATE TABLE IF NOT EXISTS public.variation_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  variation_id uuid NOT NULL REFERENCES public.variations(id) ON DELETE CASCADE,
  uploaded_by uuid,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  description text,
  attachment_type text DEFAULT 'Supporting Document',
  is_client_visible boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.variation_attachments TO authenticated;
GRANT ALL ON public.variation_attachments TO service_role;
ALTER TABLE public.variation_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "co members manage variation_attachments" ON public.variation_attachments;
CREATE POLICY "co members manage variation_attachments" ON public.variation_attachments
  FOR ALL USING (project_in_company(project_id)) WITH CHECK (project_in_company(project_id));

CREATE INDEX IF NOT EXISTS idx_variation_line_items_variation ON public.variation_line_items(variation_id);
CREATE INDEX IF NOT EXISTS idx_variation_attachments_variation ON public.variation_attachments(variation_id);
CREATE INDEX IF NOT EXISTS idx_variations_project_status ON public.variations(project_id, status) WHERE is_archived = false;
