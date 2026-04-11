-- Add unique constraint for members UPSERT in import script
-- Matches ON CONFLICT (first_name, last_name, church_id) DO UPDATE

-- Drop constraint/index if exists (handles both cases)
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS uq_members_name_church;
DROP INDEX IF EXISTS uq_members_name_church;

-- Create unique index
CREATE UNIQUE INDEX uq_members_name_church 
ON public.members (lower(trim(first_name)), lower(trim(last_name)), church_id) 
WHERE church_id IS NOT NULL;

-- Note: Using lower(trim()) for case-insensitive like churches/depts upserts
-- Regular index - safe for dev/small table

