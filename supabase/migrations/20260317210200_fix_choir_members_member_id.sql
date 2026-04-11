-- Migration to fix choir_members.member_id type
-- March 19, 2026

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'choir_members' AND column_name = 'member_id' AND data_type = 'integer') THEN
        ALTER TABLE public.choir_members ALTER COLUMN member_id TYPE UUID USING member_id::text::uuid;
    END IF;
END $$;
