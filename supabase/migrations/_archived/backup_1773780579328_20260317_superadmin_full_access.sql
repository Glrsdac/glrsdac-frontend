-- Ensure SuperAdmin always has all permissions
-- Date: 2026-03-17
-- Updated for current schema (role as varchar column)

-- 1. Grant all permissions to SuperAdmin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON 1=1
WHERE r.name = 'SuperAdmin'
ON CONFLICT DO NOTHING;

-- 2. Assign SuperAdmin role to admin@glrsdac.com
INSERT INTO user_roles (user_id, role, is_active)
SELECT u.id, 'SuperAdmin', true
FROM auth.users u
WHERE u.email = 'admin@glrsdac.com'
ON CONFLICT DO NOTHING;
