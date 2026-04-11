import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

async function testAuth() {
  console.log('🔐 Testing Supabase Authentication...\n');

  const credentials = [
    { email: 'admin@glrsdac.com', password: 'Admin@123', role: 'ADMIN' },
    { email: 'treasurer@glrsdac.com', password: 'Treasurer@123', role: 'TREASURER' },
    { email: 'clerk@glrsdac.com', password: 'Clerk@123', role: 'CLERK' },
  ];

  for (const cred of credentials) {
    console.log(`\n📧 Testing: ${cred.email} (${cred.role})`);
    console.log('   Attempting login...');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cred.email,
        password: cred.password,
      });

      if (error) {
        console.log(`   ❌ Login failed: ${error.message}`);
        console.log(`      Error code: ${error.status}`);
      } else {
        console.log(`   ✅ Login successful!`);
        console.log(`      User ID: ${data.user?.id}`);
        console.log(`      Email: ${data.user?.email}`);
        console.log(`      Session: ${data.session?.access_token ? 'Active' : 'None'}`);

        // Try to fetch user data
        console.log('   Fetching user profile...');
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user?.id)
          .single();

        if (profileError) {
          console.log(`   ⚠️  Profile fetch failed: ${profileError.message}`);
        } else {
          console.log(`   ✅ Profile found: ${profile.full_name || 'No name'}`);
        }

        // Try to fetch user roles
        console.log('   Fetching user roles...');
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user?.id);

        if (rolesError) {
          console.log(`   ⚠️  Roles fetch failed: ${rolesError.message}`);
        } else {
          console.log(`   ✅ Roles: ${roles?.map(r => r.role).join(', ') || 'None'}`);
        }

        // Sign out after test
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  console.log('\n✅ Authentication test complete!');
}

testAuth();
