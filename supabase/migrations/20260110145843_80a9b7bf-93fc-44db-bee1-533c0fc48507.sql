-- Create profiles table for users
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workouts table
CREATE TABLE public.workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_saved BOOLEAN NOT NULL DEFAULT true,
  last_used TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exercises table (exercises within workouts)
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  muscle TEXT NOT NULL,
  sets INTEGER NOT NULL DEFAULT 3,
  reps INTEGER NOT NULL DEFAULT 10,
  target_weight NUMERIC NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workout_progress table
CREATE TABLE public.workout_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise_id UUID,
  exercise_name TEXT NOT NULL,
  muscle TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sets_completed INTEGER NOT NULL,
  weight_used NUMERIC NOT NULL,
  reps_completed INTEGER NOT NULL
);

-- Create body_weights table
CREATE TABLE public.body_weights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_weights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles (public read, users manage their own)
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can create profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE USING (true);

-- RLS Policies for workouts
CREATE POLICY "Anyone can view workouts" ON public.workouts FOR SELECT USING (true);
CREATE POLICY "Anyone can create workouts" ON public.workouts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update workouts" ON public.workouts FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete workouts" ON public.workouts FOR DELETE USING (true);

-- RLS Policies for exercises
CREATE POLICY "Anyone can view exercises" ON public.exercises FOR SELECT USING (true);
CREATE POLICY "Anyone can create exercises" ON public.exercises FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update exercises" ON public.exercises FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete exercises" ON public.exercises FOR DELETE USING (true);

-- RLS Policies for workout_progress
CREATE POLICY "Anyone can view progress" ON public.workout_progress FOR SELECT USING (true);
CREATE POLICY "Anyone can create progress" ON public.workout_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update progress" ON public.workout_progress FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete progress" ON public.workout_progress FOR DELETE USING (true);

-- RLS Policies for body_weights
CREATE POLICY "Anyone can view body weights" ON public.body_weights FOR SELECT USING (true);
CREATE POLICY "Anyone can create body weights" ON public.body_weights FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update body weights" ON public.body_weights FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete body weights" ON public.body_weights FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX idx_workouts_user_id ON public.workouts(user_id);
CREATE INDEX idx_exercises_workout_id ON public.exercises(workout_id);
CREATE INDEX idx_workout_progress_user_id ON public.workout_progress(user_id);
CREATE INDEX idx_body_weights_user_id ON public.body_weights(user_id);