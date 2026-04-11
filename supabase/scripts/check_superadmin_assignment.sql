-- Check Super Admin role assignment for admin@glrsdac.com
SELECT
  u.email,
  ur.active,
  r.name AS role_name,
  r.category,
  r.scope_type,
  ur.church_id,
  ur.department_id
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'admin@glrsdac.com';
