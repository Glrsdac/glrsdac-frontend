-- Create program_level enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.program_level AS ENUM (
        'general_conference',
        'union',
        'conference',
        'district',
        'local_church'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Adds missing event columns required by MemberCalendar and Gloryland plan imports
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS event_date DATE,
  ADD COLUMN IF NOT EXISTS program_level public.program_level DEFAULT 'local_church',
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id),
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS plan_year INTEGER,
  ADD COLUMN IF NOT EXISTS plan_month INTEGER,
  ADD COLUMN IF NOT EXISTS plan_day INTEGER,
  ADD COLUMN IF NOT EXISTS sabbath_school_theme TEXT,
  ADD COLUMN IF NOT EXISTS afternoon_program TEXT,
  ADD COLUMN IF NOT EXISTS lead_person TEXT,
  ADD COLUMN IF NOT EXISTS source_document TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS url TEXT;