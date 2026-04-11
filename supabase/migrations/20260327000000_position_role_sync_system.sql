-- ===============================================
-- POSITION TO ROLE AUTOMATIC CONVERSION SYSTEM
-- ===============================================
-- Date: March 27, 2026
-- Purpose: Automatically convert positions to roles and maintain sync
-- ===============================================

-- 1. POSITION DEFINITIONS TABLE
-- Standardized position definitions with automatic role mapping
CREATE TABLE IF NOT EXISTS public.position_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- 'leadership', 'ministry', 'support', 'member'
  default_role_id UUID REFERENCES public.roles(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert standard position definitions with role mappings
INSERT INTO public.position_definitions (name, category, default_role_id)
SELECT
  pos.name,
  CASE
    WHEN pos.name IN ('Pastor', 'Associate Pastor', 'Elder', 'Assistant Elder') THEN 'leadership'
    WHEN pos.name IN ('Church Treasurer', 'Financial Officer') THEN 'ministry'
    WHEN pos.name IN ('Church Clerk', 'Member Records') THEN 'support'
    ELSE 'member'
  END as category,
  r.id as default_role_id
FROM (VALUES
  ('Pastor'), ('Associate Pastor'), ('Elder'), ('Assistant Elder'),
  ('Deacon'), ('Church Treasurer'), ('Financial Officer'),
  ('Church Clerk'), ('Member Records'), ('Youth Leader'),
  ('Children''s Ministry'), ('Music Director'), ('Choir Director')
) AS pos(name)
LEFT JOIN public.roles r ON (
  CASE
    WHEN pos.name IN ('Church Treasurer', 'Financial Officer') THEN r.name = 'Treasurer'
    WHEN pos.name IN ('Church Clerk', 'Member Records') THEN r.name = 'Clerk'
    WHEN pos.name IN ('Pastor', 'Associate Pastor', 'Elder', 'Assistant Elder') THEN r.name = 'Super Admin'
    ELSE r.name = 'Viewer'
  END
)
ON CONFLICT (name) DO NOTHING;

-- 2. POSITION ASSIGNMENT HISTORY
-- Track position changes for audit and sync purposes
CREATE TABLE IF NOT EXISTS public.position_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  position_definition_id UUID NOT NULL REFERENCES public.position_definitions(id),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. AUTOMATIC ROLE SYNC FUNCTION
-- Function to sync roles when positions change
CREATE OR REPLACE FUNCTION sync_position_to_role()
RETURNS TRIGGER AS $$
DECLARE
  position_def RECORD;
  target_role_id UUID;
  user_id UUID;
BEGIN
  -- Get the user_id from members table
  SELECT m.user_id INTO user_id
  FROM public.members m
  WHERE m.id = COALESCE(NEW.member_id, OLD.member_id);

  IF user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Handle INSERT/UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.position IS NOT NULL THEN
    -- Find position definition and default role
    SELECT pd.*, pd.default_role_id INTO position_def
    FROM public.position_definitions pd
    WHERE pd.name = NEW.position AND pd.is_active = TRUE;

    IF position_def.id IS NOT NULL THEN
      -- Insert position assignment record
      INSERT INTO public.position_assignments (
        member_id, position_definition_id, assigned_by
      ) VALUES (
        NEW.id, position_def.id, NEW.updated_by
      ) ON CONFLICT DO NOTHING;

      -- Assign the default role if not already assigned
      IF position_def.default_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role_id, church_id)
        SELECT user_id, position_def.default_role_id, NEW.church_id
        WHERE NOT EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = user_id
          AND ur.role_id = position_def.default_role_id
          AND ur.church_id = NEW.church_id
        );
      END IF;
    END IF;

  -- Handle DELETE or position removal
  ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.position IS NOT NULL AND NEW.position IS NULL) THEN
    -- Mark position assignment as unassigned
    UPDATE public.position_assignments
    SET unassigned_at = NOW()
    WHERE member_id = COALESCE(OLD.id, NEW.id)
    AND unassigned_at IS NULL;

    -- Note: We don't automatically remove roles on position removal
    -- to prevent accidental permission loss. Manual role management required.
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. CREATE TRIGGER FOR AUTOMATIC SYNC
DROP TRIGGER IF EXISTS trigger_sync_position_to_role ON public.members;
CREATE TRIGGER trigger_sync_position_to_role
  AFTER INSERT OR UPDATE OR DELETE ON public.members
  FOR EACH ROW EXECUTE FUNCTION sync_position_to_role();

-- 5. CONSTRAINTS TO PREVENT INCONSISTENCIES

-- Constraint: Position must exist in position_definitions if set
ALTER TABLE public.members
ADD CONSTRAINT fk_members_position_definition
FOREIGN KEY (position)
REFERENCES public.position_definitions(name)
DEFERRABLE INITIALLY DEFERRED;

-- Constraint: Prevent invalid position-role combinations
CREATE OR REPLACE FUNCTION validate_position_role_consistency()
RETURNS TRIGGER AS $$
DECLARE
  position_def RECORD;
  has_correct_role BOOLEAN := FALSE;
BEGIN
  -- Only validate on INSERT/UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    -- Get position definition
    SELECT * INTO position_def
    FROM public.position_definitions pd
    WHERE pd.name = NEW.position AND pd.is_active = TRUE;

    IF position_def.id IS NOT NULL AND position_def.default_role_id IS NOT NULL THEN
      -- Check if user has the required role
      SELECT EXISTS(
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = NEW.user_id
        AND ur.role_id = position_def.default_role_id
        AND ur.church_id = NEW.church_id
      ) INTO has_correct_role;

      -- If position requires a role but user doesn't have it, this will be handled by the sync function
      -- We allow this to let the sync function work, but log it
      IF NOT has_correct_role THEN
        RAISE NOTICE 'Position % requires role but user does not have it - sync function will handle', NEW.position;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create validation trigger
DROP TRIGGER IF EXISTS trigger_validate_position_role ON public.members;
CREATE TRIGGER trigger_validate_position_role
  BEFORE INSERT OR UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION validate_position_role_consistency();

-- 6. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_position_definitions_name ON public.position_definitions(name);
CREATE INDEX IF NOT EXISTS idx_position_definitions_category ON public.position_definitions(category);
CREATE INDEX IF NOT EXISTS idx_position_assignments_member_id ON public.position_assignments(member_id);
CREATE INDEX IF NOT EXISTS idx_position_assignments_position_definition_id ON public.position_assignments(position_definition_id);
CREATE INDEX IF NOT EXISTS idx_position_assignments_active ON public.position_assignments(member_id) WHERE unassigned_at IS NULL;

-- 7. RLS POLICIES
ALTER TABLE public.position_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.position_assignments ENABLE ROW LEVEL SECURITY;

-- Position definitions: Readable by all authenticated users
CREATE POLICY "Position definitions are viewable by authenticated users" ON public.position_definitions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Position definitions: Only admins can modify
CREATE POLICY "Position definitions are modifiable by admins" ON public.position_definitions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('Super Admin', 'Admin')
    )
  );

-- Position assignments: Users can view their own, admins can view all
CREATE POLICY "Users can view their own position assignments" ON public.position_assignments
  FOR SELECT USING (
    member_id IN (
      SELECT id FROM public.members WHERE user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('Super Admin', 'Admin', 'Clerk')
    )
  );

-- Position assignments: Only admins can modify
CREATE POLICY "Position assignments are modifiable by admins" ON public.position_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('Super Admin', 'Admin')
    )
  );

-- 8. MIGRATION: SYNC EXISTING DATA
-- Update existing members to use position definitions
INSERT INTO public.position_assignments (member_id, position_definition_id, assigned_at)
SELECT
  m.id,
  pd.id,
  m.created_at
FROM public.members m
JOIN public.position_definitions pd ON pd.name = m.position
WHERE m.position IS NOT NULL
ON CONFLICT DO NOTHING;

-- Assign roles to existing position holders
INSERT INTO public.user_roles (user_id, role_id, church_id)
SELECT DISTINCT
  m.user_id,
  pd.default_role_id,
  m.church_id
FROM public.members m
JOIN public.position_definitions pd ON pd.name = m.position
WHERE m.position IS NOT NULL
  AND pd.default_role_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = m.user_id
    AND ur.role_id = pd.default_role_id
    AND ur.church_id = m.church_id
  );

COMMIT;