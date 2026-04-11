-- 20260325_add_rbac_improvements.sql
-- 1. Extend roles table
ALTER TABLE public.roles
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'church';
ALTER TABLE public.roles
ADD COLUMN IF NOT EXISTS scope_type TEXT NOT NULL DEFAULT 'church';

-- 2. Add constraint logic to user_roles
-- Remove old constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'check_global_role' AND table_name = 'user_roles'
    ) THEN
        ALTER TABLE public.user_roles DROP CONSTRAINT check_global_role;
    END IF;
END $$;

-- Add trigger function for proper constraint
CREATE OR REPLACE FUNCTION enforce_role_scope()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM roles r
        WHERE r.id = NEW.role_id
        AND r.scope_type = 'global'
    ) THEN
        IF NEW.church_id IS NOT NULL THEN
            RAISE EXCEPTION 'Global roles cannot have church_id';
        END IF;
    ELSE
        IF NEW.church_id IS NULL THEN
            RAISE EXCEPTION 'Church roles must have church_id';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS trg_enforce_role_scope ON user_roles;

-- Create new trigger
CREATE TRIGGER trg_enforce_role_scope
BEFORE INSERT OR UPDATE ON user_roles
FOR EACH ROW EXECUTE FUNCTION enforce_role_scope();

-- 3. profiles table: drop user_type (best practice)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS user_type;

-- 4. members table: add indexes and optional role_title
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_church_id ON members(church_id);
ALTER TABLE members ADD COLUMN IF NOT EXISTS role_title TEXT;
