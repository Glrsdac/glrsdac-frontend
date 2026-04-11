-- Migration: Fix user_roles FK constraint and backfill role_id
-- Date: 2026-03-19

-- 1. Ensure role_id column exists
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS role_id UUID;

-- 2. Backfill skipped: role VARCHAR column already dropped (previous migration)

-- 3. Remove deprecated role VARCHAR column if not needed
-- ALTER TABLE public.user_roles DROP COLUMN IF EXISTS role;

-- 4. Add FK constraint (correct syntax)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_user_roles_role_id' 
    AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE public.user_roles
    ADD CONSTRAINT fk_user_roles_role_id 
    FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;
  END IF;
END $$;
