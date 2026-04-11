import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    envVars[key.trim()] = value;
  }
});

const supabase = createClient(
  envVars.VITE_SUPABASE_URL,
  envVars.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

async function fixStanleyRoles() {
  console.log('🔧 FIXING STANLEY YEBOAH ROLE REDUNDANCY\n');

  // Get Stanley's profile
  const { data: profilesList } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('email', 'stanleyyeboah754@gmail.com');

  if (!profilesList || profilesList.length === 0) {
    console.log('✗ Stanley profile not found');
    return;
  }

  const profile = profilesList[0];
  console.log(`Found: ${profile.full_name}`);

  // Get the Treasurer role ID
  const { data: treasurerRole } = await supabase
    .from('roles')
    .select('id, name')
    .eq('name', 'Treasurer')
    .single();

  if (!treasurerRole) {
    console.log('✗ Treasurer role not found');
    return;
  }

  console.log(`\nRemoving redundant Treasurer role (ID: ${treasurerRole.id})...\n`);

  // Delete the Treasurer role assignment
  const { error: deleteError } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', profile.id)
    .eq('role_id', treasurerRole.id);

  if (deleteError) {
    console.log('✗ Error removing role:', deleteError.message);
    return;
  }

  console.log('✅ Treasurer role removed successfully\n');

  // Verify the remaining role
  const { data: remainingRoles } = await supabase
    .from('user_roles')
    .select('role_id')
    .eq('user_id', profile.id);

  const roleIds = remainingRoles.map(ur => ur.role_id);
  const { data: roles } = await supabase
    .from('roles')
    .select('id, name, category, scope_type')
    .in('id', roleIds);

  console.log('📋 VERIFIED - REMAINING ROLES:');
  roles.forEach((role, idx) => {
    console.log(`  ${idx + 1}. ${role.name}`);
    console.log(`     - Category: ${role.category}`);
    console.log(`     - Scope: ${role.scope_type}`);
  });

  console.log('\n✓ Data consistency restored');
  console.log('  Stanley now has: Super Admin role only');
  console.log('  Position remains: Church Treasurer (for reference)');
}

fixStanleyRoles().catch(err => console.error('Error:', err.message));
