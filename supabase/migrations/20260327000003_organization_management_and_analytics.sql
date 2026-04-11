-- Add organization-level management and global analytics support
-- This creates a hierarchical structure: Organizations > Districts > Churches

-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('conference', 'union', 'division', 'association')),
    code TEXT UNIQUE,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    established_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add organization_id to churches table
ALTER TABLE public.churches
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_churches_organization_id ON public.churches(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON public.organizations(type);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON public.organizations(is_active);

-- Insert sample organization (Ghana Conference)
INSERT INTO public.organizations (name, type, code, address, phone, email)
VALUES (
    'Ghana Conference of Seventh-day Adventists',
    'conference',
    'GCSDA',
    'Accra, Ghana',
    '+233 XX XXX XXXX',
    'info@gcsda.org'
)
ON CONFLICT (code) DO NOTHING;

-- Update existing churches to belong to the Ghana Conference
UPDATE public.churches
SET organization_id = (SELECT id FROM public.organizations WHERE code = 'GCSDA')
WHERE organization_id IS NULL;

-- Create analytics views for global dashboard
CREATE OR REPLACE VIEW public.church_analytics AS
SELECT
    c.id as church_id,
    c.name as church_name,
    o.name as organization_name,
    o.type as organization_type,
    COUNT(m.id) as member_count,
    COUNT(CASE WHEN m.status = 'ACTIVE' THEN 1 END) as active_members,
    COUNT(DISTINCT pa.member_id) as leaders_count,
    COALESCE(SUM(cont.amount), 0) as total_contributions,
    MAX(m.created_at) as latest_member_join
FROM public.churches c
LEFT JOIN public.organizations o ON c.organization_id = o.id
LEFT JOIN public.members m ON m.church_id = c.id
LEFT JOIN public.position_assignments pa ON pa.member_id = m.id AND pa.unassigned_at IS NULL
LEFT JOIN public.contributions cont ON cont.member_id = m.id AND cont.created_at >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY c.id, c.name, o.name, o.type;

-- Create user church context table for SuperAdmin church switching
CREATE TABLE IF NOT EXISTS public.user_church_context (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, church_id)
);

-- Add RLS policies
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_church_context ENABLE ROW LEVEL SECURITY;

-- Organizations: readable by authenticated users, writable by SuperAdmin
CREATE POLICY "organizations_select" ON public.organizations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "organizations_admin" ON public.organizations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('Super Admin', 'Church Admin')
        )
    );

-- User church context: users can manage their own context
CREATE POLICY "user_church_context_all" ON public.user_church_context
    FOR ALL USING (auth.uid() = user_id);

-- Update trigger for organizations
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION update_organizations_updated_at();