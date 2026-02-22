
-- Add cardio fields to exercises table
ALTER TABLE public.exercises ADD COLUMN is_cardio boolean NOT NULL DEFAULT false;
ALTER TABLE public.exercises ADD COLUMN avg_speed numeric;
ALTER TABLE public.exercises ADD COLUMN avg_incline numeric;
ALTER TABLE public.exercises ADD COLUMN avg_bpm numeric;

-- Add per-set reps to exercises table
ALTER TABLE public.exercises ADD COLUMN reps_per_set jsonb;

-- Create workout_sessions table for tracking duration
CREATE TABLE public.workout_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workout_name TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_seconds INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.workout_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.workout_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON public.workout_sessions FOR DELETE USING (auth.uid() = user_id);
