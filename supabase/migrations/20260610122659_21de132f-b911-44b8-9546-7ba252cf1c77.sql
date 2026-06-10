
-- Fix: audit_logs INSERT must be scoped to actor + company
DROP POLICY IF EXISTS "audit insert" ON public.audit_logs;
CREATE POLICY "audit insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND (company_id IS NULL OR company_id = public.current_company_id())
  );

-- Fix: comments read must be company-scoped via related project
DROP POLICY IF EXISTS "comments read company" ON public.comments;
CREATE POLICY "comments read company" ON public.comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.company_id = public.current_company_id()
        AND (
          p.id::text = comments.entity_id::text
          OR EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema = 'public' AND c.table_name = comments.entity_type
          )
        )
    )
    OR author_id = auth.uid()
  );

-- Simpler/safer: allow reads when author is self OR entity belongs to a project in same company.
-- Replace with cleaner version:
DROP POLICY IF EXISTS "comments read company" ON public.comments;
CREATE POLICY "comments read company" ON public.comments
  FOR SELECT TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = comments.entity_id
        AND p.company_id = public.current_company_id()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      JOIN public.projects p ON p.id = pm.project_id
      WHERE pm.user_id = auth.uid()
        AND p.company_id = public.current_company_id()
    )
  );

-- Fix: project_members writes require manager/admin role
DROP POLICY IF EXISTS "pm all" ON public.project_members;
CREATE POLICY "pm select" ON public.project_members
  FOR SELECT TO authenticated
  USING (public.project_in_company(project_id));
CREATE POLICY "pm write" ON public.project_members
  FOR ALL TO authenticated
  USING (
    public.project_in_company(project_id)
    AND (
      public.has_role(auth.uid(), 'company_admin')
      OR public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'project_director')
      OR public.has_role(auth.uid(), 'project_manager')
    )
  )
  WITH CHECK (
    public.project_in_company(project_id)
    AND (
      public.has_role(auth.uid(), 'company_admin')
      OR public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'project_director')
      OR public.has_role(auth.uid(), 'project_manager')
    )
  );

-- Fix: projects UPDATE require privileged role
DROP POLICY IF EXISTS "company update projects" ON public.projects;
CREATE POLICY "company update projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    company_id = public.current_company_id()
    AND (
      public.has_role(auth.uid(), 'company_admin')
      OR public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'project_director')
      OR public.has_role(auth.uid(), 'project_manager')
    )
  )
  WITH CHECK (
    company_id = public.current_company_id()
  );

-- Fix: add UPDATE policy for storage.objects on project-files bucket
DROP POLICY IF EXISTS "project-files update" ON storage.objects;
CREATE POLICY "project-files update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-files'
    AND (storage.foldername(name))[1] = public.current_company_id()::text
  )
  WITH CHECK (
    bucket_id = 'project-files'
    AND (storage.foldername(name))[1] = public.current_company_id()::text
  );
