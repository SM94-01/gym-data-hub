
-- =============================================
-- INVITATIONS TABLE
-- =============================================
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL,
  invitee_email TEXT NOT NULL,
  invitation_type TEXT NOT NULL DEFAULT 'client',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inviters can view their invitations"
ON public.invitations FOR SELECT
USING (inviter_id = auth.uid());

CREATE POLICY "Inviters can create invitations"
ON public.invitations FOR INSERT
WITH CHECK (inviter_id = auth.uid());

CREATE POLICY "Inviters can delete their invitations"
ON public.invitations FOR DELETE
USING (inviter_id = auth.uid());

-- =============================================
-- GYM_MEMBERS TABLE
-- =============================================
CREATE TABLE public.gym_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL,
  member_id UUID,
  member_email TEXT NOT NULL,
  member_role TEXT NOT NULL DEFAULT 'utente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (gym_id, member_email)
);

ALTER TABLE public.gym_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gyms can view their members"
ON public.gym_members FOR SELECT
USING (gym_id = auth.uid() OR member_id = auth.uid());

CREATE POLICY "Gyms can add members"
ON public.gym_members FOR INSERT
WITH CHECK (gym_id = auth.uid());

CREATE POLICY "Gyms can remove members"
ON public.gym_members FOR DELETE
USING (gym_id = auth.uid());

CREATE POLICY "Gyms can update members"
ON public.gym_members FOR UPDATE
USING (gym_id = auth.uid());

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ae.role
  FROM public.allowed_emails ae
  JOIN auth.users u ON LOWER(u.email) = LOWER(ae.email)
  WHERE u.id = _user_id
  LIMIT 1
$$;

-- Check if user is a gym
CREATE OR REPLACE FUNCTION public.is_gym(_user_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.allowed_emails ae
    JOIN auth.users u ON LOWER(u.email) = LOWER(ae.email)
    WHERE u.id = _user_id
      AND ae.role IN ('Palestra Starter', 'Palestra Pro', 'Palestra Elite')
  )
$$;

-- Get invite limits and usage for a user
CREATE OR REPLACE FUNCTION public.get_invite_limits(_user_id UUID)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'role', ae.role::text,
    'client_limit', CASE
      WHEN ae.role = 'Personal Trainer Starter' THEN 5
      WHEN ae.role = 'Personal Trainer Pro' THEN 15
      WHEN ae.role = 'Personal Trainer Elite' THEN 40
      ELSE 0
    END,
    'client_used', (SELECT COUNT(*)::int FROM public.invitations WHERE inviter_id = _user_id AND invitation_type = 'client'),
    'pt_limit', CASE
      WHEN ae.role = 'Palestra Starter' THEN 3
      WHEN ae.role = 'Palestra Pro' THEN 10
      WHEN ae.role = 'Palestra Elite' THEN 25
      ELSE 0
    END,
    'pt_used', (SELECT COUNT(*)::int FROM public.invitations WHERE inviter_id = _user_id AND invitation_type = 'gym_pt'),
    'user_limit', CASE
      WHEN ae.role = 'Palestra Starter' THEN 50
      WHEN ae.role = 'Palestra Pro' THEN 150
      WHEN ae.role = 'Palestra Elite' THEN 500
      ELSE 0
    END,
    'user_used', (SELECT COUNT(*)::int FROM public.invitations WHERE inviter_id = _user_id AND invitation_type = 'gym_user')
  )
  FROM public.allowed_emails ae
  JOIN auth.users u ON LOWER(u.email) = LOWER(ae.email)
  WHERE u.id = _user_id
  LIMIT 1
$$;

-- =============================================
-- UPDATE handle_new_user TO PROCESS INVITATIONS
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inv RECORD;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'name', 'Utente'));
  
  -- Process pending invitations for this email
  FOR inv IN 
    SELECT * FROM public.invitations 
    WHERE LOWER(invitee_email) = LOWER(new.email) 
    AND status = 'pending'
  LOOP
    IF inv.invitation_type = 'client' THEN
      INSERT INTO public.trainer_clients (trainer_id, client_id, client_email)
      VALUES (inv.inviter_id, new.id, LOWER(new.email))
      ON CONFLICT DO NOTHING;
    ELSIF inv.invitation_type = 'gym_pt' THEN
      INSERT INTO public.gym_members (gym_id, member_id, member_email, member_role)
      VALUES (inv.inviter_id, new.id, LOWER(new.email), 'personal_trainer')
      ON CONFLICT (gym_id, member_email) DO UPDATE SET member_id = new.id;
    ELSIF inv.invitation_type = 'gym_user' THEN
      INSERT INTO public.gym_members (gym_id, member_id, member_email, member_role)
      VALUES (inv.inviter_id, new.id, LOWER(new.email), 'utente')
      ON CONFLICT (gym_id, member_email) DO UPDATE SET member_id = new.id;
    END IF;
    
    UPDATE public.invitations SET status = 'accepted' WHERE id = inv.id;
  END LOOP;
  
  RETURN new;
END;
$$;
