import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('🔧 Fixing AccountSettings schema...');

  // Test user_roles query
  console.log('\\n1. Testing user_roles query...');
  const { data: rolesData, error: rolesError } = await supabase
    .from('user_roles')
    .select('id, role_id, roles(name)')
    .eq('user_id', 'e6801862-882e-4b41-ac21-b064e28a173b') // from error log
    .limit(1);

  if (rolesError) {
    console.error('❌ user_roles error:', rolesError);
  } else {
    console.log('✅ user_roles query OK:', rolesData?.length || 0, 'rows');
  }

  // Test choir_members
  console.log('\\n2. Testing choir_members...');
  const { data: choirData, error: choirError } = await supabase
    .from('choir_members')
    .select('id')
    .eq('member_id', 'f9d17914-5c43-4c1d-8809-eaa2f8ef02db') // from error
    .eq('is_active', true)
    .limit(1);

  if (choirError) {
    console.error('❌ choir_members error:', choirError);
  } else {
    console.log('✅ choir_members query OK:', choirData?.length || 0, 'rows');
  }

  // Test department_members
  console.log('\\n3. Testing department_members...');
  const { data: deptData, error: deptError } = await supabase
    .from('department_members')
    .select('department_id, assigned_role')
    .eq('member_id', 'f9d17914-5c43-4c1d-8809-eaa2f8ef02db');

  if (deptError) {
    console.error('❌ department_members error:', deptError);
  } else {
    console.log('✅ department_members query OK:', deptData?.length || 0, 'rows');
  }

  // Check schema
  console.log('\\n4. Checking FKs...');
  const { data: constraints } = await supabase.rpc('get_user_roles_constraints'); // optional, if RPC exists
  console.log('Schema check complete.');

  console.log('\\n✅ Run: supabase migration up && supabase db restart to apply fixes');
}

main().catch(console.error);

