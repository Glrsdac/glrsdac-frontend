import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error('❌ SUPABASE_DB_URL not set');
  process.exit(1);
}

async function checkPasswords() {
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('🔍 Checking password hashes:\n');
    const result = await client.query(`
      SELECT 
        id,
        email,
        encrypted_password,
        LENGTH(encrypted_password) as hash_length
      FROM auth.users 
      WHERE email IN ('admin@glrsdac.com', 'treasurer@glrsdac.com', 'clerk@glrsdac.com')
      ORDER BY email
    `);

    result.rows.forEach(row => {
      console.log(`📧 ${row.email}`);
      console.log(`   Password hash length: ${row.hash_length}`);
      console.log(`   Hash starts with: ${row.encrypted_password?.substring(0, 20)}...`);
      console.log(`   Hash is bcrypt: ${row.encrypted_password?.startsWith('$2') ? 'Yes ✓' : 'No ✗'}`);
      console.log('');
    });

    // Also check if there's a testing existing user we can use
    console.log('\n📋 All test users in system:');
    const allTestUsers = await client.query(`
      SELECT 
        email,
        encrypted_password,
        email_confirmed_at
      FROM auth.users 
      WHERE email LIKE '%test%' OR email LIKE '%glrsdac%'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    allTestUsers.rows.forEach(row => {
      console.log(`   ${row.email} - Confirmed: ${row.email_confirmed_at ? 'Yes' : 'No'}`);
    });

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkPasswords();
