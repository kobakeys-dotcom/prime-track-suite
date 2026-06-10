
ALTER TABLE public.payment_claims
  ADD COLUMN IF NOT EXISTS claim_type text DEFAULT 'Interim Payment Claim',
  ADD COLUMN IF NOT EXISTS claim_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS certified_by uuid,
  ADD COLUMN IF NOT EXISTS paid_by uuid,
  ADD COLUMN IF NOT EXISTS client_approved_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS certified_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS previous_certified_amount numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_claim_value numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retention_percentage numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_claim_amount numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS submitted_amount numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS certified_amount numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outstanding_amount numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'MVR',
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS revision_notes text,
  ADD COLUMN IF NOT EXISTS review_comments text,
  ADD COLUMN IF NOT EXISTS certification_comments text,
  ADD COLUMN IF NOT EXISTS is_client_visible boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_payment_claims_project ON public.payment_claims(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_claims_status ON public.payment_claims(status);

-- Items
CREATE TABLE IF NOT EXISTS public.payment_claim_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  payment_claim_id uuid NOT NULL REFERENCES public.payment_claims(id) ON DELETE CASCADE,
  boq_item_id uuid REFERENCES public.boq_items(id) ON DELETE SET NULL,
  cost_code_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  item_type text DEFAULT 'BOQ',
  description text NOT NULL,
  unit text,
  contract_quantity numeric(14,3) DEFAULT 0,
  rate numeric(14,4) DEFAULT 0,
  contract_amount numeric(14,2) DEFAULT 0,
  previous_quantity numeric(14,3) DEFAULT 0,
  current_quantity numeric(14,3) DEFAULT 0,
  cumulative_quantity numeric(14,3) DEFAULT 0,
  certified_quantity numeric(14,3) DEFAULT 0,
  balance_quantity numeric(14,3) DEFAULT 0,
  previous_amount numeric(14,2) DEFAULT 0,
  current_amount numeric(14,2) DEFAULT 0,
  cumulative_amount numeric(14,2) DEFAULT 0,
  certified_amount numeric(14,2) DEFAULT 0,
  progress_percentage numeric(5,2) DEFAULT 0,
  remarks text,
  sort_order integer DEFAULT 0,
  created_by uuid,
  is_archived boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_claim_items TO authenticated;
GRANT ALL ON public.payment_claim_items TO service_role;
ALTER TABLE public.payment_claim_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage payment_claim_items" ON public.payment_claim_items
  FOR ALL USING (public.project_in_company(project_id)) WITH CHECK (public.project_in_company(project_id));
CREATE INDEX IF NOT EXISTS idx_pci_claim ON public.payment_claim_items(payment_claim_id);
CREATE TRIGGER trg_pci_updated BEFORE UPDATE ON public.payment_claim_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Variations
CREATE TABLE IF NOT EXISTS public.payment_claim_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  payment_claim_id uuid NOT NULL REFERENCES public.payment_claims(id) ON DELETE CASCADE,
  variation_id uuid NOT NULL REFERENCES public.variations(id) ON DELETE CASCADE,
  variation_number text,
  description text,
  approved_amount numeric(14,2) DEFAULT 0,
  claimed_amount numeric(14,2) DEFAULT 0,
  certified_amount numeric(14,2) DEFAULT 0,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_claim_variations TO authenticated;
GRANT ALL ON public.payment_claim_variations TO service_role;
ALTER TABLE public.payment_claim_variations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage payment_claim_variations" ON public.payment_claim_variations
  FOR ALL USING (public.project_in_company(project_id)) WITH CHECK (public.project_in_company(project_id));
CREATE INDEX IF NOT EXISTS idx_pcv_claim ON public.payment_claim_variations(payment_claim_id);

-- Attachments
CREATE TABLE IF NOT EXISTS public.payment_claim_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  payment_claim_id uuid NOT NULL REFERENCES public.payment_claims(id) ON DELETE CASCADE,
  uploaded_by uuid,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  description text,
  attachment_type text DEFAULT 'Supporting Document',
  is_client_visible boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_claim_attachments TO authenticated;
GRANT ALL ON public.payment_claim_attachments TO service_role;
ALTER TABLE public.payment_claim_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage payment_claim_attachments" ON public.payment_claim_attachments
  FOR ALL USING (public.project_in_company(project_id)) WITH CHECK (public.project_in_company(project_id));

-- Status history
CREATE TABLE IF NOT EXISTS public.payment_claim_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  payment_claim_id uuid NOT NULL REFERENCES public.payment_claims(id) ON DELETE CASCADE,
  old_status text,
  new_status text,
  changed_by uuid,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_claim_status_history TO authenticated;
GRANT ALL ON public.payment_claim_status_history TO service_role;
ALTER TABLE public.payment_claim_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage payment_claim_status_history" ON public.payment_claim_status_history
  FOR ALL USING (public.project_in_company(project_id)) WITH CHECK (public.project_in_company(project_id));
