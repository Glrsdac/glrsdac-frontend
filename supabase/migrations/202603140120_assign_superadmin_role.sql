-- Assign superadmin role to admin@glrsdac.com
DO $$
DECLARE
    user_id UUID;
    role_id UUID;
BEGIN
    SELECT id INTO user_id FROM auth.users WHERE email = 'admin@glrsdac.com';
    SELECT id INTO role_id FROM public.roles WHERE name = 'superadmin';
    IF user_id IS NOT NULL AND role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (id, user_id, role_id, assigned_at)
        VALUES (gen_random_uuid(), user_id, role_id, NOW())
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
