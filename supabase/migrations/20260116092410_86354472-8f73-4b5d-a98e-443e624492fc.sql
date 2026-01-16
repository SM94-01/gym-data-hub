-- Add RLS policy for allowed_emails table
-- No one can read directly, only through the security definer function
-- But we need a policy for admins to manage the table

-- First, create a simple deny-all policy for now (the function bypasses RLS)
CREATE POLICY "No direct access to allowed_emails"
ON public.allowed_emails
FOR ALL
USING (false);