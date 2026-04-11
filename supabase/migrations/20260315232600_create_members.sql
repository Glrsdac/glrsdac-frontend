-- Create members table post-drop (before ALTER migration)
-- Base from create_member_structure + all ADD columns

CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_no VARCHAR(50) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(200),
    known_as VARCHAR(100),
    title VARCHAR(20),
    gender VARCHAR(20),
    dob DATE,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    user_id UUID REFERENCES auth.users(id),
    church_id UUID,
    email VARCHAR,
    phone VARCHAR,
    baptism_date DATE,
    emergency_contact_name VARCHAR,
    emergency_contact_phone VARCHAR,
    emergency_contact_relationship VARCHAR,
    household_id UUID,
    invite_accepted_at TIMESTAMPTZ,
    invite_sent_at TIMESTAMPTZ,
    invite_status VARCHAR,
    invite_token VARCHAR,
    is_disciplined BOOLEAN DEFAULT false,
    position VARCHAR,
    death_date DATE,
    transfer_in_date DATE,
    transfer_out_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_members_member_no ON public.members(member_no);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
