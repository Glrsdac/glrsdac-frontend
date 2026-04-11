import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const DB_URL = process.env.SUPABASE_DB_URL;

if (!DB_URL) {
  console.error('❌ Missing SUPABASE_DB_URL');
  process.exit(1);
}

const dbClient = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

async function checkDatabase() {
  console.log('📊 DATABASE CONNECTION CHECK\n');
  console.log('=' .repeat(70) + '\n');

  try {
    await dbClient.connect();
    console.log('✅ Connected to database\n');

    // Check if members table exists
    const tablesResult = await dbClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log(`📋 Tables in database (${tablesResult.rows.length}):\n`);
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Check members table contents
    console.log('\n' + '=' .repeat(70) + '\n');
    console.log('📋 Members in database:\n');

    const membersResult = await dbClient.query(`
      SELECT id, first_name, last_name, email, user_id
      FROM public.members
      ORDER BY first_name
    `);

    if (membersResult.rows.length === 0) {
      console.log('⚠️  No members found in database!');
    } else {
      membersResult.rows.forEach((member, idx) => {
        console.log(`${idx + 1}. ${member.first_name} ${member.last_name}`);
        console.log(`   ID: ${member.id}`);
        console.log(`   Email: ${member.email || 'N/A'}`);
        console.log(`   User ID: ${member.user_id || 'Not linked'}`);
        console.log('');
      });
    }

    // Check profiles table
    console.log('=' .repeat(70) + '\n');
    console.log('📋 Profiles in database:\n');

    const profilesResult = await dbClient.query(`
      SELECT id, email, full_name
      FROM public.profiles
      ORDER BY email
    `);

    if (profilesResult.rows.length === 0) {
      console.log('⚠️  No profiles found in database!');
    } else {
      console.log(`Found ${profilesResult.rows.length} profiles:\n`);
      profilesResult.rows.forEach((profile, idx) => {
        console.log(`${idx + 1}. ${profile.full_name} (${profile.email})`);
      });
    }

    await dbClient.end();
    console.log('\n✅ Database check complete');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();
