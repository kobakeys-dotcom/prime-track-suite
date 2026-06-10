
-- Generic audit trigger for key tables
CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_company_id UUID;
  v_user UUID := auth.uid();
  v_project UUID;
BEGIN
  BEGIN
    v_project := COALESCE((to_jsonb(NEW)->>'project_id')::uuid, (to_jsonb(OLD)->>'project_id')::uuid);
  EXCEPTION WHEN OTHERS THEN v_project := NULL;
  END;
  IF v_project IS NOT NULL THEN
    SELECT company_id INTO v_company_id FROM public.projects WHERE id = v_project;
  END IF;
  IF v_company_id IS NULL AND v_user IS NOT NULL THEN
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = v_user;
  END IF;
  INSERT INTO public.audit_logs (company_id, project_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_company_id, v_project, v_user, lower(TG_OP),
    TG_TABLE_NAME,
    COALESCE((to_jsonb(NEW)->>'id')::uuid, (to_jsonb(OLD)->>'id')::uuid),
    jsonb_build_object('table', TG_TABLE_NAME, 'op', TG_OP)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'variations','payment_claims','procurement_requests','purchase_orders','rfqs',
    'ncrs','quality_inspections','safety_inspections','snags','approvals','rfis','submittals'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I;', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();',
      t, t
    );
  END LOOP;
END$$;

-- Auto-create approval rows when financial/procurement items are submitted
CREATE OR REPLACE FUNCTION public.auto_create_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_title TEXT;
  v_amount NUMERIC;
  v_company UUID;
BEGIN
  IF NEW.status IS DISTINCT FROM 'submitted' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'submitted' THEN RETURN NEW; END IF;

  SELECT company_id INTO v_company FROM public.projects WHERE id = NEW.project_id;

  IF TG_TABLE_NAME = 'variations' THEN
    v_title := COALESCE(NEW.number, 'VAR') || ' — ' || COALESCE(NEW.title, 'Variation');
    v_amount := NEW.amount;
  ELSIF TG_TABLE_NAME = 'payment_claims' THEN
    v_title := COALESCE(NEW.claim_number, 'IPA') || ' — Payment Claim';
    v_amount := COALESCE(NEW.net_amount, NEW.gross_amount, 0);
  ELSIF TG_TABLE_NAME = 'procurement_requests' THEN
    v_title := COALESCE(NEW.request_number, 'PR') || ' — Procurement Request';
    v_amount := NEW.estimated_cost;
  ELSE
    RETURN NEW;
  END IF;

  -- Avoid duplicates
  IF EXISTS (SELECT 1 FROM public.approvals WHERE entity_type = TG_TABLE_NAME AND entity_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.approvals (company_id, project_id, entity_type, entity_id, title, amount, status, requested_by, requested_at)
  VALUES (v_company, NEW.project_id, TG_TABLE_NAME, NEW.id, v_title, v_amount, 'submitted', auth.uid(), now());

  RETURN NEW;
END;
$$;

DO $$
DECLARE t TEXT; tables TEXT[] := ARRAY['variations','payment_claims','procurement_requests'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_auto_approval_%I ON public.%I;', t, t);
    EXECUTE format('CREATE TRIGGER trg_auto_approval_%I AFTER INSERT OR UPDATE OF status ON public.%I FOR EACH ROW EXECUTE FUNCTION public.auto_create_approval();', t, t);
  END LOOP;
END$$;
