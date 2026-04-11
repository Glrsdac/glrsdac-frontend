import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Use service role for admin operations
const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
});

async function createTestUsers() {
  console.log('👤 Creating test users with proper authentication...\n');

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
    console.log(`📧 Processing user: ${user.email}`);

    try {
      // List users and find existing
      const { data: allUsers } = await supabase.auth.admin.listUsers();
      const existingUser = allUsers?.users?.find(u => u.email === user.email);
      
      if (existingUser) {
        console.log(`   User exists with ID: ${existingUser.id}`);
        console.log(`   Updating password...`);
        
        // Update password
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          { password: user.password }
        );
        
        if (updateError) {
          console.log(`   ⚠️  Password update failed: ${updateError.message}`);
        } else {
          console.log(`   ✅ Password updated`);
        }

        // Update profile
        console.log(`   Updating profile...`);
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: existingUser.id,
            full_name: user.name,
            email: user.email,
          }, { onConflict: 'id' });

        if (profileError) {
          console.log(`   ⚠️  Profile update failed: ${profileError.message}`);
        } else {
          console.log(`   ✅ Profile updated`);
        }

        // Verify/assign role
        console.log(`   Verifying role: ${user.role}`);
        const { data: existingRoles } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', existingUser.id);

        if (!existingRoles || existingRoles.length === 0) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: existingUser.id,
              role: user.role,
            });

          if (roleError) {
            console.log(`   ⚠️  Role assignment failed: ${roleError.message}`);
          } else {
            console.log(`   ✅ Role assigned: ${user.role}`);
          }
        } else {
          console.log(`   ✅ Role already assigned: ${existingRoles[0].role}`);
        }

        console.log(`   ✅ User setup complete!\n`);
      } else {
        console.log(`   User doesn't exist in auth.users`);
        console.log(`   Creating new user...`);
        
        const { data, error } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
        });

        if (error) {
          console.log(`   ❌ Creation failed: ${error.message}\n`);
          continue;
        }

        const userId = data.user?.id;
        console.log(`   ✅ User created with ID: ${userId}`);

        // Create profile
        console.log(`   Creating profile...`);
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            full_name: user.name,
            email: user.email,
          });

        if (profileError) {
          console.log(`   ⚠️  Profile creation failed: ${profileError.message}`);
        } else {
          console.log(`   ✅ Profile created`);
        }

        // Assign role
        console.log(`   Assigning role: ${user.role}`);
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: user.role,
          });

        if (roleError) {
          console.log(`   ⚠️  Role assignment failed: ${roleError.message}`);
        } else {
          console.log(`   ✅ Role assigned: ${user.role}`);
        }

        console.log(`   ✅ User setup complete!\n`);
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}\n`);
    }
  }

  console.log('✅ User creation complete!');
  console.log('\n📝 Test Credentials:');
  console.log('   Admin: admin@glrsdac.com / Admin@123');
  console.log('   Treasurer: treasurer@glrsdac.com / Treasurer@123');
  console.log('   Clerk: clerk@glrsdac.com / Clerk@123');
}

createTestUsers();
