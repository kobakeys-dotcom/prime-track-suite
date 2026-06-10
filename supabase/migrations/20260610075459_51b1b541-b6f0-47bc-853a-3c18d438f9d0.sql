CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('projectcore-daily-cron')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'projectcore-daily-cron');

SELECT cron.schedule(
  'projectcore-daily-cron',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--46b02db4-757c-49e2-802a-debd4a425003.lovable.app/api/public/cron/daily',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlcmZ5Z29kYnRxcm5ocnpvcnl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MDUxMjksImV4cCI6MjA5NjQ4MTEyOX0.x406o1X3SrGh6QdfsiDoDo5Hzf4YyogSoh71KPoJ0PM"}'::jsonb,
    body := '{"source":"pg_cron"}'::jsonb
  );
  $$
);