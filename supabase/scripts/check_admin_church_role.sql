-- Check admin@glrsdac.com role assignment and metadata
SELECT
  u.email,
  ur.active,
  ur.church_id,
  r.name AS role_name,
  r.category,
  r.scope_type
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'admin@glrsdac.com';
