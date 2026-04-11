import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function verifySuperUser() {
  try {
    // Get the user by email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
      console.error('Error listing users:', userError);
      return;
    }

    const superUser = userData.users.find(user => user.email === 'super@admin.com');

    if (!superUser) {
      console.error('Super user not found');
      return;
    }

    console.log('Super user found:', superUser.id, superUser.email);

    // Check user roles
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', superUser.id);

    if (rolesError) {
      console.error('Error checking roles:', rolesError);
      return;
    }

    console.log('User roles:', rolesData);

    // Check if SuperAdmin role exists
    let hasSuperAdmin = false;
    if (rolesData && rolesData.length > 0) {
      for (const userRole of rolesData) {
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
    console.log('Has SuperAdmin role:', hasSuperAdmin);

  } catch (error) {
    console.error('Error:', error);
  }
}

verifySuperUser();