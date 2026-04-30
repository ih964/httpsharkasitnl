ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time time,
  ADD COLUMN IF NOT EXISTS break_minutes numeric NOT NULL DEFAULT 0;