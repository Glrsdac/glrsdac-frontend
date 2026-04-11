-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

----------------------------------------------------
-- ENHANCED USER_ROLES TABLE
----------------------------------------------------
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,

    church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,

    assigned_at TIMESTAMPTZ DEFAULT NOW()
);

----------------------------------------------------
-- OPTIONAL: UNIQUE CONSTRAINT
-- Ensure a user cannot have the same role in the same church twice
----------------------------------------------------
ALTER TABLE public.user_roles
ADD CONSTRAINT uq_user_role_church UNIQUE(user_id, role_id, church_id);

----------------------------------------------------
-- INDEXES FOR PERFORMANCE
----------------------------------------------------
CREATE INDEX idx_user_roles_user_id
ON public.user_roles(user_id);

CREATE INDEX idx_user_roles_role_id
ON public.user_roles(role_id);

CREATE INDEX idx_user_roles_church_id
ON public.user_roles(church_id);
