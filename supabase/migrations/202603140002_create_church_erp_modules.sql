-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

----------------------------------------------------
-- CHURCH ORGANIZATION STRUCTURE
----------------------------------------------------

CREATE TABLE unions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    abbreviation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    union_id UUID REFERENCES unions(id),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conference_id UUID REFERENCES conferences(id),
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE districts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id UUID REFERENCES regions(id),
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE churches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id UUID REFERENCES districts(id),
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

----------------------------------------------------
-- DEPARTMENTS
----------------------------------------------------

CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES churches(id),
    name TEXT NOT NULL,
    description TEXT,
    slug VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ,
    dues_enabled BOOLEAN,
    parent_department_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE department_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES departments(id),
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE department_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES departments(id),
    member_id UUID,
    position_id UUID REFERENCES department_positions(id),
    joined_at DATE,
    assigned_role VARCHAR,
    source_group_id VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE department_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES departments(id),
    title TEXT,
    meeting_date TIMESTAMPTZ,
    location TEXT
);

CREATE TABLE department_meeting_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES department_meetings(id),
    member_id UUID,
    attended BOOLEAN DEFAULT FALSE
);

----------------------------------------------------
-- EVENTS & PROGRAMS
----------------------------------------------------

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES churches(id),
    title TEXT,
    description TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ
);

CREATE TABLE event_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id),
    title TEXT,
    session_time TIMESTAMPTZ
);

CREATE TABLE event_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES event_sessions(id),
    member_id UUID,
    attended BOOLEAN
);

CREATE TABLE event_volunteers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id),
    member_id UUID,
    role TEXT
);

CREATE TABLE event_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id),
    member_id UUID,
    rating INTEGER,
    comments TEXT
);

----------------------------------------------------
-- SABBATH SCHOOL SYSTEM
----------------------------------------------------

CREATE TABLE sabbath_school_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES churches(id),
    name TEXT,
    teacher_id UUID
);

CREATE TABLE sabbath_school_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES sabbath_school_classes(id),
    member_id UUID
);

CREATE TABLE sabbath_school_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES sabbath_school_classes(id),
    member_id UUID,
    attendance_date DATE,
    present BOOLEAN
);

CREATE TABLE sabbath_school_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES sabbath_school_classes(id),
    lesson_title TEXT,
    lesson_date DATE
);

CREATE TABLE sabbath_school_offerings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES sabbath_school_classes(id),
    offering_amount NUMERIC,
    offering_date DATE
);

----------------------------------------------------
-- CONTRIBUTIONS & FINANCE
----------------------------------------------------

CREATE TABLE contribution_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT
);

CREATE TABLE contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID,
    contribution_type_id UUID REFERENCES contribution_types(id),
    amount NUMERIC,
    contribution_date DATE,
    service_date DATE,
    fund_id INTEGER
);

CREATE TABLE offering_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT
);

CREATE TABLE offerings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES offering_categories(id),
    amount NUMERIC,
    offering_date DATE
);

CREATE TABLE tithe_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID,
    amount NUMERIC,
    tithe_date DATE
);

CREATE TABLE financial_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    type TEXT
);

CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES financial_accounts(id),
    amount NUMERIC,
    transaction_type TEXT,
    transaction_date DATE
);

CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES departments(id),
    amount NUMERIC,
    year INTEGER
);

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES departments(id),
    amount NUMERIC,
    description TEXT,
    expense_date DATE
);

----------------------------------------------------
-- ANNOUNCEMENTS & COMMUNICATION
----------------------------------------------------

CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES churches(id),
    title TEXT,
    message TEXT,
    published_at TIMESTAMPTZ
);

CREATE TABLE announcement_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID REFERENCES announcements(id),
    member_id UUID,
    read_at TIMESTAMPTZ
);

CREATE TABLE prayer_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID,
    request TEXT,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE testimonies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

----------------------------------------------------
-- ASSETS & INVENTORY
----------------------------------------------------

CREATE TABLE asset_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT
);

CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES asset_categories(id),
    name TEXT,
    purchase_date DATE,
    value NUMERIC
);

CREATE TABLE asset_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES assets(id),
    maintenance_date DATE,
    notes TEXT
);

CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    quantity INTEGER
);

CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES inventory_items(id),
    quantity INTEGER,
    transaction_type TEXT,
    transaction_date DATE
);

----------------------------------------------------
-- PASTORAL CARE
----------------------------------------------------

CREATE TABLE visitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID,
    pastor_id UUID,
    visit_date DATE,
    notes TEXT
);

CREATE TABLE counseling_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID,
    counselor_id UUID,
    session_date DATE,
    notes TEXT
);

CREATE TABLE discipline_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID,
    case_status TEXT,
    description TEXT
);

----------------------------------------------------
-- TRAINING & DISCIPLESHIP
----------------------------------------------------

CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    description TEXT
);

CREATE TABLE course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id),
    member_id UUID
);

CREATE TABLE course_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id),
    title TEXT
);

CREATE TABLE lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES course_lessons(id),
    member_id UUID,
    completed BOOLEAN
);

----------------------------------------------------
-- SYSTEM & AUDIT
----------------------------------------------------

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT
);

CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES roles(id),
    permission_id UUID REFERENCES permissions(id)
);

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    role_id UUID REFERENCES roles(id)
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action TEXT,
    table_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
