-- Migration: Add missing RBAC columns to user_roles
-- Adds is_active, scope_type, scope_id, start_date, end_date
-- required by authorizeByPermissions() in _shared/rbac.ts
-- and by admin-manage-churches edge function

-- 1. Add missing columns
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS is_active   BOOLEAN  NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS scope_type  TEXT,
  ADD COLUMN IF NOT EXISTS scope_id    UUID,
  ADD COLUMN IF NOT EXISTS start_date  DATE,
  ADD COLUMN IF NOT EXISTS end_date    DATE;

-- 2. Backfill scope_type from the linked role's scope_type
UPDATE public.user_roles ur
SET scope_type = r.scope_type
FROM public.roles r
WHERE ur.role_id = r.id
  AND ur.scope_type IS NULL;

-- 3. Backfill scope_id from existing church_id (church-scoped assignments)
UPDATE public.user_roles
SET scope_id = church_id
WHERE church_id IS NOT NULL
  AND scope_id IS NULL;

-- 4. Backfill start_date from assigned_at for existing records
UPDATE public.user_roles
SET start_date = assigned_at::date
WHERE start_date IS NULL;

-- 5. Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_user_roles_is_active   ON public.user_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_roles_scope_type  ON public.user_roles(scope_type);
CREATE INDEX IF NOT EXISTS idx_user_roles_scope_id    ON public.user_roles(scope_id);
