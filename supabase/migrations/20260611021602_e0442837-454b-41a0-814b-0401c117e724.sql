
ALTER TABLE public.report_templates
  ADD COLUMN IF NOT EXISTS ai_prompt TEXT,
  ADD COLUMN IF NOT EXISTS ai_generated_config JSONB,
  ADD COLUMN IF NOT EXISTS ai_summary_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_insights_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.saved_reports
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_insights TEXT,
  ADD COLUMN IF NOT EXISTS ai_recommendations TEXT,
  ADD COLUMN IF NOT EXISTS ai_narrative TEXT,
  ADD COLUMN IF NOT EXISTS kpi_data JSONB;

CREATE TABLE IF NOT EXISTS public.custom_report_ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  project_id UUID,
  user_id UUID,
  prompt_text TEXT NOT NULL,
  interpreted_module TEXT,
  interpreted_filters JSONB,
  interpreted_columns JSONB,
  interpreted_chart_config JSONB,
  ai_response TEXT,
  generated_report_id UUID REFERENCES public.saved_reports(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Completed',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_report_ai_prompts TO authenticated;
GRANT ALL ON public.custom_report_ai_prompts TO service_role;
ALTER TABLE public.custom_report_ai_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crap_company_access" ON public.custom_report_ai_prompts FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

CREATE INDEX IF NOT EXISTS idx_crap_company ON public.custom_report_ai_prompts(company_id, created_at DESC);
