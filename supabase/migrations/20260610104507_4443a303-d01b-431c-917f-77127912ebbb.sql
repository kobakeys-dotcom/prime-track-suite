
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
    v_title := COALESCE(NEW.variation_number, 'VAR') || ' — ' || COALESCE(NEW.title, 'Variation');
    v_amount := COALESCE(NEW.approved_amount, NEW.cost_impact);
  ELSIF TG_TABLE_NAME = 'payment_claims' THEN
    v_title := COALESCE(NEW.claim_number, 'IPA') || ' — Payment Claim';
    v_amount := COALESCE(NEW.net_claim, NEW.gross_claim, 0);
  ELSIF TG_TABLE_NAME = 'procurement_requests' THEN
    v_title := COALESCE(NEW.request_number, 'PR') || ' — ' || COALESCE(NEW.material_name, 'Procurement Request');
    v_amount := NULL;
  ELSE
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.approvals WHERE entity_type = TG_TABLE_NAME AND entity_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.approvals (company_id, project_id, entity_type, entity_id, title, amount, status, requested_by, requested_at)
  VALUES (v_company, NEW.project_id, TG_TABLE_NAME, NEW.id, v_title, v_amount, 'submitted', auth.uid(), now());

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.auto_create_approval() FROM PUBLIC, anon, authenticated;
