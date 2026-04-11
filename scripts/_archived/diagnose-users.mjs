import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error('❌ SUPABASE_DB_URL not set');
  process.exit(1);
}

async function diagnoseUsers() {
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('📋 Checking auth.users details:\n');
    const result = await client.query(`
      SELECT 
        id,
        email,
        email_confirmed_at,
        confirmed_at,
        last_sign_in_at,
        is_super_admin,
        raw_app_meta_data,
        created_at
      FROM auth.users 
      WHERE email IN ('admin@glrsdac.com', 'treasurer@glrsdac.com', 'clerk@glrsdac.com')
      ORDER BY email
    `);

    result.rows.forEach(row => {
      console.log(`📧 ${row.email}`);
      console.log(`   ID: ${row.id}`);
      console.log(`   Email Confirmed: ${row.email_confirmed_at ? 'Yes ✓' : 'No ✗'}`);
      console.log(`   Confirmed At: ${row.confirmed_at}`);
      console.log(`   Last Sign In: ${row.last_sign_in_at || 'Never'}`);
      console.log(`   Super Admin: ${row.is_super_admin}`);
      console.log(`   App Meta Data: ${JSON.stringify(row.raw_app_meta_data)}`);
      console.log('');
    });

    console.log('🔧 Fixing users - ensuring they are confirmed...\n');

    const updateResult = await client.query(`
      UPDATE auth.users
      SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
          confirmed_at = COALESCE(confirmed_at, now())
      WHERE email IN ('admin@glrsdac.com', 'treasurer@glrsdac.com', 'clerk@glrsdac.com')
      RETURNING email, email_confirmed_at
    `);

    console.log(`✅ Updated ${updateResult.rowCount} users`);
    updateResult.rows.forEach(row => {
      console.log(`   ${row.email} - Confirmed at: ${row.email_confirmed_at}`);
    });

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

diagnoseUsers();
