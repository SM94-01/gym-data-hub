
-- Drop existing RLS policies
DROP POLICY IF EXISTS "Anyone can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Anyone can create body weights" ON public.body_weights;
DROP POLICY IF EXISTS "Anyone can delete body weights" ON public.body_weights;
DROP POLICY IF EXISTS "Anyone can update body weights" ON public.body_weights;
DROP POLICY IF EXISTS "Anyone can view body weights" ON public.body_weights;

DROP POLICY IF EXISTS "Anyone can create exercises" ON public.exercises;
DROP POLICY IF EXISTS "Anyone can delete exercises" ON public.exercises;
DROP POLICY IF EXISTS "Anyone can update exercises" ON public.exercises;
DROP POLICY IF EXISTS "Anyone can view exercises" ON public.exercises;

DROP POLICY IF EXISTS "Anyone can create progress" ON public.workout_progress;
DROP POLICY IF EXISTS "Anyone can delete progress" ON public.workout_progress;
DROP POLICY IF EXISTS "Anyone can update progress" ON public.workout_progress;
DROP POLICY IF EXISTS "Anyone can view progress" ON public.workout_progress;

DROP POLICY IF EXISTS "Anyone can create workouts" ON public.workouts;
DROP POLICY IF EXISTS "Anyone can delete workouts" ON public.workouts;
DROP POLICY IF EXISTS "Anyone can update workouts" ON public.workouts;
DROP POLICY IF EXISTS "Anyone can view workouts" ON public.workouts;

-- Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Create new secure RLS policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can delete their own profile"
ON public.profiles FOR DELETE
TO authenticated
USING (id = auth.uid());

-- Create secure RLS policies for body_weights
CREATE POLICY "Users can view their own body weights"
ON public.body_weights FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own body weights"
ON public.body_weights FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own body weights"
ON public.body_weights FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own body weights"
ON public.body_weights FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Create secure RLS policies for workouts
CREATE POLICY "Users can view their own workouts"
ON public.workouts FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own workouts"
ON public.workouts FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own workouts"
ON public.workouts FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own workouts"
ON public.workouts FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Create secure RLS policies for workout_progress
CREATE POLICY "Users can view their own progress"
ON public.workout_progress FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own progress"
ON public.workout_progress FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own progress"
ON public.workout_progress FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own progress"
ON public.workout_progress FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Create secure RLS policies for exercises (through workouts)
CREATE POLICY "Users can view exercises of their workouts"
ON public.exercises FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.workouts 
  WHERE workouts.id = exercises.workout_id 
  AND workouts.user_id = auth.uid()
));

CREATE POLICY "Users can insert exercises to their workouts"
ON public.exercises FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.workouts 
  WHERE workouts.id = exercises.workout_id 
  AND workouts.user_id = auth.uid()
));

CREATE POLICY "Users can update exercises of their workouts"
ON public.exercises FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.workouts 
  WHERE workouts.id = exercises.workout_id 
  AND workouts.user_id = auth.uid()
));

CREATE POLICY "Users can delete exercises of their workouts"
ON public.exercises FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.workouts 
  WHERE workouts.id = exercises.workout_id 
  AND workouts.user_id = auth.uid()
));

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'name', 'Utente'), new.email);
  RETURN new;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
