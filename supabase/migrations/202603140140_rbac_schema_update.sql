-- RBAC Schema Updates for Church ERP

-- 1. Create roles table with metadata
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT NOT NULL,
    scope_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE
);

-- 4. Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    church_id UUID REFERENCES churches(id),
    department_id UUID,
    active BOOLEAN DEFAULT TRUE,
    assigned_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Optional: Create permission_groups table
CREATE TABLE IF NOT EXISTS permission_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE
);

-- 6. Optional: Create role_inheritance table
CREATE TABLE IF NOT EXISTS role_inheritance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_role_id UUID REFERENCES roles(id),
    child_role_id UUID REFERENCES roles(id)
);

-- 7. Insert core roles
INSERT INTO roles (name, category, scope_type)
VALUES
('SuperAdmin','system','global'),
('Conference Admin','system','global'),
('Pastor','church','church'),
('Treasurer','church','church'),
('Department Leader','department','department'),
('Member','church','church')
ON CONFLICT (name) DO NOTHING;

-- 8. Insert core permissions
INSERT INTO permissions (name, description)
VALUES
('manage_members', 'Manage member records'),
('manage_finance', 'Manage financial records'),
('manage_departments', 'Manage departments'),
('view_reports', 'View reports'),
('manage_events', 'Manage events'),
('manage_announcements', 'Manage announcements'),
('manage_inventory', 'Manage inventory')
ON CONFLICT (name) DO NOTHING;

-- 9. Example: Assign Super Admin role to admin@glrsdac.com
INSERT INTO user_roles (user_id, role_id)
VALUES (
    (SELECT id FROM auth.users WHERE email='admin@glrsdac.com'),
    (SELECT id FROM roles WHERE name='SuperAdmin')
)
ON CONFLICT DO NOTHING;
