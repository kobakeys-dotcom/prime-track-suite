
-- AI Conversations
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  conversation_title TEXT,
  conversation_type TEXT NOT NULL DEFAULT 'Project Assistant',
  context_module TEXT,
  context_record_id UUID,
  visibility TEXT NOT NULL DEFAULT 'private',
  status TEXT NOT NULL DEFAULT 'Active',
  last_message_at TIMESTAMPTZ,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated;
GRANT ALL ON public.ai_conversations TO service_role;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_conversations_company_access" ON public.ai_conversations FOR ALL
  USING (company_id = public.current_company_id() AND (visibility != 'private' OR user_id = auth.uid() OR public.has_role(auth.uid(), 'company_admin')))
  WITH CHECK (company_id = public.current_company_id() AND user_id = auth.uid());
CREATE TRIGGER ai_conversations_updated_at BEFORE UPDATE ON public.ai_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX IF NOT EXISTS idx_ai_conv_company ON public.ai_conversations(company_id, user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_ai_conv_project ON public.ai_conversations(project_id);

-- AI Messages
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id UUID,
  role TEXT NOT NULL,
  message_text TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  context_module TEXT,
  context_record_id UUID,
  ai_model TEXT,
  token_count INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  status TEXT NOT NULL DEFAULT 'Completed',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO authenticated;
GRANT ALL ON public.ai_messages TO service_role;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_messages_company_access" ON public.ai_messages FOR ALL
  USING (company_id = public.current_company_id() AND EXISTS (SELECT 1 FROM public.ai_conversations c WHERE c.id = conversation_id AND (c.user_id = auth.uid() OR c.visibility != 'private' OR public.has_role(auth.uid(), 'company_admin'))))
  WITH CHECK (company_id = public.current_company_id());
CREATE INDEX IF NOT EXISTS idx_ai_msg_conv ON public.ai_messages(conversation_id, created_at);

-- AI Prompt Templates
CREATE TABLE IF NOT EXISTS public.ai_prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_category TEXT NOT NULL DEFAULT 'General',
  template_description TEXT,
  prompt_text TEXT NOT NULL,
  required_context TEXT[],
  output_type TEXT NOT NULL DEFAULT 'Text',
  is_system_template BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_prompt_templates TO authenticated;
GRANT ALL ON public.ai_prompt_templates TO service_role;
ALTER TABLE public.ai_prompt_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_templates_read" ON public.ai_prompt_templates FOR SELECT
  USING (is_system_template = true OR company_id = public.current_company_id());
CREATE POLICY "ai_templates_write" ON public.ai_prompt_templates FOR INSERT
  WITH CHECK (company_id = public.current_company_id() AND is_system_template = false);
CREATE POLICY "ai_templates_update" ON public.ai_prompt_templates FOR UPDATE
  USING (company_id = public.current_company_id() AND is_system_template = false);
CREATE POLICY "ai_templates_delete" ON public.ai_prompt_templates FOR DELETE
  USING (company_id = public.current_company_id() AND is_system_template = false);
CREATE TRIGGER ai_templates_updated_at BEFORE UPDATE ON public.ai_prompt_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- AI Saved Outputs
CREATE TABLE IF NOT EXISTS public.ai_saved_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.ai_messages(id) ON DELETE SET NULL,
  output_title TEXT NOT NULL,
  output_type TEXT NOT NULL DEFAULT 'Summary',
  output_text TEXT NOT NULL,
  context_module TEXT,
  context_record_id UUID,
  saved_by UUID,
  is_client_visible BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'Saved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_saved_outputs TO authenticated;
GRANT ALL ON public.ai_saved_outputs TO service_role;
ALTER TABLE public.ai_saved_outputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_outputs_company_access" ON public.ai_saved_outputs FOR ALL
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE TRIGGER ai_outputs_updated_at BEFORE UPDATE ON public.ai_saved_outputs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX IF NOT EXISTS idx_ai_outputs_project ON public.ai_saved_outputs(company_id, project_id);

-- AI Feedback
CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.ai_messages(id) ON DELETE CASCADE,
  user_id UUID,
  rating TEXT,
  feedback_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_feedback TO authenticated;
GRANT ALL ON public.ai_feedback TO service_role;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_feedback_company" ON public.ai_feedback FOR ALL
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

-- Seed system prompt templates
INSERT INTO public.ai_prompt_templates (template_name, template_category, template_description, prompt_text, output_type, is_system_template, required_context) VALUES
('Project Summary', 'Summary', 'Comprehensive project status summary for management', 'Summarize the selected project using only the available project data. Include progress, delays, risks, procurement, quality, safety, commercial status, and recommended next actions.', 'Summary', true, ARRAY['project']),
('Executive Summary', 'Summary', 'Concise summary for executive management', 'Prepare a concise executive summary for management based on the selected project data. Highlight major achievements, concerns, decisions required, and next steps.', 'Executive Summary', true, ARRAY['project']),
('Client-Friendly Summary', 'Summary', 'Client-safe progress update', 'Prepare a client-friendly project update using only client-visible data. Avoid internal cost, payroll, supplier pricing, confidential comments, and internal-only issues.', 'Client Summary', true, ARRAY['project']),
('Delay Analysis', 'Analysis', 'Analyze delays from overdue items', 'Analyze the project delay based on overdue tasks, milestones, RFIs, submittals, procurement, manpower, equipment, risks, and issues. Do not invent causes not supported by data.', 'Delay Analysis', true, ARRAY['project']),
('Cost Analysis', 'Analysis', 'Commercial status analysis (restricted)', 'Analyze project commercial status using budget, actual cost, variations, payment claims, and cash flow data. Only include financial data if user has permission.', 'Cost Analysis', true, ARRAY['project','cost']),
('Procurement Summary', 'Summary', 'Procurement status summary', 'Summarize procurement status including material requests, RFQs, purchase orders, deliveries, suppliers, delays, and pending actions.', 'Procurement Summary', true, ARRAY['project']),
('Quality Summary', 'Summary', 'Quality status', 'Summarize quality status including inspections, failed items, NCRs, corrective actions, and recurring problems.', 'Quality Summary', true, ARRAY['project']),
('Safety Summary', 'Summary', 'Safety status', 'Summarize safety status including inspections, hazards, unsafe findings, corrective actions, and critical risks.', 'Safety Summary', true, ARRAY['project']),
('Risk Summary', 'Summary', 'Risk register summary', 'Summarize the risk register focusing on high and critical risks, overdue mitigation actions, escalations, and recommended responses.', 'Risk Summary', true, ARRAY['project']),
('RFI Draft', 'Draft', 'Draft a professional RFI', 'Draft a professional RFI using the selected project context. Include subject, background, clarification required, reference records, and required response date.', 'RFI Draft', true, ARRAY['project']),
('Variation Draft', 'Draft', 'Draft variation narrative', 'Draft a variation narrative using the selected context. Include reason, scope change, cost/time impact if available, references, and requested approval. Do not invent amounts.', 'Variation Draft', true, ARRAY['project']),
('Payment Claim Narrative', 'Draft', 'Draft payment claim explanation', 'Draft a professional payment claim explanation using available IPC/payment claim data. Include submitted amount, certified amount, outstanding amount, and status if available.', 'Payment Claim Narrative', true, ARRAY['project','cost']),
('Meeting Summary', 'Summary', 'Summarize meeting minutes', 'Summarize meeting minutes, extract decisions, action items, responsible persons, and due dates.', 'Meeting Summary', true, ARRAY['project']),
('Action Plan', 'Plan', 'Generate action plan', 'Create a practical action plan from the selected data. Include action, responsible person, priority, due date if available, and expected outcome.', 'Action Plan', true, ARRAY['project'])
ON CONFLICT DO NOTHING;
