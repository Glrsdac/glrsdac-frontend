-- Migration: Ensure global superadmin role assignment (best practice)
-- Date: 2026-03-19

DO $$
DECLARE
  superadmin_user_id UUID;
  superadmin_role_id UUID;
BEGIN
  SELECT id INTO superadmin_user_id FROM auth.users WHERE email = 'admin@glrsdac.com';
  SELECT id INTO superadmin_role_id FROM public.roles WHERE name = 'superadmin';
  IF superadmin_user_id IS NOT NULL AND superadmin_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (id, user_id, role_id, assigned_at, active)
    VALUES (gen_random_uuid(), superadmin_user_id, superadmin_role_id, NOW(), TRUE)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;
END $$;
