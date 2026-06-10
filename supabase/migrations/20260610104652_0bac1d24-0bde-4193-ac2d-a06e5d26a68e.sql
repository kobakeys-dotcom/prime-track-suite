
CREATE OR REPLACE FUNCTION public.auto_create_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_title TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM 'submitted' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'submitted' THEN RETURN NEW; END IF;

  IF TG_TABLE_NAME = 'variations' THEN
    v_title := COALESCE(NEW.variation_number, 'VAR') || ' — ' || COALESCE(NEW.title, 'Variation');
  ELSIF TG_TABLE_NAME = 'payment_claims' THEN
    v_title := COALESCE(NEW.claim_number, 'IPA') || ' — Payment Claim';
  ELSIF TG_TABLE_NAME = 'procurement_requests' THEN
    v_title := COALESCE(NEW.request_number, 'PR') || ' — ' || COALESCE(NEW.material_name, 'Procurement Request');
  ELSE
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.approvals WHERE entity_type = TG_TABLE_NAME AND entity_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.approvals (project_id, entity_type, entity_id, title, status, requested_by)
  VALUES (NEW.project_id, TG_TABLE_NAME, NEW.id, v_title, 'submitted', auth.uid());

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.auto_create_approval() FROM PUBLIC, anon, authenticated;
