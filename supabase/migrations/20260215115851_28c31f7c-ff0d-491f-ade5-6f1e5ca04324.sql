
-- Create enum for user roles
CREATE TYPE public.app_user_role AS ENUM (
  'Utente',
  'Personal Trainer Starter',
  'Personal Trainer Pro',
  'Personal Trainer Elite',
  'Palestra Starter',
  'Palestra Pro',
  'Palestra Elite'
);

-- Add role column to allowed_emails
ALTER TABLE public.allowed_emails
ADD COLUMN role public.app_user_role NOT NULL DEFAULT 'Utente';

-- Populate role from existing notes
UPDATE public.allowed_emails
SET role = CASE
  WHEN notes ILIKE '%Personal Trainer%' THEN 'Personal Trainer Starter'::public.app_user_role
  ELSE 'Utente'::public.app_user_role
END;

-- Update is_personal_trainer to check role instead of notes
CREATE OR REPLACE FUNCTION public.is_personal_trainer(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.allowed_emails ae
    JOIN auth.users u ON LOWER(u.email) = LOWER(ae.email)
    WHERE u.id = _user_id
      AND ae.role IN ('Personal Trainer Starter', 'Personal Trainer Pro', 'Personal Trainer Elite')
  )
$$;
