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

async function testExistingUser() {
  console.log('🧪 Testing with existing user from system...\n');

  const testCreds = [
    { email: 'admin@test.com', password: 'Password1!' },
    { email: 'stanleyyeboah754@gmail.com', password: 'TestPass123' },
  ];

  for (const cred of testCreds) {
    console.log(`\n📧 Testing: ${cred.email}`);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cred.email,
        password: cred.password,
      });

      if (error) {
        console.log(`   ❌ Login failed: ${error.message}`);
      } else {
        console.log(`   ✅ Login successful!`);
        console.log(`      User ID: ${data.user?.id}`);
        
        // Try to fetch user roles
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user?.id);

        if (rolesError) {
          console.log(`   ⚠️  Roles lookup failed: ${rolesError.message}`);
        } else if (roles && roles.length > 0) {
          console.log(`   ✅ Roles: ${roles.map(r => r.role).join(', ')}`);
        } else {
          console.log(`   ⚠️  No roles assigned`);
        }

        await supabase.auth.signOut();
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }
}

testExistingUser();
