-- Add role metadata columns
ALTER TABLE roles
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS scope_type TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Update Super Admin role metadata
UPDATE roles
SET category = 'system',
    scope_type = 'global',
    description = 'System-wide super administrator'
WHERE name = 'SuperAdmin';

-- Add active column to user_roles
ALTER TABLE user_roles
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- Update admin@glrsdac.com role assignment
UPDATE user_roles
SET church_id = NULL,
    active = TRUE
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'admin@glrsdac.com'
);
