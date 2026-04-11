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
  
  console.log('Reading cleanup SQL...');
  const cleanupSql = fs.readFileSync('./supabase/migrations/cleanup_old_rbac.sql', 'utf-8');
  
  console.log('Dropping old tables...');
  await client.query(cleanupSql);
  console.log('✅ Old tables dropped');
  
  console.log('\nReading migration SQL...');
  const migrationSql = fs.readFileSync('./supabase/migrations/add_rbac_tables.sql', 'utf-8');
  
  console.log('Creating new RBAC tables...');
  await client.query(migrationSql);
  
  console.log('✅ Migration successful!');
} catch (error) {
  console.error('❌ Migration failed:');
  console.error('Error:', error.message);
  if (error.position) {
    console.error('Position in query:', error.position);
  }
  process.exit(1);
} finally {
  await client.end();
}
