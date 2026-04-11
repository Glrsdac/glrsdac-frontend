import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_URL = process.env.SUPABASE_DB_URL;

if (!VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !DB_URL) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

// Supabase Admin client for Auth
const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Database client for direct queries
const dbClient = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

async function completeUserManagement() {
  console.log('👥 COMPLETE USER MANAGEMENT SETUP\n');
  console.log('=' .repeat(60) + '\n');

  try {
    // Connect to database
    await dbClient.connect();

    // ========== PHASE 1: Create Member Users ==========
    console.log('📝 PHASE 1: Creating user accounts for existing members...\n');

    const memberUsers = [
      { 
        email: 'mary.williams@glrsdac.com', 
        password: 'MaryWilliams@2026',
        member_name: 'Mary Williams',
        role: 'VIEWER'
      },
      { 
        email: 'peter.brown@glrsdac.com', 
        password: 'PeterBrown@2026',
        member_name: 'Peter Brown',
        role: 'VIEWER'
      },
      { 
        email: 'grace.davis@glrsdac.com', 
        password: 'GraceDavis@2026',
        member_name: 'Grace Davis',
        role: 'VIEWER'
      },
    ];

    const memberUserIds = {};

    for (const user of memberUsers) {
      console.log(`  📧 Creating: ${user.email} (${user.member_name})`);

      try {
        const { data, error } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
        });

        if (error) {
          console.log(`     ⚠️  Skipped: ${error.message}`);
          continue;
        }

        const userId = data.user?.id;
        memberUserIds[user.member_name] = userId;

        // Update profile
        await supabase
          .from('profiles')
          .update({ full_name: user.member_name })
          .eq('id', userId);

        // Assign role
        await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: user.role });

        // Link to member record
        await dbClient.query(
          'UPDATE public.members SET user_id = $1 WHERE first_name || \' \' || last_name = $2',
          [userId, user.member_name]
        );

        console.log(`     ✅ Created & linked to member`);
      } catch (err) {
        console.log(`     ❌ Error: ${err.message}`);
      }
    }

    // ========== PHASE 2: Create Department Head Users ==========
    console.log('\n📝 PHASE 2: Creating department head users...\n');

    const deptHeadUsers = [
      { 
        email: 'finance.head@glrsdac.com', 
        password: 'FinanceHead@2026',
        name: 'Finance Head',
        role: 'TREASURER',
        dept: 'Finance'
      },
      { 
        email: 'ushers.head@glrsdac.com', 
        password: 'UshersHead@2026',
        name: 'Ushers Head',
        role: 'CLERK',
        dept: 'Ushers'
      },
      { 
        email: 'music.head@glrsdac.com', 
        password: 'MusicHead@2026',
        name: 'Music Head',
        role: 'CLERK',
        dept: 'Music'
      },
    ];

    for (const user of deptHeadUsers) {
      console.log(`  📧 Creating: ${user.email} (${user.dept} Head)`);

      try {
        const { data, error } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
        });

        if (error) {
          console.log(`     ⚠️  Skipped: ${error.message}`);
          continue;
        }

        const userId = data.user?.id;

        // Update profile
        await supabase
          .from('profiles')
          .update({ full_name: user.name })
          .eq('id', userId);

        // Assign role
        await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: user.role });

        console.log(`     ✅ Created with ${user.role} role`);
      } catch (err) {
        console.log(`     ❌ Error: ${err.message}`);
      }
    }

    // ========== PHASE 3: Create Viewer Accounts ==========
    console.log('\n📝 PHASE 3: Creating viewer accounts...\n');

    const viewerUsers = [
      { 
        email: 'viewer1@glrsdac.com', 
        password: 'Viewer1@2026',
        name: 'Viewer Account 1',
        role: 'VIEWER'
      },
      { 
        email: 'viewer2@glrsdac.com', 
        password: 'Viewer2@2026',
        name: 'Viewer Account 2',
        role: 'VIEWER'
      },
    ];

    for (const user of viewerUsers) {
      console.log(`  📧 Creating: ${user.email}`);

      try {
        const { data, error } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
        });

        if (error) {
          console.log(`     ⚠️  Skipped: ${error.message}`);
          continue;
        }

        const userId = data.user?.id;

        // Update profile
        await supabase
          .from('profiles')
          .update({ full_name: user.name })
          .eq('id', userId);

        // Assign role
        await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: user.role });

        console.log(`     ✅ Created with VIEWER role`);
      } catch (err) {
        console.log(`     ❌ Error: ${err.message}`);
      }
    }

    // ========== PHASE 4: List All Users ==========
    console.log('\n📝 PHASE 4: User Management Summary\n');
    console.log('=' .repeat(60) + '\n');

    const result = await dbClient.query(`
      SELECT 
        p.full_name,
        p.email,
        string_agg(ur.role::text, ', ') as roles
      FROM public.profiles p
      LEFT JOIN public.user_roles ur ON p.id = ur.user_id
      GROUP BY p.id, p.full_name, p.email
      ORDER BY p.email
    `);

    console.log('📋 Complete User List:\n');
    result.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ${row.full_name}`);
      console.log(`   Email: ${row.email}`);
      console.log(`   Roles: ${row.roles || 'No roles assigned'}`);
      console.log('');
    });

    // ========== PHASE 5: Role Distribution ==========
    console.log('\n📊 Role Distribution:\n');

    const roleStats = await dbClient.query(`
      SELECT 
        role::text as role,
        COUNT(*) as count
      FROM public.user_roles
      GROUP BY role::text
      ORDER BY role::text
    `);

    roleStats.rows.forEach(row => {
      console.log(`  ${row.role}: ${row.count} user(s)`);
    });

    // ========== PHASE 6: Department Assignments ==========
    console.log('\n\n📝 PHASE 5: Department Member Assignments\n');
    console.log('=' .repeat(60) + '\n');

    const deptResult = await dbClient.query(`
      SELECT 
        d.name as department,
        COUNT(dm.id) as member_count,
        string_agg(m.first_name || ' ' || m.last_name, ', ' ORDER BY m.first_name) as members
      FROM public.departments d
      LEFT JOIN public.department_members dm ON d.id = dm.department_id
      LEFT JOIN public.members m ON dm.member_id = m.id
      GROUP BY d.id, d.name
      ORDER BY d.name
    `);

    console.log('📋 Department Membership:\n');
    deptResult.rows.forEach(row => {
      console.log(`${row.department}: ${row.member_count} member(s)`);
      if (row.members) {
        console.log(`  Members: ${row.members}`);
      }
      console.log('');
    });

    console.log('\n' + '=' .repeat(60));
    console.log('✅ USER MANAGEMENT SETUP COMPLETE!\n');

    console.log('📝 Test User Credentials:\n');
    console.log('ADMINS:');
    console.log('  admin@glrsdac.com / Admin@123\n');
    console.log('TREASURERS:');
    console.log('  treasurer@glrsdac.com / Treasurer@123');
    console.log('  finance.head@glrsdac.com / FinanceHead@2026\n');
    console.log('CLERKS:');
    console.log('  clerk@glrsdac.com / Clerk@123');
    console.log('  ushers.head@glrsdac.com / UshersHead@2026');
    console.log('  music.head@glrsdac.com / MusicHead@2026\n');
    console.log('MEMBERS (Viewers):');
    console.log('  mary.williams@glrsdac.com / MaryWilliams@2026');
    console.log('  peter.brown@glrsdac.com / PeterBrown@2026');
    console.log('  grace.davis@glrsdac.com / GraceDavis@2026\n');
    console.log('GENERAL VIEWERS:');
    console.log('  viewer1@glrsdac.com / Viewer1@2026');
    console.log('  viewer2@glrsdac.com / Viewer2@2026\n');

    console.log('=' .repeat(60));

    await dbClient.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

completeUserManagement();
