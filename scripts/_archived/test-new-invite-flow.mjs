#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://upqwgwemuaqhnxskxbfr.supabase.co";
const serviceRoleKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwcXdnd2VtdWFxaG54c2t4YmZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNzkyMzI2MiwiZXhwIjoxODc1NjAwMjYyfQ.WOxxN22x89TvKzP6-IrX1oOI3Vc0yxXfmH7aPwD-_Ig";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testInviteFlow() {
  console.log("=== Testing New Invite Flow ===\n");

  const testEmail = `test.flow.${Date.now()}@example.com`;

  try {
    // Step 1: Create a member
    console.log("Step 1: Creating member...");
    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .insert({
        first_name: "Flow",
        last_name: "Test",
        email: testEmail,
        status: "ACTIVE",
      })
      .select()
      .single();

    if (memberError) throw new Error(`Failed to create member: ${memberError.message}`);
    console.log(`✅ Member created (ID: ${memberData.id})`);
    console.log(`   user_id: ${memberData.user_id || "NULL"}`);
    console.log(`   invite_status: ${memberData.invite_status || "not_set"}\n`);

    // Step 2: Get a clerk to send the invite
    console.log("Step 2: Getting clerk account...");
    const { data: clerkRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "CLERK")
      .limit(1);

    if (!clerkRoles || clerkRoles.length === 0) throw new Error("No CLERK found");
    const clerkId = clerkRoles[0].user_id;
    console.log(`✅ Found clerk: ${clerkId}\n`);

    // Step 3: Send invite (this should NOT create user account)
    console.log("Step 3: Sending invite via invite-member...");
    const response = await fetch(`${supabaseUrl}/functions/v1/invite-member`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        member_id: memberData.id,
        email: testEmail,
      }),
    });

    const inviteResult = await response.json();

    if (response.status === 200) {
      console.log(`✅ Invite sent (Status: ${response.status})`);
      console.log(`   Token: ${inviteResult.invite_token?.substring(0, 20)}...`);
      console.log(`   URL: ${inviteResult.signup_url}\n`);
    } else {
      console.log(`❌ Invite failed (Status: ${response.status})`);
      console.log(`   Error: ${inviteResult.error}\n`);
      throw new Error(`Invite failed: ${inviteResult.error}`);
    }

    // Step 4: Check member after invite (should have NO user_id yet)
    console.log("Step 4: Checking member after invite...");
    const { data: memberAfterInvite } = await supabase
      .from("members")
      .select("user_id, invite_status, invite_token, invite_sent_at")
      .eq("id", memberData.id)
      .single();

    console.log(`   user_id: ${memberAfterInvite.user_id || "NULL (correct - no account created yet)"}`);
    console.log(`   invite_status: ${memberAfterInvite.invite_status}`);
    console.log(`   invite_token: ${memberAfterInvite.invite_token?.substring(0, 15)}...`);
    console.log(`   invite_sent_at: ${memberAfterInvite.invite_sent_at}\n`);

    if (memberAfterInvite.user_id) {
      throw new Error("❌ ERROR: User account was created during invite (should only happen at signup)");
    }
    console.log("✅ Correct: No user account created yet\n");

    // Step 5: User completes signup with password
    console.log("Step 5: User completes signup...");
    const testPassword = "TestPassword@123";
    const signupResponse = await fetch(`${supabaseUrl}/functions/v1/complete-signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        invite_token: memberAfterInvite.invite_token,
      }),
    });

    const signupResult = await signupResponse.json();

    if (signupResponse.status === 200) {
      console.log(`✅ Signup completed (Status: ${signupResponse.status})`);
      console.log(`   User ID: ${signupResult.user_id}\n`);
    } else {
      console.log(`❌ Signup failed (Status: ${signupResponse.status})`);
      console.log(`   Error: ${signupResult.error}\n`);
      throw new Error(`Signup failed: ${signupResult.error}`);
    }

    // Step 6: Check member after signup (should now have user_id)
    console.log("Step 6: Checking member after signup...");
    const { data: memberAfterSignup } = await supabase
      .from("members")
      .select("user_id, invite_status, invite_token")
      .eq("id", memberData.id)
      .single();

    console.log(`   user_id: ${memberAfterSignup.user_id}`);
    console.log(`   invite_status: ${memberAfterSignup.invite_status}`);
    console.log(`   invite_token: ${memberAfterSignup.invite_token || "NULL (cleared after use)"}\n`);

    if (!memberAfterSignup.user_id) {
      throw new Error("❌ ERROR: User account not linked to member");
    }
    console.log("✅ Correct: User account now linked to member\n");

    // Step 7: Verify user has VIEWER role
    console.log("Step 7: Checking user role...");
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", memberAfterSignup.user_id);

    const role = userRoles?.[0]?.role;
    console.log(`   Role: ${role}`);
    if (role === "VIEWER") {
      console.log("✅ Correct: User has VIEWER role\n");
    } else {
      console.log(`⚠️  Unexpected role: ${role}\n`);
    }

    // Cleanup
    console.log("Step 8: Cleaning up...");
    await supabase.from("members").delete().eq("id", memberData.id);
    await supabase.auth.admin.deleteUser(memberAfterSignup.user_id);
    console.log("✅ Cleanup complete\n");

    console.log("=== ALL TESTS PASSED ===\n");
    console.log("Flow Summary:");
    console.log("1. Admin sends invite → Member gets invite token, NO user created");
    console.log("2. User receives email with signup link (contains token)");
    console.log("3. User clicks link, goes to /signup?email=X&token=Y");
    console.log("4. User enters password");
    console.log("5. complete-signup called with email + password + token");
    console.log("6. User account created, linked to member, role assigned");
    console.log("7. User can now login with email + password\n");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

testInviteFlow();
