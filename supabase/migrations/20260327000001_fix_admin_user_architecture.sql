-- Fix Admin User Architecture: Remove from members, assign Church Admin role
-- This corrects the fundamental modeling error where system users were incorrectly placed in members table

-- Step 1: Remove admin user from members table (they are NOT a church member)
DELETE FROM public.members
WHERE user_id = 'e6801862-882e-4b41-ac21-b064e28a173b';

-- Step 2: Ensure Church Admin role exists (scoped to church, not global)
INSERT INTO public.roles (name, category, scope_type)
VALUES (
  'Church Admin',
  'church',
  'church'
)
ON CONFLICT (name) DO NOTHING;

-- Step 3: Assign Church Admin role to the admin user for Gloryland Church
INSERT INTO public.user_roles (user_id, role_id, church_id)
SELECT
    'e6801862-882e-4b41-ac21-b064e28a173b',
    r.id,
    'ee69e615-19bb-44e3-8905-d55bffc17fd4' -- Gloryland Church
FROM public.roles r
WHERE r.name = 'Church Admin'
AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = 'e6801862-882e-4b41-ac21-b064e28a173b'
    AND ur.role_id = r.id
);

-- Step 4: Ensure profile is properly set
UPDATE public.profiles
SET full_name = 'System Administrator'
WHERE id = 'e6801862-882e-4b41-ac21-b064e28a173b';