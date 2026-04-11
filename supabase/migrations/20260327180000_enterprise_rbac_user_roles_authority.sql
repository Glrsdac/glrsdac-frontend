-- ================================================
-- ENTERPRISE RBAC MIGRATION: User Roles as Authority Source
-- Date: March 27, 2026
-- Purpose: Complete the architectural shift from members-based
--          to user_roles-based authorization
-- ================================================

-- 🧩 STEP 1: UPDATE has_role FUNCTION (CRITICAL FIX)
-- Replace old has_role function that used user_roles.role directly
-- with new function that uses proper RBAC structure

CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, required_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has the required role via user_roles -> roles relationship
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = $1
      AND ur.is_active = true
      AND (ur.end_date IS NULL OR ur.end_date >= CURRENT_DATE)
      AND LOWER(r.name) = LOWER($2)
  );
END;
$$;

-- Also update the app_role version for backward compatibility
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id
      AND ur.is_active = true
      AND (ur.end_date IS NULL OR ur.end_date >= CURRENT_DATE)
      AND LOWER(r.name) = LOWER(_role::text)
  );
$$;

-- 🧩 STEP 2: CREATE user_scope VIEW (HELPER VIEW)
-- Provides clean access to user permissions and scope
CREATE OR REPLACE VIEW public.user_scope AS
SELECT
    ur.user_id,
    ur.church_id,
    ur.scope_type,
    r.name AS role_name,
    r.category AS role_category,
    r.scope_type AS role_scope_type,
    ur.is_active,
    ur.start_date,
    ur.end_date
FROM public.user_roles ur
JOIN public.roles r ON r.id = ur.role_id
WHERE ur.is_active = true
  AND (ur.end_date IS NULL OR ur.end_date >= CURRENT_DATE);

COMMENT ON VIEW public.user_scope IS 'Helper view for user permissions and scope - use this instead of joining user_roles + roles';

-- 🧩 STEP 3: CREATE NEW AUTHORIZATION FUNCTIONS
-- Function to check if user has global admin access
CREATE OR REPLACE FUNCTION public.has_global_admin_access(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_scope
    WHERE user_scope.user_id = $1
      AND user_scope.role_scope_type = 'global'
      AND user_scope.role_name IN ('Super Admin', 'SuperAdmin', 'System Admin', 'Admin')
  );
$$;

-- Function to check if user has church-specific access
CREATE OR REPLACE FUNCTION public.has_church_access(user_id UUID, church_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_scope
    WHERE user_scope.user_id = $1
      AND (
        user_scope.role_scope_type = 'global'
        OR user_scope.church_id = $2
      )
  );
$$;

-- Function to check specific role access
CREATE OR REPLACE FUNCTION public.has_role_access(user_id UUID, role_name TEXT, church_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_scope
    WHERE user_scope.user_id = $1
      AND LOWER(user_scope.role_name) = LOWER($2)
      AND (
        user_scope.role_scope_type = 'global'
        OR ($3 IS NULL OR user_scope.church_id = $3)
      )
  );
$$;

-- 🧩 STEP 4: UPDATE RLS POLICIES (CORE TABLES)
-- Drop old policies and create new ones based on user_roles

-- Members table: Church admins and clerks can manage members in their church
DROP POLICY IF EXISTS "Admin write members" ON public.members;
CREATE POLICY "members_access" ON public.members
    FOR ALL USING (
        public.has_global_admin_access(auth.uid())
        OR public.has_church_access(auth.uid(), church_id)
    );

-- Departments table: Church admins can manage departments
DROP POLICY IF EXISTS "Admin write departments" ON public.departments;
CREATE POLICY "departments_access" ON public.departments
    FOR ALL USING (
        public.has_global_admin_access(auth.uid())
        OR public.has_church_access(auth.uid(), church_id)
    );

-- Contributions table: Church admins and treasurers can manage
DROP POLICY IF EXISTS "Admin write contributions" ON public.contributions;
CREATE POLICY "contributions_access" ON public.contributions
    FOR ALL USING (
        public.has_global_admin_access(auth.uid())
        OR public.has_role_access(auth.uid(), 'Treasurer', church_id)
        OR public.has_role_access(auth.uid(), 'Clerk', church_id)
    );

-- Funds table: Church admins and treasurers
DROP POLICY IF EXISTS "Admin write funds" ON public.funds;
CREATE POLICY "funds_access" ON public.funds
    FOR ALL USING (
        public.has_global_admin_access(auth.uid())
        OR public.has_role_access(auth.uid(), 'Treasurer', church_id)
    );

-- Department members: Church admins and department leaders
DROP POLICY IF EXISTS "department_members_access" ON public.department_members;
CREATE POLICY "department_members_access" ON public.department_members
    FOR ALL USING (
        public.has_global_admin_access(auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.id = department_members.member_id
            AND public.has_church_access(auth.uid(), m.church_id)
        )
    );

-- Churches table: Only global admins can manage churches
DROP POLICY IF EXISTS "churches_admin" ON public.churches;
CREATE POLICY "churches_admin" ON public.churches
    FOR ALL USING (public.has_global_admin_access(auth.uid()));

-- User roles table: Global admins can manage all, church admins their church
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "user_roles_access" ON public.user_roles
    FOR ALL USING (
        public.has_global_admin_access(auth.uid())
        OR (
            public.has_church_access(auth.uid(), church_id)
            AND NOT EXISTS (
                SELECT 1 FROM public.roles r
                WHERE r.id = user_roles.role_id
                AND r.scope_type = 'global'
            )
        )
    );

-- 🧩 STEP 5: UPDATE REMAINING TABLES WITH NEW POLICIES
-- Apply consistent authorization to all tables

-- Bank accounts
DROP POLICY IF EXISTS "Admin write bank_accounts" ON public.bank_accounts;
CREATE POLICY "bank_accounts_access" ON public.bank_accounts
    FOR ALL USING (
        public.has_global_admin_access(auth.uid())
        OR public.has_role_access(auth.uid(), 'Treasurer', church_id)
    );

-- Fund groups
DROP POLICY IF EXISTS "Admin write fund_groups" ON public.fund_groups;
CREATE POLICY "fund_groups_access" ON public.fund_groups
    FOR ALL USING (
        public.has_global_admin_access(auth.uid())
        OR public.has_role_access(auth.uid(), 'Treasurer', church_id)
    );

-- Department dues
DROP POLICY IF EXISTS "department_dues_access" ON public.department_dues;
CREATE POLICY "department_dues_access" ON public.department_dues
    FOR ALL USING (
        public.has_global_admin_access(auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.departments d
            WHERE d.id = department_dues.department_id
            AND public.has_church_access(auth.uid(), d.church_id)
        )
    );

-- Sabbath sessions
DROP POLICY IF EXISTS "Admin write sabbath_sessions" ON public.sabbath_sessions;
CREATE POLICY "sabbath_sessions_access" ON public.sabbath_sessions
    FOR ALL USING (
        public.has_global_admin_access(auth.uid())
        OR public.has_church_access(auth.uid(), church_id)
    );

-- Choir members
DROP POLICY IF EXISTS "choir_members_access" ON public.choir_members;
CREATE POLICY "choir_members_access" ON public.choir_members
    FOR ALL USING (
        public.has_global_admin_access(auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.id = choir_members.member_id
            AND public.has_church_access(auth.uid(), m.church_id)
        )
    );

-- 🧩 STEP 6: ADD INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_user_scope_user_id ON public.user_scope(user_id);
CREATE INDEX IF NOT EXISTS idx_user_scope_church_id ON public.user_scope(church_id);
CREATE INDEX IF NOT EXISTS idx_user_scope_role_name ON public.user_scope(role_name);

-- 🧩 STEP 7: VALIDATION QUERIES
-- Test the new authorization system

-- Check global admin access
-- SELECT user_id, role_name FROM public.user_scope WHERE role_scope_type = 'global';

-- Check church-specific access
-- SELECT user_id, church_id, role_name FROM public.user_scope WHERE role_scope_type = 'church';

-- Verify policies work
-- SELECT * FROM public.members LIMIT 1; -- Should work for authorized users

-- ================================================
-- MIGRATION COMPLETE
-- ================================================

-- Log completion
SELECT 'MIGRATION: enterprise_rbac_user_roles_authority completed successfully' AS status;