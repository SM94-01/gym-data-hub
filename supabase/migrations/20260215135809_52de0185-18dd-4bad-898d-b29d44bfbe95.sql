
-- Create is_admin helper function using text cast to avoid enum commit issue
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.allowed_emails ae
    JOIN auth.users u ON LOWER(u.email) = LOWER(ae.email)
    WHERE u.id = _user_id
      AND ae.role::text = 'Admin'
  );
END;
$$;
