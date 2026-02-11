
-- 1. Function to check if user is a personal trainer
CREATE OR REPLACE FUNCTION public.is_personal_trainer(_user_id uuid)
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
      AND ae.notes ILIKE '%Personal Trainer%'
  )
$$;

-- 2. Function to get user ID by email (for trainer to find clients)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE LOWER(email) = LOWER(_email) LIMIT 1
$$;

-- 3. Create trainer_clients table
CREATE TABLE public.trainer_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL,
  client_id uuid NOT NULL,
  client_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(trainer_id, client_id)
);

ALTER TABLE public.trainer_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view their clients"
  ON public.trainer_clients FOR SELECT
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can add clients"
  ON public.trainer_clients FOR INSERT
  WITH CHECK (trainer_id = auth.uid() AND public.is_personal_trainer(auth.uid()));

CREATE POLICY "Trainers can remove clients"
  ON public.trainer_clients FOR DELETE
  USING (trainer_id = auth.uid());

-- 4. Function to check if current user is trainer of a given client
CREATE OR REPLACE FUNCTION public.is_trainer_of(_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trainer_clients
    WHERE trainer_id = auth.uid()
      AND client_id = _client_id
  )
$$;

-- 5. Update RLS on workouts to allow trainer access
DROP POLICY IF EXISTS "Users can view their own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can insert their own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can update their own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can delete their own workouts" ON public.workouts;

CREATE POLICY "Users can view their own workouts"
  ON public.workouts FOR SELECT
  USING (user_id = auth.uid() OR public.is_trainer_of(user_id));

CREATE POLICY "Users can insert their own workouts"
  ON public.workouts FOR INSERT
  WITH CHECK (user_id = auth.uid() OR public.is_trainer_of(user_id));

CREATE POLICY "Users can update their own workouts"
  ON public.workouts FOR UPDATE
  USING (user_id = auth.uid() OR public.is_trainer_of(user_id));

CREATE POLICY "Users can delete their own workouts"
  ON public.workouts FOR DELETE
  USING (user_id = auth.uid() OR public.is_trainer_of(user_id));

-- 6. Update RLS on exercises
DROP POLICY IF EXISTS "Users can view exercises of their workouts" ON public.exercises;
DROP POLICY IF EXISTS "Users can insert exercises to their workouts" ON public.exercises;
DROP POLICY IF EXISTS "Users can update exercises of their workouts" ON public.exercises;
DROP POLICY IF EXISTS "Users can delete exercises of their workouts" ON public.exercises;

CREATE POLICY "Users can view exercises of their workouts"
  ON public.exercises FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workouts
    WHERE workouts.id = exercises.workout_id
      AND (workouts.user_id = auth.uid() OR public.is_trainer_of(workouts.user_id))
  ));

CREATE POLICY "Users can insert exercises to their workouts"
  ON public.exercises FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM workouts
    WHERE workouts.id = exercises.workout_id
      AND (workouts.user_id = auth.uid() OR public.is_trainer_of(workouts.user_id))
  ));

CREATE POLICY "Users can update exercises of their workouts"
  ON public.exercises FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM workouts
    WHERE workouts.id = exercises.workout_id
      AND (workouts.user_id = auth.uid() OR public.is_trainer_of(workouts.user_id))
  ));

CREATE POLICY "Users can delete exercises of their workouts"
  ON public.exercises FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM workouts
    WHERE workouts.id = exercises.workout_id
      AND (workouts.user_id = auth.uid() OR public.is_trainer_of(workouts.user_id))
  ));

-- 7. Update RLS on workout_progress (PT can view, only user can insert/update/delete)
DROP POLICY IF EXISTS "Users can view their own progress" ON public.workout_progress;
DROP POLICY IF EXISTS "Users can insert their own progress" ON public.workout_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON public.workout_progress;
DROP POLICY IF EXISTS "Users can delete their own progress" ON public.workout_progress;

CREATE POLICY "Users can view their own progress"
  ON public.workout_progress FOR SELECT
  USING (user_id = auth.uid() OR public.is_trainer_of(user_id));

CREATE POLICY "Users can insert their own progress"
  ON public.workout_progress FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own progress"
  ON public.workout_progress FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own progress"
  ON public.workout_progress FOR DELETE
  USING (user_id = auth.uid());

-- 8. Allow trainer to view client profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_trainer_of(id));

-- 9. Allow trainer to view client body weights
DROP POLICY IF EXISTS "Users can view their own body weights" ON public.body_weights;
CREATE POLICY "Users can view their own body weights"
  ON public.body_weights FOR SELECT
  USING (user_id = auth.uid() OR public.is_trainer_of(user_id));
