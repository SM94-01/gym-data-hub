-- Add notes column to workout_progress table
ALTER TABLE public.workout_progress ADD COLUMN notes TEXT DEFAULT NULL;