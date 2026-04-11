import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function comparePasswords() {
  const client = new pg.Client({connectionString: process.env.SUPABASE_DB_URL, ssl:{rejectUnauthorized: false}});
  await client.connect();
  
  console.log('📋 Comparing password formats:\n');
  
  // New users we just created
  const newUsers = await client.query(`
    SELECT email, encrypted_password FROM auth.users 
    WHERE email IN ('admin@glrsdac.com', 'treasurer@glrsdac.com', 'clerk@glrsdac.com')
  `);
  
  console.log('New users (created with crypt):');
  newUsers.rows.forEach(r => {
    console.log(`  ${r.email}`);
    console.log(`    Hash: ${r.encrypted_password.substring(0, 40)}...`);
    console.log(`    Length: ${r.encrypted_password.length}`);
    console.log(`    Starts with $2: ${r.encrypted_password.startsWith('$2') ? 'Yes' : 'No'}`);
  });
  
  // Old users that might work
  const oldUsers = await client.query(`
    SELECT email, encrypted_password FROM auth.users 
    WHERE email IN ('admin@test.com', 'test@example.com')
    LIMIT 2
  `);
  
  console.log('\nOld users (for comparison):');
  oldUsers.rows.forEach(r => {
    console.log(`  ${r.email}`);
    console.log(`    Hash: ${r.encrypted_password.substring(0, 40)}...`);
    console.log(`    Length: ${r.encrypted_password.length}`);
    console.log(`    Starts with $2: ${r.encrypted_password.startsWith('$2') ? 'Yes' : 'No'}`);
  });
  
  await client.end();
}

comparePasswords();
