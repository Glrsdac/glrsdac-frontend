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
  envVars.VITE_SUPABASE_ANON_KEY
);

async function checkStanleyRoles() {
  console.log('🔍 STANLEY YEBOAH - DATA CONSISTENCY CHECK\n');

  // Get Stanley's profile first
  const { data: profilesList, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('email', 'stanleyyeboah754@gmail.com');

  if (profileError || !profilesList || profilesList.length === 0) {
    console.log('✗ Error fetching profile:', profileError?.message || 'Not found');
    return;
  }

  const profile = profilesList[0];
  console.log(`🔗 Found profile: ${profile.full_name} (${profile.email})\n`);

  // Get Stanley's member data
  const { data: membersList, error: memberError } = await supabase
    .from('members')
    .select('id, user_id, first_name, last_name, position')
    .eq('user_id', profile.id);

  if (memberError || !membersList || membersList.length === 0) {
    console.log('✗ Error fetching member:', memberError?.message || 'Not found');
    return;
  }

  const members = membersList[0];

  console.log('📋 MEMBER INFORMATION:');
  console.log(`  Position in members.position: "${members.position}"`);
  console.log(`  User ID: ${members.user_id}\n`);

  // Get assigned role IDs
  const { data: userRoles, error: urError } = await supabase
    .from('user_roles')
    .select('role_id')
    .eq('user_id', members.user_id);

  if (urError) {
    console.log('✗ Error fetching user roles:', urError.message);
    return;
  }

  // Get role details
  const roleIds = userRoles.map(ur => ur.role_id);
  const { data: roles, error: rolesError } = await supabase
    .from('roles')
    .select('id, name, category, scope_type')
    .in('id', roleIds);

  if (rolesError) {
    console.log('✗ Error fetching roles:', rolesError.message);
    return;
  }

  console.log('👤 ASSIGNED ROLES:');
  roles.forEach((role, idx) => {
    console.log(`  ${idx + 1}. ${role.name}`);
    console.log(`     - Category: ${role.category}`);
    console.log(`     - Scope: ${role.scope_type}`);
  });

  console.log('\n⚠️  DATA CONSISTENCY ANALYSIS:');
  console.log(`  Position: "${members.position}"`);
  console.log(`  Roles assigned: ${roles.length}`);

  const hasAdmin = roles.some(r => r.name.toLowerCase().includes('admin'));
  const hasTreasurer = roles.some(r => r.name.toLowerCase().includes('treasurer'));
  
  if (hasAdmin && hasTreasurer) {
    console.log('\n  ❌ REDUNDANCY DETECTED:');
    console.log('     - Super Admin role subsumes Treasurer role');
    console.log('     - Super Admin has all permissions including Treasury');
    console.log('     - Treasurer role assignment is redundant');
  } else if (hasTreasurer && members.position.toLowerCase().includes('treasurer')) {
    console.log('\n  ✓ CONSISTENT:');
    console.log('     - Position matches assigned role');
  } else if (hasAdmin && !members.position.toLowerCase().includes('admin')) {
    console.log('\n  ⚠️  MISMATCH:');
    console.log('     - Super Admin role assigned but position says Church Treasurer');
    console.log('     - Position field may be outdated or role assignment is incorrect');
  }

  console.log('\n💡 RECOMMENDATION:');
  if (hasAdmin) {
    console.log('  → If Super Admin is intentional: Remove the redundant Treasurer role');
    console.log('  → If Treasurer is intentional: Remove the Super Admin role');
    console.log('     and update position field to match assigned role');
  }
}

checkStanleyRoles().catch(err => console.error('Error:', err.message));
