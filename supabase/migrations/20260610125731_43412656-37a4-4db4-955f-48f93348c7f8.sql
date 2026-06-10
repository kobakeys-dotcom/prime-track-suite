
ALTER TYPE report_status ADD VALUE IF NOT EXISTS 'under_review';
ALTER TYPE report_status ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE report_status ADD VALUE IF NOT EXISTS 'revision_requested';
ALTER TYPE report_status ADD VALUE IF NOT EXISTS 'archived';

ALTER TABLE public.daily_reports
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS revision_notes text,
  ADD COLUMN IF NOT EXISTS is_client_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS site_condition text,
  ADD COLUMN IF NOT EXISTS shift text,
  ADD COLUMN IF NOT EXISTS working_hours text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS safety_notes text,
  ADD COLUMN IF NOT EXISTS quality_notes text,
  ADD COLUMN IF NOT EXISTS visitors text,
  ADD COLUMN IF NOT EXISTS instructions_received text,
  ADD COLUMN IF NOT EXISTS report_number text;
