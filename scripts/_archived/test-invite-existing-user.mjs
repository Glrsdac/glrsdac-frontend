#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://upqwgwemuaqhnxskxbfr.supabase.co";
const serviceRoleKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwcXdnd2VtdWFxaG54c2t4YmZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNzkyMzI2MiwiZXhwIjoxODc1NjAwMjYyfQ.WOxxN22x89TvKzP6-IrX1oOI3Vc0yxXfmH7aPwD-_Ig";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testExistingUserInvite() {
  console.log("=== Testing Invite with Existing Unlinked User ===\n");

  const testEmail = `test.existing.${Date.now()}@example.com`;

  try {
    // Step 1: Create a user in auth.users
    console.log("Step 1: Creating user account in auth...");
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: Math.random().toString(36).slice(-12),
      email_confirm: false,
    });

    if (userError) throw new Error(`Failed to create user: ${userError.message}`);
    console.log(`✅ User created: ${userData.user.id}\n`);

    // Step 2: Create a member WITHOUT user_id (unlinked)
    console.log("Step 2: Creating unlinked member...");
    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .insert({
        first_name: "Existing",
        last_name: "User",
        email: testEmail,
        status: "active",
      })
      .select()
      .single();

    if (memberError) throw new Error(`Failed to create member: ${memberError.message}`);
    console.log(`✅ Member created (ID: ${memberData.id}, user_id: ${memberData.user_id})\n`);

    // Step 3: Get a clerk to send the invite
    console.log("Step 3: Getting clerk account to send invite...");
    const { data: clerkList } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "CLERK")
      .limit(1)
      .single();

    if (!clerkList) throw new Error("No CLERK found in system");

    const clerkToken = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: "clerk@glrsdac.org", // We'll use this to test
    });

    console.log(`✅ Using clerk for invite\n`);

    // Step 4: Call invite-member (should now handle existing user)
    console.log("Step 4: Calling invite-member function...");
    const response = await fetch(
      `${supabaseUrl}/functions/v1/invite-member`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          member_id: memberData.id,
        }),
      }
    );

    const result = await response.json();

    if (response.status === 200) {
      console.log(`✅ Invite sent successfully (Status: ${response.status})`);
      console.log(`   Response: ${JSON.stringify(result, null, 2)}\n`);

      // Step 5: Verify the member is now linked
      console.log("Step 5: Verifying member is linked...");
      const { data: linkedMember } = await supabase
        .from("members")
        .select("*")
        .eq("id", memberData.id)
        .single();

      if (linkedMember.user_id === userData.user.id) {
        console.log(`✅ Member successfully linked to existing user!\n`);
      } else {
        console.log(`❌ Member not properly linked\n`);
      }
    } else {
      console.log(`❌ Invite failed (Status: ${response.status})`);
      console.log(`   Error: ${JSON.stringify(result, null, 2)}\n`);
    }

    // Cleanup
    console.log("Step 6: Cleaning up...");
    await supabase.from("members").delete().eq("id", memberData.id);
    console.log("✅ Test complete\n");
  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

testExistingUserInvite();
