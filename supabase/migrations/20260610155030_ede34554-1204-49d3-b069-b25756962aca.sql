
-- Extend rfqs
ALTER TABLE public.rfqs
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS material_request_id uuid,
  ADD COLUMN IF NOT EXISTS rfq_title text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS requested_by uuid,
  ADD COLUMN IF NOT EXISTS prepared_by uuid,
  ADD COLUMN IF NOT EXISTS issued_by uuid,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS quotation_deadline date,
  ADD COLUMN IF NOT EXISTS required_delivery_date date,
  ADD COLUMN IF NOT EXISTS delivery_location text,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS award_status text DEFAULT 'not_awarded',
  ADD COLUMN IF NOT EXISTS recommended_supplier_id uuid,
  ADD COLUMN IF NOT EXISTS selected_supplier_id uuid,
  ADD COLUMN IF NOT EXISTS selected_quotation_id uuid,
  ADD COLUMN IF NOT EXISTS selected_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'MVR',
  ADD COLUMN IF NOT EXISTS terms_and_conditions text,
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS revision_notes text,
  ADD COLUMN IF NOT EXISTS converted_to_po boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS purchase_order_id uuid,
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- backfill company_id from project
UPDATE public.rfqs r SET company_id = p.company_id
  FROM public.projects p WHERE r.project_id = p.id AND r.company_id IS NULL;

-- RFQ items
CREATE TABLE IF NOT EXISTS public.rfq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  material_request_item_id uuid,
  boq_item_id uuid,
  cost_code_id uuid,
  wbs_id uuid,
  task_id uuid,
  item_code text,
  item_name text NOT NULL,
  description text,
  specification text,
  unit text NOT NULL DEFAULT 'Nos',
  quantity numeric NOT NULL DEFAULT 0,
  estimated_rate numeric NOT NULL DEFAULT 0,
  estimated_amount numeric NOT NULL DEFAULT 0,
  required_delivery_date date,
  remarks text,
  created_by uuid,
  is_archived boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfq_items TO authenticated;
GRANT ALL ON public.rfq_items TO service_role;
ALTER TABLE public.rfq_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage rfq_items" ON public.rfq_items
  FOR ALL USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE TRIGGER trg_rfq_items_updated BEFORE UPDATE ON public.rfq_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RFQ suppliers
CREATE TABLE IF NOT EXISTS public.rfq_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  supplier_id uuid,
  supplier_name text,
  supplier_email text,
  supplier_phone text,
  contact_person text,
  invitation_status text DEFAULT 'pending',
  quotation_status text DEFAULT 'not_received',
  invited_at timestamptz,
  responded_at timestamptz,
  total_quoted_amount numeric DEFAULT 0,
  currency text DEFAULT 'MVR',
  delivery_days integer,
  payment_terms text,
  validity_days integer,
  remarks text,
  is_recommended boolean DEFAULT false,
  is_selected boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfq_suppliers TO authenticated;
GRANT ALL ON public.rfq_suppliers TO service_role;
ALTER TABLE public.rfq_suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage rfq_suppliers" ON public.rfq_suppliers
  FOR ALL USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE TRIGGER trg_rfq_suppliers_updated BEFORE UPDATE ON public.rfq_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- supplier_quotations
CREATE TABLE IF NOT EXISTS public.supplier_quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  rfq_supplier_id uuid NOT NULL REFERENCES public.rfq_suppliers(id) ON DELETE CASCADE,
  supplier_id uuid,
  quotation_number text,
  quotation_date date,
  quotation_valid_until date,
  total_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  net_amount numeric DEFAULT 0,
  currency text DEFAULT 'MVR',
  delivery_days integer,
  payment_terms text,
  warranty_terms text,
  status text DEFAULT 'received',
  is_selected boolean DEFAULT false,
  evaluation_score numeric DEFAULT 0,
  evaluation_notes text,
  created_by uuid,
  is_archived boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_quotations TO authenticated;
GRANT ALL ON public.supplier_quotations TO service_role;
ALTER TABLE public.supplier_quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage supplier_quotations" ON public.supplier_quotations
  FOR ALL USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE TRIGGER trg_supplier_quotations_updated BEFORE UPDATE ON public.supplier_quotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- supplier_quotation_items
CREATE TABLE IF NOT EXISTS public.supplier_quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supplier_quotation_id uuid NOT NULL REFERENCES public.supplier_quotations(id) ON DELETE CASCADE,
  rfq_item_id uuid,
  item_name text NOT NULL,
  description text,
  unit text,
  quantity numeric DEFAULT 0,
  quoted_rate numeric DEFAULT 0,
  quoted_amount numeric DEFAULT 0,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_quotation_items TO authenticated;
GRANT ALL ON public.supplier_quotation_items TO service_role;
ALTER TABLE public.supplier_quotation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage sq_items" ON public.supplier_quotation_items
  FOR ALL USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE TRIGGER trg_sq_items_updated BEFORE UPDATE ON public.supplier_quotation_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- rfq attachments
CREATE TABLE IF NOT EXISTS public.rfq_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  supplier_quotation_id uuid,
  uploaded_by uuid,
  file_name text,
  file_url text,
  file_type text,
  description text,
  attachment_type text DEFAULT 'RFQ Document',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfq_attachments TO authenticated;
GRANT ALL ON public.rfq_attachments TO service_role;
ALTER TABLE public.rfq_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage rfq_attachments" ON public.rfq_attachments
  FOR ALL USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));

-- rfq status history
CREATE TABLE IF NOT EXISTS public.rfq_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  old_status text,
  new_status text,
  changed_by uuid,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfq_status_history TO authenticated;
GRANT ALL ON public.rfq_status_history TO service_role;
ALTER TABLE public.rfq_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage rfq_status_history" ON public.rfq_status_history
  FOR ALL USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
