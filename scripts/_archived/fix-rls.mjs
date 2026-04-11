import fs from 'fs';
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
  console.log('Connecting to database...');
  await client.connect();
  
  console.log('Reading RLS fix SQL...');
  const fixSql = fs.readFileSync('./supabase/migrations/fix_rls_service_role.sql', 'utf-8');
  
  console.log('Applying RLS fixes...');
  await client.query(fixSql);
  
  console.log('✅ RLS policies fixed!');
} catch (error) {
  console.error('❌ Failed:', error.message);
  process.exit(1);
} finally {
  await client.end();
}
