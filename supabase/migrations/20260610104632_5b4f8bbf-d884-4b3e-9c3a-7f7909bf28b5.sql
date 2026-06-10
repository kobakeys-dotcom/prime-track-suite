
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
  INSERT INTO public.audit_logs (company_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_company_id, v_user, lower(TG_OP),
    TG_TABLE_NAME,
    COALESCE((to_jsonb(NEW)->>'id')::uuid, (to_jsonb(OLD)->>'id')::uuid),
    jsonb_build_object('table', TG_TABLE_NAME, 'op', TG_OP, 'project_id', v_project)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.audit_row_change() FROM PUBLIC, anon, authenticated;
