-- Add superset columns to exercises table
ALTER TABLE public.exercises
ADD COLUMN IF NOT EXISTS is_superset boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS exercise2_name text,
ADD COLUMN IF NOT EXISTS muscle2 text,
ADD COLUMN IF NOT EXISTS reps2 integer,
ADD COLUMN IF NOT EXISTS target_weight2 numeric;