-- This SQL changes the members table to reference auth.users directly
-- instead of the profiles table, which has RLS restrictions

-- First, drop the existing foreign key constraint
ALTER TABLE public.members
DROP CONSTRAINT IF EXISTS members_user_id_fkey;

-- Add new foreign key that references auth.users directly
ALTER TABLE public.members
ADD CONSTRAINT members_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
