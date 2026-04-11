-- ================================================
-- COMPREHENSIVE RBAC MIGRATION
-- Date: March 26, 2026
-- Purpose: Implement complete RBAC structure with
--          role scoping, validation, and indexing
-- ================================================

-- 🧩 STEP 1: UPDATE roles TABLE (RBAC CORE)
-- Add RBAC columns for categorization and scope control
ALTER TABLE public.roles
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'church',
ADD COLUMN IF NOT EXISTS scope_type TEXT NOT NULL DEFAULT 'church';

COMMENT ON COLUMN public.roles.category IS 'Classification: system, church, department, or other';
COMMENT ON COLUMN public.roles.scope_type IS 'Scope enforcement: global (church-agnostic) or church (church-specific)';

-- 🧩 STEP 2: CLEAN & STANDARDIZE ROLE DATA
-- Add unique constraint on name if not present (PostgreSQL approach)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'roles_name_unique'
  ) THEN
    ALTER TABLE public.roles
    ADD CONSTRAINT roles_name_unique UNIQUE (name);
  END IF;
END $$;


-- Ensure required roles exist with correct scope
INSERT INTO public.roles (name, category, scope_type)
VALUES 
  ('Super Admin', 'system', 'global'),
  ('Treasurer', 'church', 'church'),
  ('Clerk', 'church', 'church'),
  ('Viewer', 'church', 'church')
ON CONFLICT (name) DO NOTHING;

-- Update existing roles with proper category and scope
UPDATE public.roles
SET category = 'system', scope_type = 'global'
WHERE name IN ('Super Admin', 'SuperAdmin', 'Admin', 'System');

UPDATE public.roles
SET category = 'church', scope_type = 'church'
WHERE name IN ('Treasurer', 'Church Treasurer', 'Financial Officer');

UPDATE public.roles
SET category = 'church', scope_type = 'church'
WHERE name IN ('Clerk', 'Church Clerk', 'Member Records');

UPDATE public.roles
SET category = 'church', scope_type = 'church'
WHERE name IN ('Viewer', 'Member', 'Regular Member');

-- 🧩 STEP 3: FIX profiles.full_name (DATA CLEANUP)
-- Sync full_name from members table where available
UPDATE public.profiles p
SET full_name = CONCAT(
  COALESCE(m.first_name, ''),
  CASE WHEN m.first_name IS NOT NULL AND m.last_name IS NOT NULL THEN ' ' ELSE '' END,
  COALESCE(m.last_name, '')
)
FROM public.members m
WHERE p.id = m.user_id
AND (p.full_name IS NULL OR p.full_name = '' OR p.full_name ~ '^\s*$');

-- 🧩 STEP 4: REMOVE user_type (RBAC CONSISTENCY)
-- Remove obsolete user_type column if it exists
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS user_type;

-- 🧩 STEP 5: ASSIGN ROLES BASED ON EXISTING DATA
-- 🔹 Assign Treasurer role from members.position
INSERT INTO public.user_roles (user_id, role_id, church_id)
SELECT 
  m.user_id,
  r.id,
  m.church_id
FROM public.members m
JOIN public.roles r ON r.name = 'Treasurer'
WHERE LOWER(COALESCE(m.position, '')) = 'treasurer'
  AND m.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = m.user_id
    AND ur.role_id = r.id
    AND ur.church_id = m.church_id
  )
ON CONFLICT DO NOTHING;

-- 🔹 Assign Clerk role from members.position
INSERT INTO public.user_roles (user_id, role_id, church_id)
SELECT 
  m.user_id,
  r.id,
  m.church_id
FROM public.members m
JOIN public.roles r ON r.name = 'Clerk'
WHERE LOWER(COALESCE(m.position, '')) = 'clerk'
  AND m.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = m.user_id
    AND ur.role_id = r.id
    AND ur.church_id = m.church_id
  )
ON CONFLICT DO NOTHING;

-- 🔹 Ensure Super Admin role exists (manually reviewed)
-- NOTE: Replace 'SUPER_ADMIN_USER_ID' with actual Super Admin user ID
-- This role should only be assigned to trusted administrators
INSERT INTO public.user_roles (user_id, role_id, church_id)
SELECT 
  'a7462936-eda5-415d-9409-be46bc04d62f'::uuid,
  r.id,
  NULL
FROM public.roles r
WHERE r.name = 'Super Admin'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = 'a7462936-eda5-415d-9409-be46bc04d62f'::uuid
  AND ur.role_id = r.id
)
ON CONFLICT DO NOTHING;

-- 🧩 STEP 6: ENFORCE ROLE SCOPE RULES (CRITICAL)
-- 🔥 Create validation function to enforce scope rules
CREATE OR REPLACE FUNCTION public.enforce_role_scope()
RETURNS TRIGGER AS $$
DECLARE
  v_scope_type TEXT;
BEGIN
  -- Get the scope_type for the role being assigned
  SELECT scope_type INTO v_scope_type
  FROM public.roles
  WHERE id = NEW.role_id;

  -- Validate scope rules
  IF v_scope_type = 'global' THEN
    -- Global roles must NOT have a church_id
    IF NEW.church_id IS NOT NULL THEN
      RAISE EXCEPTION 'Global roles (%) cannot be scoped to a church. Set church_id to NULL.',
        (SELECT name FROM public.roles WHERE id = NEW.role_id);
    END IF;
  ELSE
    -- Non-global roles MUST have a church_id
    IF NEW.church_id IS NULL THEN
      RAISE EXCEPTION 'Non-global roles (%) require a church_id assignment.',
        (SELECT name FROM public.roles WHERE id = NEW.role_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 🔥 Attach trigger (drop existing first to avoid conflicts)
DROP TRIGGER IF EXISTS trg_enforce_role_scope ON public.user_roles;

CREATE TRIGGER trg_enforce_role_scope
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_role_scope();

COMMENT ON TRIGGER trg_enforce_role_scope ON public.user_roles
IS 'Enforces RBAC scope rules: global roles cannot have church_id, non-global roles must have church_id';

-- 🧩 STEP 7: ADD PERFORMANCE INDEXES
-- Members indexes
CREATE INDEX IF NOT EXISTS idx_members_user_id 
ON public.members(user_id);

CREATE INDEX IF NOT EXISTS idx_members_church_id 
ON public.members(church_id);

CREATE INDEX IF NOT EXISTS idx_members_status 
ON public.members(status);

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
ON public.user_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_role_id 
ON public.user_roles(role_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_church_id 
ON public.user_roles(church_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_roles_user_church 
ON public.user_roles(user_id, church_id);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email 
ON public.profiles(email);

-- 🧩 STEP 8: NORMALIZE POSITION FIELD (RECOMMENDED)
-- Keep position as a label but standardize common values
UPDATE public.members
SET position = 'Church Treasurer'
WHERE LOWER(COALESCE(position, '')) = 'treasurer'
AND position != 'Church Treasurer';

UPDATE public.members
SET position = 'Church Clerk'
WHERE LOWER(COALESCE(position, '')) = 'clerk'
AND position != 'Church Clerk';

-- Note: We keep the position field for backward compatibility and as a label.
-- All permission checks should use user_roles and roles tables exclusively.

-- ================================================
-- DATA VALIDATION CHECKS (RUN AFTER MIGRATION)
-- ================================================

-- 🔍 Check 1: Users without roles (should be minimal)
-- SELECT p.id, p.email
-- FROM public.profiles p
-- LEFT JOIN public.user_roles ur ON ur.user_id = p.id
-- WHERE ur.id IS NULL
-- ORDER BY p.created_at DESC;

-- 🔍 Check 2: Invalid global role assignments
-- SELECT ur.user_id, ur.role_id, ur.church_id, r.name, r.scope_type
-- FROM public.user_roles ur
-- JOIN public.roles r ON r.id = ur.role_id
-- WHERE r.scope_type = 'global'
-- AND ur.church_id IS NOT NULL;

-- 🔍 Check 3: Invalid church role assignments
-- SELECT ur.user_id, ur.role_id, ur.church_id, r.name, r.scope_type
-- FROM public.user_roles ur
-- JOIN public.roles r ON r.id = ur.role_id
-- WHERE r.scope_type != 'global'
-- AND ur.church_id IS NULL;

-- 🔍 Check 4: Duplicate role assignments
-- SELECT user_id, role_id, church_id, COUNT(*) as count
-- FROM public.user_roles
-- GROUP BY user_id, role_id, church_id
-- HAVING COUNT(*) > 1;

-- ================================================
-- FINAL RBAC STRUCTURE SUMMARY
-- ================================================
-- auth.users             → Authentication layer
-- profiles               → User identity (email, full_name)
-- members                → Church-specific member data
-- roles                  → Permission definitions (name, category, scope_type)
-- user_roles             → Permission assignments with scope enforcement
-- ================================================

-- Enable audit logging (optional)
SELECT 'MIGRATION: comprehensive_rbac_migration completed successfully' AS status;
