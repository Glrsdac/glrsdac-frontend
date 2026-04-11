import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSuperAdminLogin() {
  try {
    console.log('🔐 Testing Super Admin login...');
    console.log('Email: super@admin.com');
    console.log('Password: SuperAdmin123!');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'super@admin.com',
      password: 'SuperAdmin123!'
    });

    if (error) {
      console.error('❌ Login failed:', error.message);
      return;
    }

    if (data.user) {
      console.log('✅ Login successful!');
      console.log('User ID:', data.user.id);
      console.log('Email:', data.user.email);
      console.log('Email confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');

      // Test session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
      } else {
        console.log('✅ Session active, JWT token obtained');
      }

      // Test user metadata
      console.log('User metadata:', data.user.user_metadata);

      // Test if we can access admin functions
      console.log('\n🔍 Testing admin access...');
      const accessToken = sessionData.session?.access_token;
      console.log('Access token length:', accessToken?.length || 0);

      // First test: Try to access a regular Supabase table with the token
      console.log('Testing basic Supabase access with token...');
      const testClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      });

      try {
        const { data: profileData, error: profileError } = await testClient
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('❌ Basic Supabase access failed:', profileError.message);
        } else {
          console.log('✅ Basic Supabase access successful!');
          console.log('Profile:', profileData);
        }
      } catch (basicTestError) {
        console.error('❌ Basic test error:', basicTestError.message);
      }

      // Now test admin function
      try {
        const response = await fetch('https://upqwgwemuaqhnxskxbfr.supabase.co/functions/v1/admin-list-users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'x-user-token': accessToken
          }
        });

        console.log('Response status:', response.status);
        const responseText = await response.text();
        console.log('Response body:', responseText);

        if (response.ok) {
          console.log('✅ Admin function access successful!');
          const adminData = JSON.parse(responseText);
          console.log('Users found:', adminData.users?.length || 0);
          console.log('Sample user:', adminData.users?.[0]);
        } else {
          console.error('❌ Admin function access failed with status:', response.status);
          console.error('Response:', responseText);
        }
      } catch (adminTestError) {
        console.error('❌ Admin function test error:', adminTestError.message);
      }

    } else {
      console.error('❌ No user data returned');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testSuperAdminLogin();