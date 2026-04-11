import pg from 'pg';
const { Client } = pg;

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ SUPABASE_DB_URL or DATABASE_URL required');
  process.exit(1);
}

const client = new Client({ connectionString: dbUrl });

async function diagnose() {
  try {
    await client.connect();
    console.log('✅ Connected to DB');

const adminId = 'e6801862-882e-4b41-ac21-b064e28a173b';

    // 1. Confirm user
    const userRes = await client.query('SELECT id, email, confirmed_at FROM auth.users WHERE id = $1', [adminId]);
    console.log('\n👤 User:', userRes.rows[0] || 'NOT FOUND');

    // 2. User roles
    const rolesRes = await client.query(`
      SELECT * FROM public.user_roles 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [adminId]);
    console.log('\n🔑 User Roles:', rolesRes.rows);
    console.log(`Total roles: ${rolesRes.rows.length}`);

    // 3. Check expected manager roles
    const managerRoles = ['ADMIN', 'TREASURER', 'CLERK', 'System Admin', 'Super Admin', 'SuperAdmin'];
    const hasManagerRole = rolesRes.rows.some(r => 
      managerRoles.includes(r.role) && r.is_active
    );
    console.log('\n🎯 Has Manager Role:', hasManagerRole);

    // 4. Active profiles
    const profileRes = await client.query('SELECT * FROM public.profiles WHERE id = $1', [adminId]);
    console.log('\n📋 Profile:', profileRes.rows[0] || 'NONE');

    // 5. Members
    const memberRes = await client.query('SELECT * FROM public.members WHERE user_id = $1', [adminId]);
    console.log('\n👥 Members:', memberRes.rows);

    // 6. Department memberships
    if (memberRes.rows.length > 0) {
      const memberId = memberRes.rows[0].id;
      const deptRes = await client.query('SELECT * FROM public.department_members WHERE member_id = $1', [memberId]);
      console.log('\n🏢 Department Memberships:', deptRes.rows);
    }

    // 7. All available roles
    const allRolesRes = await client.query('SELECT name FROM public.roles ORDER BY name');
    console.log('\n📜 Available Roles:', allRolesRes.rows.map(r => r.name));

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

diagnose();
