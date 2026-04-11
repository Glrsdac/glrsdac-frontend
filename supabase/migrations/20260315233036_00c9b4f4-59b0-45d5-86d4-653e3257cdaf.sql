-- Add missing columns to departments
-- is_active column is now included in departments table creation
-- slug column is now included in departments table creation
-- updated_at column is now included in departments table creation
-- dues_enabled column is now included in departments table creation
-- parent_department_id column is now included in departments table creation

-- Add missing columns to department_members
-- assigned_role column is now included in department_members table creation
-- source_group_id column is now included in department_members table creation
-- created_at column is now included in department_members table creation

-- Add missing columns to contributions  
-- service_date column is now included in contributions table creation
-- fund_id column is now included in contributions table creation
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS sabbath_account_id integer;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS payment_method varchar DEFAULT 'CASH';
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS recorded_by text;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS recorded_by_user_id uuid;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS conference_portion numeric DEFAULT 0;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS local_portion numeric DEFAULT 0;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS district_portion numeric DEFAULT 0;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS contribution_day integer;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS amount_original numeric;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS exchange_rate_to_ghs numeric;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS currency_code text;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Add missing columns to members
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS email varchar;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS phone varchar;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS baptism_date date;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS emergency_contact_name varchar;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS emergency_contact_phone varchar;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS emergency_contact_relationship varchar;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS household_id uuid;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS invite_accepted_at timestamptz;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS invite_sent_at timestamptz;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS invite_status varchar;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS invite_token varchar;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS is_disciplined boolean DEFAULT false;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS position varchar;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS death_date date;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS transfer_in_date date;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS transfer_out_date date;

-- Add missing columns to user_roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS role varchar;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS scope_type varchar;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS scope_id uuid;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_active boolean;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS updated_at timestamptz;