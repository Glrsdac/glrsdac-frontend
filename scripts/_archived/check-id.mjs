import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function check() {
  const client = new pg.Client({connectionString: process.env.SUPABASE_DB_URL, ssl:{rejectUnauthorized: false}});
  await client.connect();
  const result = await client.query(`
    SELECT id, email FROM public.profiles WHERE id = '550e8400-e29b-41d4-a716-446655440001'
  `);
  console.log('Profiles with this ID:', result.rows);
  
  const authResult = await client.query(`
    SELECT id, email FROM auth.users WHERE id = '550e8400-e29b-41d4-a716-446655440001'
  `);
  console.log('Auth users with this ID:', authResult.rows);
  
  await client.end();
}

check();
