-- Fix for AccountSettings.tsx API errors
-- 1. Add role_id FK to user_roles → roles
-- 2. Recreate department_members and ensure choir_members
-- 3. Migrate existing role VARCHAR data to role_id

-- 1. Add role_id column if missing
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS role_id UUID;

-- 2. Populate role_id from existing roles table based on role VARCHAR
UPDATE public.user_roles ur
SET role_id = r.id
FROM public.roles r
WHERE ur.role = r.name 
  AND ur.role_id IS NULL
  AND r.name IS NOT NULL;

-- 3. Add FK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_user_roles_role_id' 
    AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE public.user_roles
    ADD CONSTRAINT fk_user_roles_role_id 
    FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Recreate department_members if missing
CREATE TABLE IF NOT EXISTS public.department_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    assigned_role TEXT,
    source_group_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(member_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_department_members_member_id ON public.department_members(member_id);
CREATE INDEX IF NOT EXISTS idx_department_members_department_id ON public.department_members(department_id);

-- 5. Ensure choir_members (matching existing pattern)
CREATE TABLE IF NOT EXISTS public.choir_members (
  id SERIAL PRIMARY KEY,
  member_id UUID REFERENCES public.members(id),
  voice_part VARCHAR,
  choir_name VARCHAR DEFAULT 'Main Choir',
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fix member_id type if table already exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'choir_members' AND column_name = 'member_id' AND data_type = 'integer') THEN
    ALTER TABLE public.choir_members ALTER COLUMN member_id TYPE UUID USING member_id::text::uuid;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_choir_members_member_id ON public.choir_members(member_id);
CREATE INDEX IF NOT EXISTS idx_choir_members_is_active ON public.choir_members(is_active);

-- 6. Enable RLS on new tables
ALTER TABLE public.department_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.choir_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "department_members: own or admin" ON public.department_members;
CREATE POLICY "department_members: own or superadmin" ON public.department_members
FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.members WHERE id = member_id) OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role_id IN (SELECT id FROM public.roles WHERE name = 'superadmin')));

DROP POLICY IF EXISTS "choir_members: own or admin" ON public.choir_members;
CREATE POLICY "choir_members: own or superadmin" ON public.choir_members
FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.members WHERE id = member_id) OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role_id IN (SELECT id FROM public.roles WHERE name = 'superadmin')));

COMMENT ON TABLE public.user_roles IS 'Fixed: role_id FK added for PostgREST join support';

