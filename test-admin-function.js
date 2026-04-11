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

async function testAdminFunction() {
  try {
    // First, sign in as the super user
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'super@admin.com',
      password: 'SuperAdmin123!'
    });

    if (signInError) {
      console.error('Error signing in:', signInError);
      return;
    }

    console.log('Signed in successfully as super user');

    // Now test the admin-manage-churches function
    const { data: churchesData, error: churchesError } = await supabase.functions.invoke('admin-manage-churches', {
      body: {
        action: 'list_churches'
      }
    });

    if (churchesError) {
      console.error('Error calling admin-manage-churches:', churchesError);
    } else {
      console.log('admin-manage-churches function works!');
      console.log('Churches data:', churchesData);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testAdminFunction();