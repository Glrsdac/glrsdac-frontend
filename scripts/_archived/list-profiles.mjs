import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function listProfiles() {
  const client = new pg.Client({connectionString: process.env.SUPABASE_DB_URL, ssl:{rejectUnauthorized: false}});
  await client.connect();
  
  console.log('All Profiles:');
  const result = await client.query(`SELECT id, email FROM public.profiles ORDER BY email LIMIT 10`);
  console.log('Count:', result.rows.length);
  result.rows.forEach(r => {
    console.log('  ID:', r.id, 'Email:', r.email);
  });
  
  // Check for the specific admin one that's failing
  const admin = result.rows.find(r => r.email === 'admin@glrsdac.com');
  console.log('\nLooking for admin@glrsdac.com:', admin);
  
  await client.end();
}

listProfiles();
