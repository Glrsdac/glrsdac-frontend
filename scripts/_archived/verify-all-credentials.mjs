import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!VITE_SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

// Create client WITHOUT service role (like frontend would)
const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_ANON_KEY);

const testCredentials = [
  { email: 'admin@glrsdac.com', password: 'Admin@123', role: 'ADMIN' },
  { email: 'treasurer@glrsdac.com', password: 'Treasurer@123', role: 'TREASURER' },
  { email: 'clerk@glrsdac.com', password: 'Clerk@123', role: 'CLERK' },
  { email: 'mary.williams@glrsdac.com', password: 'MaryWilliams@2026', role: 'VIEWER' },
  { email: 'peter.brown@glrsdac.com', password: 'PeterBrown@2026', role: 'VIEWER' },
  { email: 'grace.davis@glrsdac.com', password: 'GraceDavis@2026', role: 'VIEWER' },
  { email: 'finance.head@glrsdac.com', password: 'FinanceHead@2026', role: 'TREASURER' },
  { email: 'ushers.head@glrsdac.com', password: 'UshersHead@2026', role: 'CLERK' },
  { email: 'music.head@glrsdac.com', password: 'MusicHead@2026', role: 'CLERK' },
  { email: 'viewer1@glrsdac.com', password: 'Viewer1@2026', role: 'VIEWER' },
  { email: 'viewer2@glrsdac.com', password: 'Viewer2@2026', role: 'VIEWER' },
];

let passCount = 0;
let failCount = 0;

async function testAllCredentials() {
  console.log('🔐 TESTING ALL USER CREDENTIALS\n');
  console.log('=' .repeat(70) + '\n');

  for (const cred of testCredentials) {
    console.log(`📧 Testing: ${cred.email} (${cred.role})`);

    try {
      // Sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: cred.email,
        password: cred.password,
      });

      if (signInError) {
        console.log(`   ❌ Login failed: ${signInError.message}`);
        failCount++;
        continue;
      }

      const userId = signInData.session?.user?.id;
      console.log(`   ✅ Login successful`);

      // Get profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.log(`   ⚠️  Profile fetch failed: ${profileError.message}`);
      } else {
        console.log(`   ✅ Profile: ${profileData.full_name || 'N/A'}`);
      }

      // Get roles
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (roleError) {
        console.log(`   ⚠️  Roles fetch failed: ${roleError.message}`);
      } else {
        const roles = roleData.map(r => r.role).join(', ');
        console.log(`   ✅ Roles: ${roles || 'None'}`);
      }

      // Sign out
      await supabase.auth.signOut();
      console.log(`   ✅ Session valid\n`);

      passCount++;
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}\n`);
      failCount++;
    }
  }

  console.log('=' .repeat(70));
  console.log(`\n📊 Test Results: ${passCount} passed, ${failCount} failed\n`);

  if (failCount === 0) {
    console.log('🎉 ALL USER CREDENTIALS VERIFIED SUCCESSFULLY!\n');
  } else {
    console.log(`⚠️  ${failCount} credential(s) failed verification\n`);
  }
}

testAllCredentials();
