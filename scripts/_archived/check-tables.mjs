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
  
  const tables = ['roles', 'permissions', 'role_permissions', 'departments', 'user_roles'];
  
  for (const table of tables) {
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [table]);
    
    if (result.rows.length > 0) {
      console.log(`\n✅ Table "${table}" exists with columns:`);
      result.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log(`\n❌ Table "${table}" does NOT exist`);
    }
  }
  
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
} finally {
  await client.end();
}
