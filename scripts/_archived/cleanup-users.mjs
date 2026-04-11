import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error('❌ SUPABASE_DB_URL not set');
  process.exit(1);
}

async function cleanup() {
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('🧹 Cleaning up existing test users...\n');

    const userIds = [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
      '550e8400-e29b-41d4-a716-446655440003'
    ];

    console.log('Deleting user roles...');
    const rolesResult = await client.query(
      'DELETE FROM public.user_roles WHERE user_id = ANY($1)',
      [userIds]
    );
    console.log(`   ✓ Deleted ${rolesResult.rowCount} role entries`);

    console.log('Deleting profiles...');
    const profilesResult = await client.query(
      'DELETE FROM public.profiles WHERE id = ANY($1)',
      [userIds]
    );
    console.log(`   ✓ Deleted ${profilesResult.rowCount} profiles`);

    console.log('Deleting auth users...');
    const usersResult = await client.query(
      'DELETE FROM auth.users WHERE id = ANY($1)',
      [userIds]
    );
    console.log(`   ✓ Deleted ${usersResult.rowCount} auth users`);

    console.log('\n✅ Cleanup complete!');
    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanup();
