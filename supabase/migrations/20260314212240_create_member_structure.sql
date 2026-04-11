-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

----------------------------------------------------
-- MEMBERS (CORE TABLE)
----------------------------------------------------
CREATE TABLE public.members (
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

    created_at TIMESTAMPTZ DEFAULT NOW()
);

----------------------------------------------------
-- MEMBER CONTACTS
----------------------------------------------------
CREATE TABLE public.member_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,

    phone VARCHAR(30),
    work_phone VARCHAR(30),
    cellular VARCHAR(30),
    email VARCHAR(150),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

----------------------------------------------------
-- MEMBER ADDRESSES
----------------------------------------------------
CREATE TABLE public.member_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,

    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    region TEXT,
    country TEXT,
    postal_code TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

----------------------------------------------------
-- MEMBER PERSONAL DETAILS
----------------------------------------------------
CREATE TABLE public.member_personal_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,

    country_of_birth TEXT,
    birth_place TEXT,

    marital_status VARCHAR(20),

    father_name TEXT,
    mother_name TEXT,

    occupation_name TEXT,
    education_degree TEXT,

    document_id TEXT,
    other_document_id TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

----------------------------------------------------
-- MEMBER MEMBERSHIPS
----------------------------------------------------
CREATE TABLE public.member_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,

    membership_status VARCHAR(30) DEFAULT 'active',
    membership_type VARCHAR(30) DEFAULT 'regular',

    transfer_in_date DATE,
    transfer_out_date DATE,
    death_date DATE,

    is_disciplined BOOLEAN DEFAULT FALSE,

    position VARCHAR(100),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

----------------------------------------------------
-- MEMBER BAPTISMS
----------------------------------------------------
CREATE TABLE public.member_baptisms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,

    baptism_date DATE,
    baptism_place TEXT,
    baptized_by TEXT,

    conversion_method_primary TEXT,
    conversion_method_secondary TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

----------------------------------------------------
-- MEMBER EMERGENCY CONTACTS
----------------------------------------------------
CREATE TABLE public.member_emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,

    contact_name TEXT,
    phone TEXT,
    relationship TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

----------------------------------------------------
-- HOUSEHOLDS
----------------------------------------------------
CREATE TABLE public.households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    household_name TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

----------------------------------------------------
-- HOUSEHOLD MEMBERS
----------------------------------------------------
CREATE TABLE public.household_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,

    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,

    relationship VARCHAR(50),

    is_head BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

----------------------------------------------------
-- MEMBER INVITES
----------------------------------------------------
CREATE TABLE public.member_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,

    invite_token VARCHAR(255) UNIQUE,

    invite_status VARCHAR(20) DEFAULT 'not_invited',

    invite_sent_at TIMESTAMPTZ,
    invite_accepted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

----------------------------------------------------
-- INDEXES FOR PERFORMANCE
----------------------------------------------------
CREATE INDEX idx_member_contacts_member_id
ON public.member_contacts(member_id);

CREATE INDEX idx_member_addresses_member_id
ON public.member_addresses(member_id);

CREATE INDEX idx_member_personal_member_id
ON public.member_personal_details(member_id);

CREATE INDEX idx_member_memberships_member_id
ON public.member_memberships(member_id);

CREATE INDEX idx_member_baptisms_member_id
ON public.member_baptisms(member_id);

CREATE INDEX idx_member_emergency_member_id
ON public.member_emergency_contacts(member_id);

CREATE INDEX idx_household_members_member_id
ON public.household_members(member_id);
