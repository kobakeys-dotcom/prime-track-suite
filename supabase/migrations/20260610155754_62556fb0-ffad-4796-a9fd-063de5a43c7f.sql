
-- ============= purchase_orders: add columns =============
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS po_title text,
  ADD COLUMN IF NOT EXISTS supplier_name text,
  ADD COLUMN IF NOT EXISTS supplier_email text,
  ADD COLUMN IF NOT EXISTS supplier_phone text,
  ADD COLUMN IF NOT EXISTS contact_person text,
  ADD COLUMN IF NOT EXISTS material_request_id uuid,
  ADD COLUMN IF NOT EXISTS rfq_id uuid,
  ADD COLUMN IF NOT EXISTS supplier_quotation_id uuid,
  ADD COLUMN IF NOT EXISTS prepared_by uuid,
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS issued_by uuid,
  ADD COLUMN IF NOT EXISTS po_date date DEFAULT current_date,
  ADD COLUMN IF NOT EXISTS required_delivery_date date,
  ADD COLUMN IF NOT EXISTS expected_delivery_date date,
  ADD COLUMN IF NOT EXISTS delivery_location text,
  ADD COLUMN IF NOT EXISTS subtotal_amount numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_percentage numeric(6,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_amount numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_charges numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoiced_amount numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outstanding_amount numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS delivery_terms text,
  ADD COLUMN IF NOT EXISTS warranty_terms text,
  ADD COLUMN IF NOT EXISTS terms_and_conditions text,
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'not_submitted',
  ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS revision_notes text,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- relax NOT NULL on legacy po_number (we generate one)
ALTER TABLE public.purchase_orders ALTER COLUMN po_number DROP NOT NULL;

-- backfill company_id from project
UPDATE public.purchase_orders po
  SET company_id = p.company_id
FROM public.projects p
WHERE po.project_id = p.id AND po.company_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_po_project ON public.purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_po_company ON public.purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON public.purchase_orders(supplier_id);

-- ============= purchase_order_items =============
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  material_request_item_id uuid,
  rfq_item_id uuid,
  supplier_quotation_item_id uuid,
  boq_item_id uuid,
  cost_code_id uuid,
  budget_line_id uuid,
  wbs_id uuid,
  task_id uuid,
  item_code text,
  item_name text NOT NULL,
  description text,
  specification text,
  unit text NOT NULL DEFAULT 'Nos',
  ordered_quantity numeric(14,3) DEFAULT 0,
  delivered_quantity numeric(14,3) DEFAULT 0,
  received_quantity numeric(14,3) DEFAULT 0,
  balance_quantity numeric(14,3) DEFAULT 0,
  unit_rate numeric(14,4) DEFAULT 0,
  amount numeric(14,2) DEFAULT 0,
  discount_amount numeric(14,2) DEFAULT 0,
  tax_amount numeric(14,2) DEFAULT 0,
  total_amount numeric(14,2) DEFAULT 0,
  delivery_status text DEFAULT 'pending',
  remarks text,
  created_by uuid,
  is_archived boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_items TO authenticated;
GRANT ALL ON public.purchase_order_items TO service_role;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage purchase_order_items"
  ON public.purchase_order_items FOR ALL
  USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE TRIGGER trg_poitems_updated BEFORE UPDATE ON public.purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX IF NOT EXISTS idx_poi_po ON public.purchase_order_items(purchase_order_id);

-- ============= purchase_order_attachments =============
CREATE TABLE IF NOT EXISTS public.purchase_order_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  uploaded_by uuid,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  description text,
  attachment_type text DEFAULT 'po_document',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_attachments TO authenticated;
GRANT ALL ON public.purchase_order_attachments TO service_role;
ALTER TABLE public.purchase_order_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage po_attachments"
  ON public.purchase_order_attachments FOR ALL
  USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE INDEX IF NOT EXISTS idx_poa_po ON public.purchase_order_attachments(purchase_order_id);

-- ============= purchase_order_status_history =============
CREATE TABLE IF NOT EXISTS public.purchase_order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  old_status text,
  new_status text,
  changed_by uuid,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_status_history TO authenticated;
GRANT ALL ON public.purchase_order_status_history TO service_role;
ALTER TABLE public.purchase_order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage po_status_history"
  ON public.purchase_order_status_history FOR ALL
  USING (public.project_in_company(project_id))
  WITH CHECK (public.project_in_company(project_id));
CREATE INDEX IF NOT EXISTS idx_posh_po ON public.purchase_order_status_history(purchase_order_id);
