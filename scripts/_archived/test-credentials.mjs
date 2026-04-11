import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error('❌ SUPABASE_DB_URL not set');
  process.exit(1);
}

async function testCredentials() {
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check auth.users
    console.log('📋 Auth Users:');
    const authUsersResult = await client.query(`
      SELECT id, email, created_at, last_sign_in_at 
      FROM auth.users 
      ORDER BY created_at DESC
    `);
    
    if (authUsersResult.rows.length === 0) {
      console.log('   ❌ NO AUTH USERS FOUND!');
    } else {
      authUsersResult.rows.forEach(row => {
        console.log(`   - ${row.email} (ID: ${row.id})`);
        console.log(`     Created: ${row.created_at}`);
        console.log(`     Last login: ${row.last_sign_in_at || 'Never'}`);
      });
    }

    // Check profiles
    console.log('\n📋 Profiles:');
    const profilesResult = await client.query(`
      SELECT id, full_name, email, created_at 
      FROM public.profiles 
      ORDER BY created_at DESC
    `);
    
    if (profilesResult.rows.length === 0) {
      console.log('   ❌ NO PROFILES FOUND!');
    } else {
      profilesResult.rows.forEach(row => {
        console.log(`   - ${row.full_name} (${row.email})`);
        console.log(`     ID: ${row.id}`);
      });
    }

    // Check user_roles
    console.log('\n📋 User Roles:');
    const rolesResult = await client.query(`
      SELECT ur.user_id, ur.role, p.email 
      FROM public.user_roles ur
      LEFT JOIN public.profiles p ON ur.user_id = p.id
      ORDER BY ur.id DESC
    `);
    
    if (rolesResult.rows.length === 0) {
      console.log('   ❌ NO ROLES ASSIGNED!');
    } else {
      rolesResult.rows.forEach(row => {
        console.log(`   - ${row.email || 'Unknown'}: ${row.role}`);
      });
    }

    // Check members
    console.log('\n📋 Members:');
    const membersResult = await client.query(`
      SELECT id, first_name, last_name, email, user_id 
      FROM public.members 
      ORDER BY id DESC LIMIT 6
    `);
    
    if (membersResult.rows.length === 0) {
      console.log('   ❌ NO MEMBERS FOUND!');
    } else {
      membersResult.rows.forEach(row => {
        console.log(`   - ${row.first_name} ${row.last_name} (${row.email})`);
        console.log(`     Member ID: ${row.id}, User ID: ${row.user_id || 'Not linked'}`);
      });
    }

    // Test has_role function
    console.log('\n🔐 Testing has_role() function:');
    const testRoles = [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
      '550e8400-e29b-41d4-a716-446655440003',
    ];

    for (const userId of testRoles) {
      const result = await client.query(`
        SELECT 
          $1::uuid as user_id,
          has_role($1::uuid, 'ADMIN'::app_role) as is_admin,
          has_role($1::uuid, 'TREASURER'::app_role) as is_treasurer,
          has_role($1::uuid, 'CLERK'::app_role) as is_clerk
      `, [userId]);
      const row = result.rows[0];
      console.log(`   User ${userId}:`);
      console.log(`     - ADMIN: ${row.is_admin}`);
      console.log(`     - TREASURER: ${row.is_treasurer}`);
      console.log(`     - CLERK: ${row.is_clerk}`);
    }

    console.log('\n✅ Credential verification complete!');
    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testCredentials();
