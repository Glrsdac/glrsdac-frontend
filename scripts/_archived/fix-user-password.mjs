import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixUserPassword() {
  const targetEmail = "yeboahstanley754@gmail.com";
  const newPassword = "YeboahStanley@2026"; // Using same pattern as other test users

  console.log(`\n🔧 FIXING PASSWORD FOR: ${targetEmail}\n`);

  try {
    // Get the user
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error("❌ Failed to list auth users:", authError);
      throw authError;
    }

    const authUser = authUsers?.users?.find(u => u.email?.toLowerCase() === targetEmail.toLowerCase());

    if (!authUser) {
      console.error("❌ User not found");
      return;
    }

    console.log(`Found user: ${authUser.id}`);
    console.log(`Setting password to: ${newPassword}\n`);

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
      password: newPassword,
    });

    if (updateError) {
      console.error("❌ Failed to set password:", updateError);
      throw updateError;
    }

    console.log("✅ Password set successfully!");
    console.log(`\nYou can now login with:`);
    console.log(`   Email: ${targetEmail}`);
    console.log(`   Password: ${newPassword}`);
    console.log("\n");

  } catch (error) {
    console.error("Fatal error:", error.message);
    process.exit(1);
  }
}

fixUserPassword();
