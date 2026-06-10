
-- Extend deliveries table
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS delivery_number text,
  ADD COLUMN IF NOT EXISTS delivery_title text,
  ADD COLUMN IF NOT EXISTS material_request_id uuid,
  ADD COLUMN IF NOT EXISTS rfq_id uuid,
  ADD COLUMN IF NOT EXISTS supplier_id uuid,
  ADD COLUMN IF NOT EXISTS supplier_name text,
  ADD COLUMN IF NOT EXISTS supplier_contact text,
  ADD COLUMN IF NOT EXISTS delivery_note_number text,
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS vehicle_number text,
  ADD COLUMN IF NOT EXISTS driver_name text,
  ADD COLUMN IF NOT EXISTS driver_phone text,
  ADD COLUMN IF NOT EXISTS delivery_time time,
  ADD COLUMN IF NOT EXISTS inspected_by uuid,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS delivery_location text,
  ADD COLUMN IF NOT EXISTS storage_location text,
  ADD COLUMN IF NOT EXISTS inspection_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS delivery_condition text DEFAULT 'good',
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS inspected_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_amount numeric DEFAULT 0;

-- Backfill company_id from project
UPDATE public.deliveries d SET company_id = p.company_id
  FROM public.projects p WHERE d.project_id = p.id AND d.company_id IS NULL;

-- delivery_items
CREATE TABLE IF NOT EXISTS public.delivery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  delivery_id uuid NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  purchase_order_item_id uuid,
  material_request_item_id uuid,
  material_id uuid,
  boq_item_id uuid,
  cost_code_id uuid,
  wbs_id uuid,
  task_id uuid,
  item_code text,
  item_name text NOT NULL,
  description text,
  specification text,
  unit text NOT NULL DEFAULT 'Nos',
  ordered_quantity numeric DEFAULT 0,
  previously_delivered_quantity numeric DEFAULT 0,
  delivered_quantity numeric DEFAULT 0,
  accepted_quantity numeric DEFAULT 0,
  rejected_quantity numeric DEFAULT 0,
  damaged_quantity numeric DEFAULT 0,
  balance_quantity numeric DEFAULT 0,
  unit_rate numeric DEFAULT 0,
  delivered_amount numeric DEFAULT 0,
  batch_number text,
  serial_number text,
  expiry_date date,
  condition text DEFAULT 'good',
  inspection_result text DEFAULT 'pending',
  storage_location text,
  remarks text,
  created_by uuid,
  is_archived boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_items TO authenticated;
GRANT ALL ON public.delivery_items TO service_role;
ALTER TABLE public.delivery_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_items company access" ON public.delivery_items
  FOR ALL USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE INDEX IF NOT EXISTS idx_delivery_items_delivery ON public.delivery_items(delivery_id);

-- delivery_attachments
CREATE TABLE IF NOT EXISTS public.delivery_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  delivery_id uuid NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  uploaded_by uuid,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  description text,
  attachment_type text DEFAULT 'Delivery Document',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_attachments TO authenticated;
GRANT ALL ON public.delivery_attachments TO service_role;
ALTER TABLE public.delivery_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_attachments company access" ON public.delivery_attachments
  FOR ALL USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

-- delivery_status_history
CREATE TABLE IF NOT EXISTS public.delivery_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  delivery_id uuid NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_status_history TO authenticated;
GRANT ALL ON public.delivery_status_history TO service_role;
ALTER TABLE public.delivery_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_status_history company access" ON public.delivery_status_history
  FOR ALL USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

-- stock_movements
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid,
  material_id uuid,
  delivery_id uuid,
  movement_type text DEFAULT 'IN',
  movement_date date DEFAULT CURRENT_DATE,
  quantity numeric DEFAULT 0,
  unit text,
  reference_number text,
  remarks text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_movements company access" ON public.stock_movements
  FOR ALL USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

-- triggers for updated_at
DROP TRIGGER IF EXISTS trg_delivery_items_updated ON public.delivery_items;
CREATE TRIGGER trg_delivery_items_updated BEFORE UPDATE ON public.delivery_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Ensure RLS policy on deliveries supports company access (in case missing)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='deliveries' AND policyname='deliveries company access') THEN
    EXECUTE 'CREATE POLICY "deliveries company access" ON public.deliveries FOR ALL USING (company_id = public.current_company_id() OR public.project_in_company(project_id)) WITH CHECK (company_id = public.current_company_id() OR public.project_in_company(project_id))';
  END IF;
END $$;
