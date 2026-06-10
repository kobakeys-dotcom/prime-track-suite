
-- Extend procurement_requests (Material Requests)
ALTER TABLE public.procurement_requests
  ADD COLUMN IF NOT EXISTS request_title text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS site_location text,
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS revision_notes text,
  ADD COLUMN IF NOT EXISTS procurement_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS converted_to_rfq boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS converted_to_po boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rfq_id uuid REFERENCES public.rfqs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_client_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS company_id uuid;

UPDATE public.procurement_requests pr
   SET company_id = p.company_id
  FROM public.projects p
 WHERE pr.project_id = p.id AND pr.company_id IS NULL;

-- Material request items
CREATE TABLE IF NOT EXISTS public.material_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  material_request_id uuid NOT NULL REFERENCES public.procurement_requests(id) ON DELETE CASCADE,
  boq_item_id uuid REFERENCES public.boq_items(id) ON DELETE SET NULL,
  cost_code_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  wbs_id uuid REFERENCES public.wbs_items(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  item_code text,
  material_name text NOT NULL,
  description text,
  specification text,
  unit text NOT NULL DEFAULT 'Nos',
  requested_quantity numeric(14,3) NOT NULL DEFAULT 0,
  approved_quantity numeric(14,3) NOT NULL DEFAULT 0,
  ordered_quantity numeric(14,3) NOT NULL DEFAULT 0,
  delivered_quantity numeric(14,3) NOT NULL DEFAULT 0,
  balance_quantity numeric(14,3) NOT NULL DEFAULT 0,
  estimated_rate numeric(14,2) NOT NULL DEFAULT 0,
  estimated_amount numeric(14,2) NOT NULL DEFAULT 0,
  approved_rate numeric(14,2) NOT NULL DEFAULT 0,
  approved_amount numeric(14,2) NOT NULL DEFAULT 0,
  supplier_suggestion text,
  required_date date,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'pending',
  remarks text,
  created_by uuid REFERENCES auth.users(id),
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_request_items TO authenticated;
GRANT ALL ON public.material_request_items TO service_role;
ALTER TABLE public.material_request_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage mr items" ON public.material_request_items
  FOR ALL USING (project_in_company(project_id)) WITH CHECK (project_in_company(project_id));
CREATE TRIGGER trg_mri_updated BEFORE UPDATE ON public.material_request_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX IF NOT EXISTS idx_mri_request ON public.material_request_items(material_request_id);

-- Attachments
CREATE TABLE IF NOT EXISTS public.material_request_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  material_request_id uuid NOT NULL REFERENCES public.procurement_requests(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES auth.users(id),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  description text,
  attachment_type text NOT NULL DEFAULT 'Supporting Document',
  is_client_visible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_request_attachments TO authenticated;
GRANT ALL ON public.material_request_attachments TO service_role;
ALTER TABLE public.material_request_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members manage mr attachments" ON public.material_request_attachments
  FOR ALL USING (project_in_company(project_id)) WITH CHECK (project_in_company(project_id));

-- Status history
CREATE TABLE IF NOT EXISTS public.material_request_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  material_request_id uuid NOT NULL REFERENCES public.procurement_requests(id) ON DELETE CASCADE,
  old_status text,
  new_status text,
  changed_by uuid REFERENCES auth.users(id),
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_request_status_history TO authenticated;
GRANT ALL ON public.material_request_status_history TO service_role;
ALTER TABLE public.material_request_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members view mr history" ON public.material_request_status_history
  FOR ALL USING (project_in_company(project_id)) WITH CHECK (project_in_company(project_id));
