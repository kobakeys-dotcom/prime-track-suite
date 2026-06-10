
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS meeting_number text,
  ADD COLUMN IF NOT EXISTS meeting_type text DEFAULT 'Project Meeting',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Scheduled',
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS meeting_mode text DEFAULT 'In Person',
  ADD COLUMN IF NOT EXISTS meeting_link text,
  ADD COLUMN IF NOT EXISTS end_time timestamptz,
  ADD COLUMN IF NOT EXISTS chairperson_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS prepared_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS next_meeting_date date,
  ADD COLUMN IF NOT EXISTS is_client_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS meetings_project_idx ON public.meetings(project_id, meeting_date DESC);

ALTER TABLE public.meeting_action_items
  ADD COLUMN IF NOT EXISTS action_number text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS progress_percentage numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_date date,
  ADD COLUMN IF NOT EXISTS completion_notes text,
  ADD COLUMN IF NOT EXISTS linked_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS mai_assignee_idx ON public.meeting_action_items(responsible_person, status);
CREATE INDEX IF NOT EXISTS mai_meeting_idx ON public.meeting_action_items(meeting_id);
