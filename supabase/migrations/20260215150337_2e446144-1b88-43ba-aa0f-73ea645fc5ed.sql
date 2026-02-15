
-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule daily subscription reminder at 9:00 AM UTC
SELECT cron.schedule(
  'daily-subscription-reminder',
  '0 9 * * *',
  $$
  SELECT extensions.http(
    (
      'POST',
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/subscription-reminder',
      ARRAY[
        extensions.http_header('Content-Type', 'application/json'),
        extensions.http_header('Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key' LIMIT 1))
      ],
      'application/json',
      '{}'
    )::extensions.http_request
  );
  $$
);
