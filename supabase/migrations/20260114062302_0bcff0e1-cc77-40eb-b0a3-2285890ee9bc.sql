-- Add sets_data column to store individual set details as JSON
ALTER TABLE public.workout_progress ADD COLUMN sets_data JSONB DEFAULT NULL;