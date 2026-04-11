import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createSuperUser() {
  try {
    console.log('Checking for existing super user...');

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }

    let userId;
    const existingUser = existingUsers.users.find(user => user.email === 'super@admin.com');

    if (existingUser) {
      console.log('Super user already exists:', existingUser.id);
      userId = existingUser.id;
    } else {
      console.log('Creating super user...');

      // Create auth user
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: 'super@admin.com',
        password: 'SuperAdmin123!',
        email_confirm: true,
        user_metadata: { full_name: 'Super User' },
      });

      if (userError || !userData.user) {
        throw new Error(`Failed to create user: ${userError?.message}`);
      }

      userId = userData.user.id;
      console.log(`Created auth user: ${userId}`);
    }

    // Ensure profile exists
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      full_name: 'Super User',
      user_type: 'super_admin', // Set user_type for fallback authorization
    });

    if (profileError && profileError.code !== '23505') {
      console.warn('Profile creation warning:', profileError);
    }

    // Check if SuperAdmin role already exists
    const { data: existingRoles, error: roleCheckError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId);

    if (roleCheckError) {
      console.warn('Role check warning:', roleCheckError);
    }

    // Check if any of the existing roles is superadmin
    let hasSuperAdmin = false;
    if (existingRoles && existingRoles.length > 0) {
      for (const userRole of existingRoles) {
        const { data: roleInfo, error: roleInfoError } = await supabase
          .from('roles')
          .select('name')
          .eq('id', userRole.role_id)
          .single();

        if (!roleInfoError && roleInfo.name === 'Super Admin') {
          hasSuperAdmin = true;
          break;
        }
      }
    }

    if (hasSuperAdmin) {
      console.log('SuperAdmin role already assigned');
    } else {
      // Ensure Super Admin role exists
      let { data: roleData, error: roleFetchError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'Super Admin')
        .single();

      if (roleFetchError || !roleData) {
        console.log('Super Admin role not found, creating it...');
        const { data: newRole, error: createRoleError } = await supabase
          .from('roles')
          .insert({
            name: 'Super Admin',
            scope_type: 'global',
            description: 'Global system administrator with full access'
          })
          .select('id')
          .single();

        if (createRoleError || !newRole) {
          console.error('Failed to create Super Admin role:', createRoleError?.message);
          return;
        }
        roleData = newRole;
        console.log('Created Super Admin role:', roleData.id);
      }

      // Assign SuperAdmin role (global scope, no church_id)
      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: userId,
        role_id: roleData.id,
        scope_type: 'global',
        is_active: true,
        start_date: new Date().toISOString().split('T')[0], // Today's date
      });

      if (roleError) {
        console.warn('Role assignment warning:', roleError);
      } else {
        console.log('SuperAdmin role assigned successfully');
      }
    }

    console.log('Super user setup complete!');
    console.log('Email: super@admin.com');
    console.log('Password: SuperAdmin123!');
    console.log('User ID:', userId);
  } catch (error) {
    console.error('Error:', error);
  }
}

createSuperUser();