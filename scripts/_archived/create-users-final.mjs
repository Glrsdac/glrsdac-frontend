import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error('❌ SUPABASE_DB_URL not set');
  process.exit(1);
}

async function createUsersProper() {
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();

    console.log('👤 Creating test users using Supabase Auth schema...\n');

    const users = [
      {
        email: 'admin@glrsdac.com',
        password: 'Admin@123',
        role: 'ADMIN',
        name: 'Admin User',
        id: '550e8400-e29b-41d4-a716-446655440001'
      },
      {
        email: 'treasurer@glrsdac.com',
        password: 'Treasurer@123',
        role: 'TREASURER',
        name: 'Treasurer User',
        id: '550e8400-e29b-41d4-a716-446655440002'
      },
      {
        email: 'clerk@glrsdac.com',
        password: 'Clerk@123',
        role: 'CLERK',
        name: 'Clerk User',
        id: '550e8400-e29b-41d4-a716-446655440003'
      },
    ];

    for (const user of users) {
      console.log(`📧 ${user.email}`);

      // Create new user with proper Supabase defaults
      // Using 'bf:10' to match Supabase's bcrypt cost factor
      console.log('   Creating auth user...');
      const result = await client.query(
        `INSERT INTO auth.users (
          id,
          instance_id,
          email,
          encrypted_password,
          email_confirmed_at,
          raw_app_meta_data,
          raw_user_meta_data,
          is_super_admin,
          created_at,
          updated_at,
          last_sign_in_at
        ) VALUES ($1, '00000000-0000-0000-0000-000000000000', $2, crypt($3, gen_salt('bf', 10)), now(), $4, '{}', false, now(), now(), now())
        RETURNING id`,
        [user.id, user.email, user.password, JSON.stringify({provider: 'email', providers: ['email']})]
      );

      if (result.rows.length > 0) {
        console.log(`   ✅ Auth user created (trigger auto-created profile)`);
      }

      // Update profile with full name (handle_new_user trigger creates it empty)
      console.log('   Updating profile...');
      await client.query(
        'UPDATE public.profiles SET full_name = $1 WHERE id = $2',
        [user.name, user.id]
      );
      console.log(`   ✅ Profile updated`);

      // Assign role
      console.log(`   Assigning role: ${user.role}`);
      const roleResult = await client.query(
        'INSERT INTO public.user_roles (user_id, role) VALUES ($1, $2) RETURNING id',
        [user.id, user.role]
      );
      if (roleResult.rows.length > 0) {
        console.log(`   ✅ Role assigned\n`);
      }
    }

    console.log('✅ All users created successfully!');
    console.log('\n📝 Test Credentials:');
    console.log('   Admin: admin@glrsdac.com / Admin@123');
    console.log('   Treasurer: treasurer@glrsdac.com / Treasurer@123');
    console.log('   Clerk: clerk@glrsdac.com / Clerk@123');

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createUsersProper();
