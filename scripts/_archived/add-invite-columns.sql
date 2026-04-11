-- Add invite tracking columns to members table if they don't exist
DO $$ 
BEGIN
    -- Add invite_token column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'members' AND column_name = 'invite_token'
    ) THEN
        ALTER TABLE public.members ADD COLUMN invite_token VARCHAR(255) UNIQUE;
        COMMENT ON COLUMN public.members.invite_token IS 'Token for signup URL, valid until user activates account';
    END IF;

    -- Add invite_sent_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'members' AND column_name = 'invite_sent_at'
    ) THEN
        ALTER TABLE public.members ADD COLUMN invite_sent_at TIMESTAMPTZ;
    END IF;

    -- Add invite_accepted_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'members' AND column_name = 'invite_accepted_at'
    ) THEN
        ALTER TABLE public.members ADD COLUMN invite_accepted_at TIMESTAMPTZ;
    END IF;

    -- Add invite_status column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'members' AND column_name = 'invite_status'
    ) THEN
        ALTER TABLE public.members ADD COLUMN invite_status VARCHAR(50) DEFAULT 'not_invited';
        COMMENT ON COLUMN public.members.invite_status IS 'Values: not_invited, invited, activated';
    END IF;
END $$;
