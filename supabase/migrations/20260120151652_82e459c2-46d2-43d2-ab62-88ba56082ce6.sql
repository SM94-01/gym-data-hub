-- Drop the user_roles table and related functions/policies
-- First drop the policies that depend on has_role function
DROP POLICY IF EXISTS "Admins can manage allowed emails" ON public.allowed_emails;

-- Drop the user_roles table (this will also drop its policies)
DROP TABLE IF EXISTS public.user_roles;

-- Drop the has_role function
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);

-- Drop the app_role enum type
DROP TYPE IF EXISTS public.app_role;