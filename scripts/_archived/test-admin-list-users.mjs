import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!VITE_SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_ANON_KEY);
const EDGE_FUNCTION_URL = `${VITE_SUPABASE_URL}/functions/v1/admin-list-users`;

async function testAdminListUsers() {
  console.log('🔐 TESTING ADMIN-LIST-USERS EDGE FUNCTION\n');
  console.log('=' .repeat(70) + '\n');

  // Test 1: Admin can list users
  console.log('📝 Test 1: Admin user listing all users\n');
  try {
    // Sign in as admin
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'admin@glrsdac.com',
      password: 'Admin@123',
    });

    if (signInError) {
      console.log(`❌ Admin login failed: ${signInError.message}`);
    } else {
      const session = signInData.session;
      console.log(`✅ Admin logged in: ${signInData.user?.email}`);

      // Call edge function with token
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      const data = await response.json();
      console.log(`Status: ${response.status}`);
      console.log(`Users found: ${data.total || 0}`);
      if (data.users) {
        console.log('\nUser List:');
        data.users.forEach((user, idx) => {
          console.log(`  ${idx + 1}. ${user.full_name || user.email}`);
          console.log(`     Email: ${user.email}`);
          console.log(`     Roles: ${user.roles.join(', ') || 'None'}`);
          console.log(`     Created: ${new Date(user.created_at).toLocaleDateString()}`);
        });
      }

      await supabase.auth.signOut();
    }
  } catch (err) {
    console.error('Error:', err.message);
  }

  console.log('\n' + '=' .repeat(70));

  // Test 2: Non-admin cannot list users
  console.log('\n📝 Test 2: Non-admin (Viewer) attempting to list users\n');
  try {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'viewer1@glrsdac.com',
      password: 'Viewer1@2026',
    });

    if (signInError) {
      console.log(`❌ Viewer login failed: ${signInError.message}`);
    } else {
      const session = signInData.session;
      console.log(`✅ Viewer logged in: ${signInData.user?.email}`);

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      const data = await response.json();
      console.log(`Status: ${response.status}`);
      console.log(`Response: ${data.error || data.message}`);

      await supabase.auth.signOut();
    }
  } catch (err) {
    console.error('Error:', err.message);
  }

  console.log('\n' + '=' .repeat(70));

  // Test 3: Unauthenticated request
  console.log('\n📝 Test 3: Unauthenticated request\n');
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${data.error || data.message}`);
  } catch (err) {
    console.error('Error:', err.message);
  }

  console.log('\n' + '=' .repeat(70));
  console.log('\n✅ Tests completed!\n');
}

testAdminListUsers();
