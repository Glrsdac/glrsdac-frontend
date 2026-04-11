-- Migration: Create sabbath_sessions table
CREATE TABLE IF NOT EXISTS sabbath_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    opened_by TEXT,
    closed_by TEXT,
    opened_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'OPEN',
    notes TEXT
);

-- Migration: Create sabbath_accounts table
CREATE TABLE IF NOT EXISTS sabbath_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    opened_by TEXT,
    opened_by_user_id UUID,
    opened_at TIMESTAMPTZ,
    closed_by TEXT,
    closed_by_user_id UUID,
    closed_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'OPEN'
);
