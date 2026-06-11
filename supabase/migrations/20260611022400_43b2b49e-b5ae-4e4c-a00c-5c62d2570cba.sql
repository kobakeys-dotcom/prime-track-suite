
-- Extend notifications
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS notification_type text NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS module_name text,
  ADD COLUMN IF NOT EXISTS record_id uuid,
  ADD COLUMN IF NOT EXISTS record_number text,
  ADD COLUMN IF NOT EXISTS action_url text,
  ADD COLUMN IF NOT EXISTS action_label text,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_channel text NOT NULL DEFAULT 'In-App',
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS email_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill message from body where needed
UPDATE public.notifications SET message = COALESCE(message, body, title) WHERE message IS NULL;
ALTER TABLE public.notifications ALTER COLUMN message SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, is_archived, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_project ON public.notifications(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON public.notifications(company_id);

DROP TRIGGER IF EXISTS trg_notifications_updated ON public.notifications;
CREATE TRIGGER trg_notifications_updated BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Allow authenticated service code (server fns) to insert notifications for users in their company.
-- Existing policy "notif own" covers select/update/delete of own rows.
DROP POLICY IF EXISTS "notif insert in company" ON public.notifications;
CREATE POLICY "notif insert in company" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR company_id = public.current_company_id()
    OR company_id IS NULL
  );

-- Extend preferences
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS push_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS digest_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS digest_frequency text NOT NULL DEFAULT 'Daily',
  ADD COLUMN IF NOT EXISTS quiet_hours_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiet_hours_start time,
  ADD COLUMN IF NOT EXISTS quiet_hours_end time,
  ADD COLUMN IF NOT EXISTS module_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS type_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  module_name text,
  notification_type text NOT NULL DEFAULT 'General',
  title_template text NOT NULL,
  message_template text NOT NULL,
  priority text NOT NULL DEFAULT 'Medium',
  action_label text,
  is_system_template boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_templates TO authenticated;
GRANT ALL ON public.notification_templates TO service_role;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tmpl read in company or system" ON public.notification_templates;
CREATE POLICY "tmpl read in company or system" ON public.notification_templates
  FOR SELECT TO authenticated
  USING (is_system_template OR company_id = public.current_company_id());

DROP POLICY IF EXISTS "tmpl admin manage" ON public.notification_templates;
CREATE POLICY "tmpl admin manage" ON public.notification_templates
  FOR ALL TO authenticated
  USING (
    company_id = public.current_company_id()
    AND public.has_role(auth.uid(), 'company_admin')
  )
  WITH CHECK (
    company_id = public.current_company_id()
    AND public.has_role(auth.uid(), 'company_admin')
  );

DROP TRIGGER IF EXISTS trg_ntmpl_updated ON public.notification_templates;
CREATE TRIGGER trg_ntmpl_updated BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Rules
CREATE TABLE IF NOT EXISTS public.notification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  module_name text NOT NULL,
  event_name text NOT NULL,
  notification_type text NOT NULL DEFAULT 'General',
  priority text NOT NULL DEFAULT 'Medium',
  recipient_roles text[],
  recipient_users uuid[],
  trigger_condition jsonb,
  delay_minutes integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_rules TO authenticated;
GRANT ALL ON public.notification_rules TO service_role;
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rule admin manage" ON public.notification_rules;
CREATE POLICY "rule admin manage" ON public.notification_rules
  FOR ALL TO authenticated
  USING (
    company_id = public.current_company_id()
    AND public.has_role(auth.uid(), 'company_admin')
  )
  WITH CHECK (
    company_id = public.current_company_id()
    AND public.has_role(auth.uid(), 'company_admin')
  );

DROP TRIGGER IF EXISTS trg_nrule_updated ON public.notification_rules;
CREATE TRIGGER trg_nrule_updated BEFORE UPDATE ON public.notification_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed a few system templates (idempotent)
INSERT INTO public.notification_templates (template_name, module_name, notification_type, title_template, message_template, priority, action_label, is_system_template)
SELECT * FROM (VALUES
  ('Task Assigned','tasks','Assignment','New task assigned: {{record_title}}','You have been assigned a task in {{project_name}}. Due date: {{due_date}}.','Medium','Open task',true),
  ('Task Overdue','tasks','Overdue','Overdue task: {{record_title}}','{{record_title}} is overdue since {{due_date}}.','High','Open task',true),
  ('Approval Required','approvals','Approval Request','Approval required: {{record_title}}','A new approval request is waiting for your action in {{project_name}}.','High','Open approval',true),
  ('Approval Approved','approvals','Approval Approved','Approved: {{record_title}}','Your request {{record_title}} has been approved.','Medium','Open record',true),
  ('Approval Rejected','approvals','Approval Rejected','Rejected: {{record_title}}','Your request {{record_title}} has been rejected.','High','Open record',true),
  ('Comment Added','comments','Comment','New comment on {{record_title}}','{{created_by}} commented on {{record_title}} in {{project_name}}.','Low','Open record',true),
  ('Document Expiring','documents','Document Expiry','Document expiring soon: {{record_title}}','{{record_title}} will expire on {{due_date}}.','High','Open document',true),
  ('Payment Reminder','payment_claims','Payment Reminder','Payment reminder: {{record_number}}','Payment claim {{record_number}} requires follow-up. Status: {{status}}.','Medium','Open claim',true),
  ('Critical Risk','risks','Risk Alert','Critical risk alert: {{record_title}}','A critical risk has been identified in {{project_name}}. Immediate review required.','Critical','Open risk',true),
  ('Safety Critical','safety_inspections','Safety Alert','Safety critical: {{record_title}}','Critical safety issue identified in {{project_name}}.','Critical','Open inspection',true)
) AS v(template_name, module_name, notification_type, title_template, message_template, priority, action_label, is_system_template)
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates t
  WHERE t.is_system_template = true AND t.template_name = v.template_name
);
