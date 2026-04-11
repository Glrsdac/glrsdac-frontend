-- Add unique constraint to prevent duplicate role assignments
-- A user cannot have the same role with the same scope more than once

-- Drop existing index if it exists
DROP INDEX IF EXISTS user_roles_unique_assignment;

-- Create unique partial indexes for different scope scenarios
-- Index 1: Global scope (no scope_type or scope_id)
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_unique_global
  ON user_roles (user_id, role_id)
  WHERE scope_type IS NULL AND scope_id IS NULL;

-- Index 2: Typed scope with ID
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_unique_scoped
  ON user_roles (user_id, role_id, scope_type, scope_id)
  WHERE scope_type IS NOT NULL AND scope_id IS NOT NULL;

-- Index 3: Typed scope without ID (edge case)
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_unique_scope_type_only
  ON user_roles (user_id, role_id, scope_type)
  WHERE scope_type IS NOT NULL AND scope_id IS NULL;
