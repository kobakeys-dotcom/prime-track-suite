
CREATE POLICY "company_files_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-files'
    AND (storage.foldername(name))[1] = (public.current_company_id())::text
  );

CREATE POLICY "company_files_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-files'
    AND (storage.foldername(name))[1] = (public.current_company_id())::text
  );

CREATE POLICY "company_files_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-files'
    AND (storage.foldername(name))[1] = (public.current_company_id())::text
  );
