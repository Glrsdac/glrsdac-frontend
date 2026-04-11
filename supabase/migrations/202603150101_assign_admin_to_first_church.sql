-- Assign admin@glrsdac.com to the first church in the system
UPDATE user_roles
SET church_id = (
    SELECT id FROM churches ORDER BY created_at LIMIT 1
)
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'admin@glrsdac.com'
);
