-- Migration: Create Missing Core Tables for Department Dues and Sabbath School
-- Creates department_dues, department_due_payments, and sabbath_school_material_comments tables
-- March 26, 2026

-- Department Dues Table
CREATE TABLE IF NOT EXISTS public.department_dues (
  id BIGSERIAL PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  monthly_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  due_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_department_dues_member_id ON public.department_dues(member_id);
CREATE INDEX IF NOT EXISTS idx_department_dues_department_id ON public.department_dues(department_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_department_dues_member_department ON public.department_dues(member_id, department_id);

-- Department Due Payments Table
CREATE TABLE IF NOT EXISTS public.department_due_payments (
  id BIGSERIAL PRIMARY KEY,
  department_due_id BIGINT NOT NULL REFERENCES public.department_dues(id) ON DELETE CASCADE,
  payment_amount NUMERIC(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_month TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'CASH',
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_department_due_payments_due_id ON public.department_due_payments(department_due_id);
CREATE INDEX IF NOT EXISTS idx_department_due_payments_month ON public.department_due_payments(payment_month);

-- Sabbath School Materials Table
CREATE TABLE IF NOT EXISTS public.sabbath_school_materials (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  week_start DATE NOT NULL,
  week_end DATE,
  language TEXT,
  age_group TEXT,
  is_children BOOLEAN DEFAULT FALSE,
  class_id BIGINT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sabbath_school_materials_department_id ON public.sabbath_school_materials(department_id);
CREATE INDEX IF NOT EXISTS idx_sabbath_school_materials_week_start ON public.sabbath_school_materials(week_start);

-- Sabbath School Lessons Table (add missing columns if they don't exist)
CREATE TABLE IF NOT EXISTS public.sabbath_school_lessons (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  week_start DATE NOT NULL,
  week_end DATE,
  language TEXT,
  age_group TEXT,
  is_children BOOLEAN DEFAULT FALSE,
  class_id BIGINT,
  department_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if they don't exist
ALTER TABLE public.sabbath_school_lessons ADD COLUMN IF NOT EXISTS week_end DATE;
ALTER TABLE public.sabbath_school_lessons ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE public.sabbath_school_lessons ADD COLUMN IF NOT EXISTS age_group TEXT;
ALTER TABLE public.sabbath_school_lessons ADD COLUMN IF NOT EXISTS is_children BOOLEAN DEFAULT FALSE;
ALTER TABLE public.sabbath_school_lessons ADD COLUMN IF NOT EXISTS department_id UUID;
ALTER TABLE public.sabbath_school_lessons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_sabbath_school_lessons_department_id ON public.sabbath_school_lessons(department_id);
CREATE INDEX IF NOT EXISTS idx_sabbath_school_lessons_week_start ON public.sabbath_school_lessons(week_start);

-- Sabbath School Members Table
CREATE TABLE IF NOT EXISTS public.sabbath_school_members (
  id BIGSERIAL PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  class_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sabbath_school_members_member_id ON public.sabbath_school_members(member_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sabbath_school_members_member_class ON public.sabbath_school_members(member_id, class_id);

-- Sabbath School Library Items Table
CREATE TABLE IF NOT EXISTS public.sabbath_school_library_items (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  description TEXT,
  resource_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sabbath_school_library_items_category ON public.sabbath_school_library_items(category);

-- Sabbath School Material Comments Table
CREATE TABLE IF NOT EXISTS public.sabbath_school_material_comments (
  id BIGSERIAL PRIMARY KEY,
  material_id BIGINT NOT NULL REFERENCES public.sabbath_school_materials(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sabbath_school_material_comments_material_id ON public.sabbath_school_material_comments(material_id);
CREATE INDEX IF NOT EXISTS idx_sabbath_school_material_comments_member_id ON public.sabbath_school_material_comments(member_id);

-- Enable RLS on new tables
ALTER TABLE public.department_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_due_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sabbath_school_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sabbath_school_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sabbath_school_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sabbath_school_library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sabbath_school_material_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Members can view their own department dues
CREATE POLICY "Members can view their own dues"
  ON public.department_dues
  FOR SELECT
  USING (
    member_id = (SELECT id FROM public.members WHERE user_id = auth.uid() LIMIT 1)
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name IN ('SUPER_ADMIN', 'TREASURER', 'CLERK')
    )
  );

-- RLS Policy: Treasurers/Clerks can manage due payments
CREATE POLICY "Treasurers and clerks can manage payments"
  ON public.department_due_payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name IN ('SUPER_ADMIN', 'TREASURER', 'CLERK')
    )
  );

-- RLS Policy: Members can view material comments
CREATE POLICY "Members can view material comments"
  ON public.sabbath_school_material_comments
  FOR SELECT
  USING (true);

-- RLS Policy: Members can post comments on materials
CREATE POLICY "Members can post material comments"
  ON public.sabbath_school_material_comments
  FOR INSERT
  WITH CHECK (
    member_id = (SELECT id FROM public.members WHERE user_id = auth.uid() LIMIT 1)
  );

-- RLS Policy: Sabbath school materials are viewable by all authenticated users
CREATE POLICY "Sabbath materials visible to all"
  ON public.sabbath_school_materials
  FOR SELECT
  USING (true);

-- RLS Policy: Only admins and sabbath school directors can manage materials
CREATE POLICY "Sabbath admins can manage materials"
  ON public.sabbath_school_materials
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name IN ('SUPER_ADMIN', 'TREASURER', 'CLERK')
    )
  );

-- RLS Policy: Sabbath school lessons are viewable by all authenticated users
CREATE POLICY "Sabbath lessons visible to all"
  ON public.sabbath_school_lessons
  FOR SELECT
  USING (true);

-- RLS Policy: Only admins can manage lessons
CREATE POLICY "Sabbath lesson admins can manage"
  ON public.sabbath_school_lessons
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name IN ('SUPER_ADMIN', 'TREASURER', 'CLERK')
    )
  );

-- RLS Policy: Members can view their own sabbath school memberships
CREATE POLICY "Members can view their sabbath memberships"
  ON public.sabbath_school_members
  FOR SELECT
  USING (
    member_id = (SELECT id FROM public.members WHERE user_id = auth.uid() LIMIT 1)
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name IN ('SUPER_ADMIN', 'TREASURER', 'CLERK')
    )
  );

-- RLS Policy: Admins can manage sabbath school memberships
CREATE POLICY "Sabbath membership admins can manage"
  ON public.sabbath_school_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name IN ('SUPER_ADMIN', 'TREASURER', 'CLERK')
    )
  );

-- RLS Policy: Library items are viewable by all authenticated users
CREATE POLICY "Library items visible to all"
  ON public.sabbath_school_library_items
  FOR SELECT
  USING (true);

-- RLS Policy: Admins can manage library items
CREATE POLICY "Library admins can manage items"
  ON public.sabbath_school_library_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name IN ('SUPER_ADMIN', 'TREASURER', 'CLERK')
    )
  );
