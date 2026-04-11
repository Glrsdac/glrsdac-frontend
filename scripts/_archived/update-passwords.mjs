import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function updateToSimplePasswords() {
  const client = new pg.Client({connectionString: process.env.SUPABASE_DB_URL, ssl:{rejectUnauthorized: false}});
  await client.connect();
  
  console.log('🔐 Updating users with simpler test passwords...\n');
  
  const users = [
    { email: 'admin@glrsdac.com', password: 'admin123' },
    { email: 'treasurer@glrsdac.com', password: 'treasurer123' },
    { email: 'clerk@glrsdac.com', password: 'clerk123' },
  ];
  
  for (const user of users) {
    await client.query(
      'UPDATE auth.users SET encrypted_password = crypt($1, gen_salt(\'bf\', 10)) WHERE email = $2',
      [user.password, user.email]
    );
    console.log(`  Updated ${user.email} with password: ${user.password}`);
  }
  
  console.log('\n✅ Passwords updated\n');
  console.log('📝 Updated Credentials:');
  console.log('   Admin: admin@glrsdac.com / admin123');
  console.log('   Treasurer: treasurer@glrsdac.com / treasurer123');
  console.log('   Clerk: clerk@glrsdac.com / clerk123');
  
  await client.end();
}

updateToSimplePasswords();
