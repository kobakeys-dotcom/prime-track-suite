
-- Extend suppliers table
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS supplier_code text,
  ADD COLUMN IF NOT EXISTS supplier_name text,
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS supplier_type text DEFAULT 'Material Supplier',
  ADD COLUMN IF NOT EXISTS trade text,
  ADD COLUMN IF NOT EXISTS discipline text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS tax_number text,
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS contact_designation text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS delivery_terms text,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'MVR',
  ADD COLUMN IF NOT EXISTS credit_limit numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS performance_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quality_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS response_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_prequalified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_preferred boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_blacklisted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS blacklist_reason text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Backfill supplier_name from name
UPDATE public.suppliers SET supplier_name = name WHERE supplier_name IS NULL;

-- supplier_contacts
CREATE TABLE IF NOT EXISTS public.supplier_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  contact_name text NOT NULL,
  designation text,
  department text,
  email text,
  phone text,
  mobile text,
  is_primary boolean DEFAULT false,
  remarks text,
  created_by uuid,
  is_archived boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_contacts TO authenticated;
GRANT ALL ON public.supplier_contacts TO service_role;
ALTER TABLE public.supplier_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co manage supplier_contacts" ON public.supplier_contacts
  FOR ALL USING (company_id = current_company_id())
  WITH CHECK (company_id = current_company_id());
CREATE TRIGGER trg_supplier_contacts_updated BEFORE UPDATE ON public.supplier_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- supplier_documents
CREATE TABLE IF NOT EXISTS public.supplier_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  uploaded_by uuid,
  document_name text NOT NULL,
  document_type text DEFAULT 'General',
  document_number text,
  issue_date date,
  expiry_date date,
  file_name text,
  file_url text,
  file_type text,
  status text DEFAULT 'Valid',
  remarks text,
  is_archived boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_documents TO authenticated;
GRANT ALL ON public.supplier_documents TO service_role;
ALTER TABLE public.supplier_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co manage supplier_documents" ON public.supplier_documents
  FOR ALL USING (company_id = current_company_id())
  WITH CHECK (company_id = current_company_id());
CREATE TRIGGER trg_supplier_documents_updated BEFORE UPDATE ON public.supplier_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- supplier_performance_reviews
CREATE TABLE IF NOT EXISTS public.supplier_performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  project_id uuid,
  review_date date DEFAULT CURRENT_DATE,
  reviewed_by uuid,
  quality_score numeric DEFAULT 0,
  delivery_score numeric DEFAULT 0,
  price_score numeric DEFAULT 0,
  response_score numeric DEFAULT 0,
  overall_score numeric DEFAULT 0,
  comments text,
  recommendation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_performance_reviews TO authenticated;
GRANT ALL ON public.supplier_performance_reviews TO service_role;
ALTER TABLE public.supplier_performance_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co manage supplier_perf" ON public.supplier_performance_reviews
  FOR ALL USING (company_id = current_company_id())
  WITH CHECK (company_id = current_company_id());
CREATE TRIGGER trg_supplier_perf_updated BEFORE UPDATE ON public.supplier_performance_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- supplier_attachments
CREATE TABLE IF NOT EXISTS public.supplier_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  uploaded_by uuid,
  file_name text,
  file_url text,
  file_type text,
  description text,
  attachment_type text DEFAULT 'Supplier File',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_attachments TO authenticated;
GRANT ALL ON public.supplier_attachments TO service_role;
ALTER TABLE public.supplier_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co manage supplier_attachments" ON public.supplier_attachments
  FOR ALL USING (company_id = current_company_id())
  WITH CHECK (company_id = current_company_id());

-- supplier_comments
CREATE TABLE IF NOT EXISTS public.supplier_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  user_id uuid,
  comment text NOT NULL,
  visibility text DEFAULT 'internal',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_comments TO authenticated;
GRANT ALL ON public.supplier_comments TO service_role;
ALTER TABLE public.supplier_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co manage supplier_comments" ON public.supplier_comments
  FOR ALL USING (company_id = current_company_id())
  WITH CHECK (company_id = current_company_id());

-- supplier_status_history
CREATE TABLE IF NOT EXISTS public.supplier_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  old_status text,
  new_status text,
  changed_by uuid,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_status_history TO authenticated;
GRANT ALL ON public.supplier_status_history TO service_role;
ALTER TABLE public.supplier_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co manage supplier_status_history" ON public.supplier_status_history
  FOR ALL USING (company_id = current_company_id())
  WITH CHECK (company_id = current_company_id());
