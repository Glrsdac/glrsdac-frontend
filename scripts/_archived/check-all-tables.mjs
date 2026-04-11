import pg from 'pg';
const { Client } = pg;

const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error('Missing SUPABASE_DB_URL');
  process.exit(1);
}

const client = new Client({
  connectionString: dbUrl,
});

try {
  await client.connect();
  
  // Get all tables in public schema
  const result = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  
  console.log('\n📋 Tables in public schema:');
  for (const row of result.rows) {
    console.log(`  - ${row.table_name}`);
  }
  
  // Check for users data
  const usersResult = await client.query(`
    SELECT COUNT(*) as count FROM auth.users
  `);
  console.log(`\n👥 Users in auth.users: ${usersResult.rows[0].count}`);
  
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
} finally {
  await client.end();
}
