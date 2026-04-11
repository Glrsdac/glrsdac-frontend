-- ================================================
-- RBAC VERIFICATION SCRIPT
-- Run after migration to validate structure
-- ================================================

-- ✅ Check 1: Verify roles table has RBAC columns
SELECT 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'roles'
AND column_name IN ('category', 'scope_type')
ORDER BY ordinal_position;

-- ✅ Check 2: List all roles with their scope configuration
SELECT 
  id,
  name,
  category,
  scope_type,
  created_at
FROM public.roles
ORDER BY name;

-- ✅ Check 3: Verify role scope uniqueness constraint
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'roles'
AND constraint_name LIKE '%unique%';

-- ✅ Check 4: Check trigger for role scope enforcement
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trg_enforce_role_scope'
AND event_object_table = 'user_roles';

-- ✅ Check 5: Verify indexes were created
SELECT 
  indexname,
  tablename
FROM pg_indexes
WHERE tablename IN ('members', 'user_roles', 'profiles')
AND schemaname = 'public'
ORDER BY tablename, indexname;

-- ✅ Check 6: Count users with roles assigned
SELECT 
  'Super Admin' AS role_name,
  COUNT(DISTINCT ur.user_id) AS users_count
FROM public.user_roles ur
JOIN public.roles r ON ur.role_id = r.id
WHERE r.name = 'Super Admin'
UNION ALL
SELECT 
  'Treasurer' AS role_name,
  COUNT(DISTINCT ur.user_id) AS users_count
FROM public.user_roles ur
JOIN public.roles r ON ur.role_id = r.id
WHERE r.name = 'Treasurer'
UNION ALL
SELECT 
  'Clerk' AS role_name,
  COUNT(DISTINCT ur.user_id) AS users_count
FROM public.user_roles ur
JOIN public.roles r ON ur.role_id = r.id
WHERE r.name = 'Clerk'
UNION ALL
SELECT 
  'Viewer' AS role_name,
  COUNT(DISTINCT ur.user_id) AS users_count
FROM public.user_roles ur
JOIN public.roles r ON ur.role_id = r.id
WHERE r.name = 'Viewer';

-- ✅ Check 7: Verify global roles have no church_id
SELECT 
  'Global roles without church_id' AS check_type,
  COUNT(*) AS count
FROM public.user_roles ur
JOIN public.roles r ON ur.role_id = r.id
WHERE r.scope_type = 'global'
AND ur.church_id IS NULL;

-- ✅ Check 8: Check for invalid scope assignments (if any)
SELECT 
  ur.id,
  ur.user_id,
  r.name,
  r.scope_type,
  ur.church_id,
  'ERROR: Global role with church_id' AS validation_issue
FROM public.user_roles ur
JOIN public.roles r ON ur.role_id = r.id
WHERE r.scope_type = 'global'
AND ur.church_id IS NOT NULL
UNION ALL
SELECT 
  ur.id,
  ur.user_id,
  r.name,
  r.scope_type,
  ur.church_id,
  'ERROR: Non-global role without church_id' AS validation_issue
FROM public.user_roles ur
JOIN public.roles r ON ur.role_id = r.id
WHERE r.scope_type != 'global'
AND ur.church_id IS NULL;

-- ✅ Check 9: Sample user role assignments
SELECT 
  p.id,
  p.email,
  p.full_name,
  r.name AS role_name,
  r.scope_type,
  c.name AS church_name
FROM public.user_roles ur
JOIN public.profiles p ON ur.user_id = p.id
JOIN public.roles r ON ur.role_id = r.id
LEFT JOIN public.churches c ON ur.church_id = c.id
LIMIT 10;

-- ✅ Check 10: View full_name synchronization status
SELECT 
  COUNT(*) AS total_members,
  SUM(CASE WHEN p.full_name IS NOT NULL AND p.full_name != '' THEN 1 ELSE 0 END) AS with_full_name,
  SUM(CASE WHEN p.full_name IS NULL OR p.full_name = '' THEN 1 ELSE 0 END) AS missing_full_name
FROM public.members m
JOIN public.profiles p ON m.user_id = p.id;

-- ================================================
-- ADDITIONAL DATA QUALITY CHECKS
-- ================================================

-- Check positions that have been standardized
SELECT 
  position,
  COUNT(*) AS count
FROM public.members
WHERE position IS NOT NULL
GROUP BY position
ORDER BY count DESC;

-- Verify no duplicate role assignments  
SELECT 
  user_id,
  role_id,
  church_id,
  COUNT(*) AS duplicate_count
FROM public.user_roles
GROUP BY user_id, role_id, church_id
HAVING COUNT(*) > 1;
