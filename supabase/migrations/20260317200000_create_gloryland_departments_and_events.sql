-- Create Gloryland departments and import 2026 plan data

-- Create departments table if not exists

CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    church_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departments_name ON public.departments (lower(trim(name)));

ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Upsert departments from plan
INSERT INTO public.departments (name, description, is_active, church_id)
VALUES 
  ('Church Elders', 'Church Elders department from Gloryland Plan 2026', true, NULL),
  ('Home and Family life dept.', 'Home and Family from Gloryland Plan', true, NULL),
  ('Elders', 'Elders from Gloryland Plan', true, NULL),
  ('Women Ministries', 'Women Ministries from Gloryland Plan', true, NULL),
  ('Youth Ministries', 'Youth from Gloryland Plan', true, NULL),
  ('Sabbath School', 'Sabbath School from Gloryland Plan', true, NULL),
  ('All Depts.', 'All Departments from Gloryland Plan', true, NULL),
  ('Home and Family', 'Home and Family from Gloryland Plan', true, NULL),
  ('Music Department', 'Music from Gloryland Plan', true, NULL),
  ('Children Ministries', 'Children from Gloryland Plan', true, NULL),
  ('Health and Temperance', 'Health from Gloryland Plan', true, NULL),
  ('Stewardship Dept', 'Stewardship from Gloryland Plan', true, NULL),
  ('Personal Ministries', 'PM from Gloryland Plan', true, NULL),
  ('Women Ministry', 'Women Ministry from Gloryland Plan', true, NULL)
ON CONFLICT (name) DO UPDATE SET 
  is_active = true, updated_at = NOW()
RETURNING id, name;


-- Note: Events import via script/import-gloryland-plan-2026.mjs after this mig pushed
-- Sample data ready in scripts/data/gloryland_plan_2026_raw.json

