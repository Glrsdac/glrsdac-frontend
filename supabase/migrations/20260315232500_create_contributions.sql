-- Create contributions table post-drop (before ALTER migration)
-- Includes all base columns and columns from subsequent ADD migrations

CREATE TABLE IF NOT EXISTS public.contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID,
    amount NUMERIC NOT NULL,
    contribution_date DATE NOT NULL,
    service_date DATE,
    fund_id integer,
    sabbath_account_id integer,
payment_method varchar DEFAULT 'CASH',
    recorded_by text,
    recorded_by_user_id uuid,
    conference_portion numeric DEFAULT 0,
    local_portion numeric DEFAULT 0,
    district_portion numeric DEFAULT 0,
    contribution_day integer,
    amount_original numeric,
    exchange_rate_to_ghs numeric,
    currency_code text,
    created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contributions_member_id ON public.contributions(member_id);
CREATE INDEX IF NOT EXISTS idx_contributions_contribution_date ON public.contributions(contribution_date);
CREATE INDEX IF NOT EXISTS idx_contributions_service_date ON public.contributions(service_date);
CREATE INDEX IF NOT EXISTS idx_contributions_fund_id ON public.contributions(fund_id);
CREATE INDEX IF NOT EXISTS idx_contributions_sabbath_account_id ON public.contributions(sabbath_account_id);
