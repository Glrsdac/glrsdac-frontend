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

async function diagnoseLoginIssue() {
  const targetEmail = "yeboahstanley754@gmail.com";

  console.log(`\n🔍 DIAGNOSING LOGIN ISSUE FOR: ${targetEmail}\n`);
  console.log("=" .repeat(70) + "\n");

  try {
    // 1. Check auth.users
    console.log("Step 1: Checking auth.users...");
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error("❌ Failed to list auth users:", authError);
      throw authError;
    }

    const authUser = authUsers?.users?.find(u => u.email?.toLowerCase() === targetEmail.toLowerCase());

    if (!authUser) {
      console.error("❌ User NOT found in auth.users");
      console.log("\nAction: User doesn't exist. Need to complete signup flow.");
      return;
    }

    console.log(`✅ User found in auth.users`);
    console.log(`   ID: ${authUser.id}`);
    console.log(`   Email: ${authUser.email}`);
    console.log(`   Email Confirmed: ${authUser.email_confirmed_at ? 'YES' : 'NO'}`);
    console.log(`   Last Sign In: ${authUser.last_sign_in_at || 'Never'}`);
    console.log(`   Created At: ${authUser.created_at}`);
    console.log(`   Updated At: ${authUser.updated_at}`);

    // 2. Check if user has a password
    console.log("\nStep 2: Checking if user has password set...");
    if (!authUser.user_metadata?.provider_id && authUser.identities?.some(i => i.provider === 'email')) {
      console.log("✅ User has email/password auth configured");
    } else {
      console.log("⚠️  Warning: User provider info:");
      console.log(`   Identities: ${JSON.stringify(authUser.identities)}`);
    }

    // 3. Check profiles table
    console.log("\nStep 3: Checking profiles table...");
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (profileError) {
      if (profileError.code === "PGRST116") {
        console.log("⚠️  No profile record found (may not be required)");
      } else {
        console.error("❌ Profile query error:", profileError.message);
      }
    } else {
      console.log("✅ Profile found:");
      console.log(`   Email: ${profile.email}`);
      console.log(`   Full Name: ${profile.full_name}`);
      console.log(`   Created At: ${profile.created_at}`);
    }

    // 4. Check members table
    console.log("\nStep 4: Checking members table...");
    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("id, first_name, last_name, email, user_id, invite_status, invite_token, invite_accepted_at")
      .eq("email", targetEmail);

    if (membersError) {
      console.error("❌ Members query error:", membersError.message);
    } else if (!members || members.length === 0) {
      console.log("⚠️  No member record found with this email");
    } else {
      const member = members[0];
      console.log("✅ Member record found:");
      console.log(`   ID: ${member.id}`);
      console.log(`   Name: ${member.first_name} ${member.last_name}`);
      console.log(`   User ID: ${member.user_id || 'NULL (NOT LINKED)'}`);
      console.log(`   Invite Status: ${member.invite_status}`);
      console.log(`   Invite Token: ${member.invite_token || 'NULL (CLEARED)'}`);
      console.log(`   Invite Accepted At: ${member.invite_accepted_at || 'NULL'}`);
    }

    // 5. Check user_roles
    console.log("\nStep 5: Checking user_roles table...");
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authUser.id);

    if (rolesError) {
      console.error("❌ Roles query error:", rolesError.message);
    } else if (!roles || roles.length === 0) {
      console.log("⚠️  No roles assigned to user");
    } else {
      console.log("✅ Roles found:");
      roles.forEach(r => console.log(`   - ${r.role}`));
    }

    // 6. Test login
    console.log("\nStep 6: Attempting test login...");
    const testPassword = "TempPassword123!"; // Generic test - won't work but shows the error
    const { error: loginError, data: loginData } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: testPassword,
    });

    if (loginError) {
      console.error("❌ Login failed (expected with dummy password):");
      console.log(`   Error: ${loginError.message}`);
      console.log(`   Status: ${loginError.status}`);
    } else {
      console.log("✅ Login succeeded (unexpected!)");
    }

    // 7. Summary and recommendations
    console.log("\n" + "=" .repeat(70));
    console.log("📋 DIAGNOSIS SUMMARY\n");

    if (authUser && authUser.email_confirmed_at && profile) {
      console.log("✅ Account setup looks complete:");
      console.log("   - User exists in auth.users ✓");
      console.log("   - Email is confirmed ✓");
      console.log("   - Profile exists ✓");
      console.log("\n💡 LIKELY ISSUE: Password was not set properly during signup");
      console.log("\nRECOMMENDATION:");
      console.log("1. Resend invitation from Members page");
      console.log("2. User completes signup with new password");
      console.log("3. Then try login with the new password");
    } else if (authUser && !authUser.email_confirmed_at) {
      console.log("⚠️  Email is NOT confirmed in auth.users");
      console.log("\nRECOMMENDATION:");
      console.log("1. Check if signup was completed");
      console.log("2. Verify the password was set via complete-signup");
      console.log("3. If password was set, may need to manually confirm email");
    } else if (!authUser) {
      console.log("❌ User does not exist in auth.users");
      console.log("\nRECOMMENDATION:");
      console.log("1. Send invite from Members page");
      console.log("2. User clicks signup link");
      console.log("3. User sets password");
    }

    console.log("\n" + "=" .repeat(70) + "\n");

  } catch (error) {
    console.error("Fatal error:", error.message);
    process.exit(1);
  }
}

diagnoseLoginIssue();
