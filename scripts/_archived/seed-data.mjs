import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error('❌ SUPABASE_DB_URL not set');
  process.exit(1);
}

async function seedData() {
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    await client.query('BEGIN');

    // 1. Create test users via SQL (simulating Supabase Auth)
    console.log('📝 Creating test users in auth.users...');
    
    // Admin user
    const adminInsert = `
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, last_sign_in_at)
      VALUES (
        '550e8400-e29b-41d4-a716-446655440001'::uuid,
        'admin@glrsdac.com',
        crypt('Admin@123', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{}',
        now(),
        now(),
        now()
      )
      ON CONFLICT DO NOTHING;
    `;
    await client.query(adminInsert);
    console.log('   ✓ Admin user (admin@glrsdac.com / Admin@123)');

    // Treasurer user
    const treasurerInsert = `
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, last_sign_in_at)
      VALUES (
        '550e8400-e29b-41d4-a716-446655440002'::uuid,
        'treasurer@glrsdac.com',
        crypt('Treasurer@123', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{}',
        now(),
        now(),
        now()
      )
      ON CONFLICT DO NOTHING;
    `;
    await client.query(treasurerInsert);
    console.log('   ✓ Treasurer user (treasurer@glrsdac.com / Treasurer@123)');

    // Clerk user
    const clerkInsert = `
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, last_sign_in_at)
      VALUES (
        '550e8400-e29b-41d4-a716-446655440003'::uuid,
        'clerk@glrsdac.com',
        crypt('Clerk@123', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{}',
        now(),
        now(),
        now()
      )
      ON CONFLICT DO NOTHING;
    `;
    await client.query(clerkInsert);
    console.log('   ✓ Clerk user (clerk@glrsdac.com / Clerk@123)');

    // 2. Create profiles
    console.log('\n📝 Creating profiles...');
    const profileInsert = `
      INSERT INTO public.profiles (id, full_name, email, created_at)
      VALUES 
        ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'Admin User', 'admin@glrsdac.com', now()),
        ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'Treasurer User', 'treasurer@glrsdac.com', now()),
        ('550e8400-e29b-41d4-a716-446655440003'::uuid, 'Clerk User', 'clerk@glrsdac.com', now())
      ON CONFLICT DO NOTHING;
    `;
    await client.query(profileInsert);
    console.log('   ✓ Profiles created');

    // 3. Create user roles
    console.log('\n📝 Creating user roles...');
    const roleInsert = `
      INSERT INTO public.user_roles (user_id, role)
      VALUES 
        ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'ADMIN'),
        ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'TREASURER'),
        ('550e8400-e29b-41d4-a716-446655440003'::uuid, 'CLERK')
      ON CONFLICT DO NOTHING;
    `;
    await client.query(roleInsert);
    console.log('   ✓ Roles assigned');

    // 4. Create departments
    console.log('\n📝 Creating departments...');
    const deptInsert = `
      INSERT INTO public.departments (name, description, is_active)
      VALUES 
        ('Finance', 'Finance Department', true),
        ('Ushers', 'Ushers Ministry', true),
        ('Music', 'Music Ministry', true),
        ('Education', 'Christian Education', true),
        ('Outreach', 'Outreach Ministry', true)
      ON CONFLICT DO NOTHING;
    `;
    await client.query(deptInsert);
    console.log('   ✓ Departments created');

    // 5. Create fund groups
    console.log('\n📝 Creating fund groups...');
    const fundGroupInsert = `
      INSERT INTO public.fund_groups (name, description, is_active)
      VALUES 
        ('General Fund', 'General Church Funds', true),
        ('Special Appeals', 'Special Appeals Fund', true),
        ('Building Fund', 'Church Building Fund', true)
      ON CONFLICT DO NOTHING;
    `;
    await client.query(fundGroupInsert);
    console.log('   ✓ Fund groups created');

    // 6. Create funds
    console.log('\n📝 Creating funds...');
    const fundInsert = `
      INSERT INTO public.funds (name, fund_group_id, allocation_type, local_percentage, district_percentage, conference_percentage, is_member_tracked, requires_return, return_frequency, is_active)
      VALUES 
        ('Tithe', 1, 'SPLIT', 40.0, 30.0, 30.0, true, true, 'MONTHLY', true),
        ('First Fruit', 1, 'LOCAL', 100.0, 0.0, 0.0, true, false, 'MONTHLY', true),
        ('Offering', 1, 'SPLIT', 50.0, 25.0, 25.0, true, true, 'MONTHLY', true),
        ('Building Fund', 3, 'LOCAL', 100.0, 0.0, 0.0, true, false, 'MONTHLY', true),
        ('Outreach', 2, 'LOCAL', 100.0, 0.0, 0.0, false, false, 'MONTHLY', true)
      ON CONFLICT DO NOTHING;
    `;
    await client.query(fundInsert);
    console.log('   ✓ Funds created');

    // 7. Create members
    console.log('\n📝 Creating sample members...');
    const memberInsert = `
      INSERT INTO public.members (first_name, last_name, phone, email, position, dob, status, user_id)
      VALUES 
        ('John', 'Doe', '0245123456', 'john@example.com', 'Elder', '1980-01-15'::date, 'ACTIVE', '550e8400-e29b-41d4-a716-446655440001'::uuid),
        ('Jane', 'Smith', '0245654321', 'jane@example.com', 'Deacon', '1985-03-20'::date, 'ACTIVE', '550e8400-e29b-41d4-a716-446655440002'::uuid),
        ('Samuel', 'Johnson', '0241234567', 'samuel@example.com', 'Member', '1990-07-10'::date, 'ACTIVE', '550e8400-e29b-41d4-a716-446655440003'::uuid),
        ('Mary', 'Williams', '0247654321', 'mary@example.com', 'Member', '1988-05-25'::date, 'ACTIVE', null),
        ('Peter', 'Brown', '0243456789', 'peter@example.com', 'Member', '1995-11-30'::date, 'ACTIVE', null),
        ('Grace', 'Davis', '0249876543', 'grace@example.com', 'Member', '1992-09-12'::date, 'ACTIVE', null)
      ON CONFLICT DO NOTHING;
    `;
    await client.query(memberInsert);
    console.log('   ✓ Members created');

    // 8. Create bank accounts
    console.log('\n📝 Creating bank accounts...');
    const bankInsert = `
      INSERT INTO public.bank_accounts (name, account_type, account_number, bank_name, is_active)
      VALUES 
        ('Main Operating Account', 'CURRENT', '1234567890', 'Ghana Commercial Bank', true),
        ('Savings Account', 'SAVINGS', '0987654321', 'Ecobank Ghana', true)
      ON CONFLICT DO NOTHING;
    `;
    await client.query(bankInsert);
    console.log('   ✓ Bank accounts created');

    // 9. Create sabbath sessions
    console.log('\n📝 Creating sabbath sessions...');
    const sessionInsert = `
      INSERT INTO public.sabbath_sessions (date, status, notes)
      VALUES 
        ('2026-02-21'::date, 'CLOSED', 'Regular sabbath service'),
        ('2026-02-14'::date, 'CLOSED', 'Regular sabbath service'),
        ('2026-02-07'::date, 'CLOSED', 'Regular sabbath service')
      ON CONFLICT DO NOTHING;
    `;
    await client.query(sessionInsert);
    console.log('   ✓ Sabbath sessions created');

    // 10. Create sabbath accounts
    console.log('\n📝 Creating sabbath accounts...');
    const sabbathAcctInsert = `
      INSERT INTO public.sabbath_accounts (week_start, week_end, status)
      VALUES 
        ('2026-02-21'::date, '2026-02-27'::date, 'CLOSED'),
        ('2026-02-14'::date, '2026-02-20'::date, 'CLOSED'),
        ('2026-02-07'::date, '2026-02-13'::date, 'CLOSED')
      ON CONFLICT DO NOTHING;
    `;
    await client.query(sabbathAcctInsert);
    console.log('   ✓ Sabbath accounts created');

    // 11. Create imprest accounts
    console.log('\n📝 Creating imprest accounts...');
    const imprestAcctInsert = `
      INSERT INTO public.imprest_accounts (name, description, holder_type, is_active)
      VALUES 
        ('Finance Committee', 'Finance Committee Imprest', 'DEPARTMENT', true),
        ('Usher Board', 'Usher Board Imprest', 'DEPARTMENT', true),
        ('Maintenance Fund', 'Maintenance Imprest', 'PERSON', true)
      ON CONFLICT DO NOTHING;
    `;
    await client.query(imprestAcctInsert);
    console.log('   ✓ Imprest accounts created');

    // 12. Create department members
    console.log('\n📝 Assigning department members...');
    const deptMembersInsert = `
      INSERT INTO public.department_members (department_id, member_id, assigned_role)
      SELECT d.id, m.id, 'Member'
      FROM public.departments d, public.members m
      WHERE d.name IN ('Finance', 'Ushers', 'Music')
      AND m.first_name IN ('John', 'Jane', 'Samuel', 'Mary')
      ON CONFLICT DO NOTHING;
    `;
    await client.query(deptMembersInsert);
    console.log('   ✓ Department members assigned');

    await client.query('COMMIT');
    console.log('\n✅ All seed data created successfully!');
    console.log('\n📊 Test Credentials:');
    console.log('   Admin: admin@glrsdac.com / Admin@123');
    console.log('   Treasurer: treasurer@glrsdac.com / Treasurer@123');
    console.log('   Clerk: clerk@glrsdac.com / Clerk@123');

    await client.end();
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

seedData();
