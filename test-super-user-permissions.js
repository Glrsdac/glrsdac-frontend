import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function testSuperUserPermissions() {
  try {
    console.log('Testing Super Admin permissions...');

    // First, sign in as super user to get JWT token
    console.log('\n🔐 Signing in as super@admin.com...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'super@admin.com',
      password: 'SuperAdmin123!'
    });

    if (signInError || !signInData.session) {
      console.error('❌ Failed to sign in:', signInError);
      return;
    }

    const jwtToken = signInData.session.access_token;
    console.log('✅ Successfully signed in, got JWT token');

    // Create a client with the user JWT for function calls
    const userClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        headers: {
          'x-user-token': jwtToken
        }
      }
    });
    console.log('\n1. Testing admin-list-users function...');
    const { data: listUsersData, error: listUsersError } = await userClient.functions.invoke('admin-list-users');
    if (listUsersError) {
      console.error('❌ Failed to list users:', listUsersError);
    } else {
      console.log('✅ Successfully listed users:', listUsersData?.length || 0, 'users found');
    }

    // Test 2: List churches (admin-manage-churches function)
    console.log('\n2. Testing admin-manage-churches function (list churches)...');
    const { data: churchesData, error: churchesError } = await userClient.functions.invoke('admin-manage-churches', {
      body: { action: 'list' }
    });
    if (churchesError) {
      console.error('❌ Failed to list churches:', churchesError);
    } else {
      console.log('✅ Successfully listed churches:', churchesData?.length || 0, 'churches found');
    }

    // Test 3: Check user roles directly
    console.log('\n3. Checking user roles directly...');
    const { data: directRoles, error: directRolesError } = await supabase
      .from('user_roles')
      .select('*, roles!user_roles_role_id_fkey(name)')
      .eq('user_id', '2f02d78c-d5c3-4836-97e2-4eb736505d4a');

    if (directRolesError) {
      console.error('❌ Failed to fetch roles:', directRolesError);
    } else {
      console.log('✅ User roles:', directRoles);
      const hasSuperAdmin = directRoles.some(role => role.roles?.name === 'Super Admin');
      console.log('Has Super Admin role:', hasSuperAdmin);
    }

    console.log('\n🎉 Permission verification complete!');

  } catch (error) {
    console.error('Error:', error);
  }
}

testSuperUserPermissions();