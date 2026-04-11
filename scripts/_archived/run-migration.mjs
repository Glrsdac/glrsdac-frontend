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
  
  console.log('Reading SQL file...');
  const sql = fs.readFileSync('./supabase/migrations/add_rbac_tables.sql', 'utf-8');
  
  console.log('Executing migration...');
  await client.query(sql);
  
  console.log('✅ Migration successful!');
} catch (error) {
  console.error('❌ Migration failed:');
  console.error('Error:', error.message);
  if (error.position) {
    console.error('Position in query:', error.position);
    const sql = fs.readFileSync('./supabase/migrations/add_rbac_tables.sql', 'utf-8');
    const lines = sql.substring(0, error.position).split('\n');
    console.error('Approximate line in file:', lines.length);
    console.error('Context:', lines.slice(-3).join('\n'));
  }
  if (error.line) {
    console.error('Line reported by PG:', error.line);
  }
  console.error('\nFull error object:', JSON.stringify(error, null, 2));
  process.exit(1);
} finally {
  await client.end();
}
