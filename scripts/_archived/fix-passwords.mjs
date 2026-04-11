import pg from 'pg';
import * as dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error('❌ SUPABASE_DB_URL not set');
  process.exit(1);
}

async function fixUserPasswords() {
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const users = [
      { email: 'admin@glrsdac.com', password: 'Admin@123' },
      { email: 'treasurer@glrsdac.com', password: 'Treasurer@123' },
      { email: 'clerk@glrsdac.com', password: 'Clerk@123' },
    ];

    for (const user of users) {
      console.log(`🔐 Updating password for ${user.email}...`);

      // Hash the password using bcrypt (same as Supabase does)
      const hashedPassword = await bcrypt.hash(user.password, 10);

      // Update the password in auth.users
      const result = await client.query(
        `UPDATE auth.users 
         SET encrypted_password = $1, updated_at = now()
         WHERE email = $2
         RETURNING id, email`,
        [hashedPassword, user.email]
      );

      if (result.rowCount > 0) {
        console.log(`   ✅ Password updated for ${user.email}`);
      } else {
        console.log(`   ⚠️  User not found: ${user.email}`);
      }
    }

    console.log('\n✅ Password update complete!');
    console.log('\n📝 Test Credentials:');
    console.log('   Admin: admin@glrsdac.com / Admin@123');
    console.log('   Treasurer: treasurer@glrsdac.com / Treasurer@123');
    console.log('   Clerk: clerk@glrsdac.com / Clerk@123');

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixUserPasswords();
