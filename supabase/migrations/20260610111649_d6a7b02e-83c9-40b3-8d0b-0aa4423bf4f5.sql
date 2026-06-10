
CREATE OR REPLACE FUNCTION public.auto_create_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  ELSIF TG_TABLE_NAME = 'rfis' THEN
    v_title := COALESCE(NEW.rfi_number, 'RFI') || ' — ' || COALESCE(NEW.subject, 'RFI');
  ELSIF TG_TABLE_NAME = 'submittals' THEN
    v_title := COALESCE(NEW.submittal_number, 'SUB') || ' — ' || COALESCE(NEW.title, 'Submittal');
  ELSIF TG_TABLE_NAME = 'purchase_orders' THEN
    v_title := COALESCE(NEW.po_number, 'PO') || ' — Purchase Order';
  ELSIF TG_TABLE_NAME = 'quality_inspections' THEN
    v_title := COALESCE(NEW.inspection_number, 'QI') || ' — Quality Inspection';
  ELSIF TG_TABLE_NAME = 'safety_inspections' THEN
    v_title := COALESCE(NEW.inspection_number, 'SI') || ' — Safety Inspection';
  ELSIF TG_TABLE_NAME = 'ncrs' THEN
    v_title := COALESCE(NEW.ncr_number, 'NCR') || ' — Non-Conformance';
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
$function$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['rfis','submittals','purchase_orders','quality_inspections','safety_inspections','ncrs']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_auto_approval_%I ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_auto_approval_%I AFTER INSERT OR UPDATE OF status ON public.%I FOR EACH ROW EXECUTE FUNCTION public.auto_create_approval()', t, t);
  END LOOP;
END $$;
