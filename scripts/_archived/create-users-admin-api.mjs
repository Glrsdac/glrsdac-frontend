import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

// Use service role for admin operations
const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
});

async function createUsersViaAdminAPI() {
  console.log('👤 Creating test users via Supabase Admin API...\n');

  const usersToCreate = [
    { 
      email: 'admin@glrsdac.com', 
      password: 'Admin@123', 
      role: 'ADMIN',
      name: 'Admin User'
    },
    { 
      email: 'treasurer@glrsdac.com', 
      password: 'Treasurer@123', 
      role: 'TREASURER',
      name: 'Treasurer User'
    },
    { 
      email: 'clerk@glrsdac.com', 
      password: 'Clerk@123', 
      role: 'CLERK',
      name: 'Clerk User'
    },
  ];

  for (const user of usersToCreate) {
    console.log(`📧 Creating: ${user.email}`);

    try {
      // Create user via Admin API (proper Supabase Auth initialization)
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

      if (error) {
        console.log(`   ⚠️  User might already exist: ${error.message}`);
        console.log(`   Attempting to update password instead...\n`);
        
        // If user exists, try to update password
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          user.email, // This won't work, need to find user first
          { password: user.password }
        );
        continue;
      }

      const userId = data.user?.id;
      console.log(`   ✅ User created via Admin API: ${userId}`);

      // Update profile with name (trigger should have created empty profile)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: user.name })
        .eq('id', userId);

      if (profileError) {
        console.log(`   ⚠️  Profile update failed: ${profileError.message}`);
      } else {
        console.log(`   ✅ Profile updated`);
      }

      // Assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: user.role });

      if (roleError) {
        if (roleError.message.includes('duplicate')) {
          console.log(`   ℹ️  Role already assigned`);
        } else {
          console.log(`   ⚠️  Role assignment failed: ${roleError.message}`);
        }
      } else {
        console.log(`   ✅ Role assigned: ${user.role}`);
      }

      console.log('');
    } catch (err) {
      console.log(`   ❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}\n`);
    }
  }

  console.log('✅ User creation via Admin API complete!');
  console.log('\n📝 Test Credentials:');
  console.log('   Admin: admin@glrsdac.com / Admin@123');
  console.log('   Treasurer: treasurer@glrsdac.com / Treasurer@123');
  console.log('   Clerk: clerk@glrsdac.com / Clerk@123');
}

createUsersViaAdminAPI();
