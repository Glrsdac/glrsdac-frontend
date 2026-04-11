import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://upqwgwemuaqhnxskxbfr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwcXdnd2VtdWFxaG54c2t4YmZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwODcwMzAxNiwiZXhwIjoyMDI0MjY2MzAxNn0.w6PsmvKLZGgFHa3LdzBOBKGNgSg8pRr-AkYakPDj0Nk";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function assignRole() {
  console.log("🔐 ASSIGNING ROLE TO STANLEY\n");
  
  try {

    // Try to find Stanley by first or last name (case-insensitive)
    let { data: members } = await supabase
      .from("members")
      .select("id, user_id, first_name, last_name")
      .ilike("first_name", "%stanley%")
      .limit(5);

    if (!members || members.length === 0) {
      // Try last name
      const res = await supabase
        .from("members")
        .select("id, user_id, first_name, last_name")
        .ilike("last_name", "%stanley%")
        .limit(5);
      members = res.data;
    }

    if (!members || members.length === 0) {
      // Print all members for debugging
      const all = await supabase.from("members").select("id, user_id, first_name, last_name").limit(20);
      console.log("❌ Stanley not found. Here are the first 20 members:");
      for (const m of all.data ?? []) {
        console.log(`- ${m.first_name} ${m.last_name} (user_id: ${m.user_id})`);
      }
      return;
    }

    for (const member of members) {
      console.log(`Found: ${member.first_name} ${member.last_name} (user_id: ${member.user_id})`);
    }

    const stanley = members[0];
    if (!stanley.user_id) {
      console.log("❌ Stanley has no user_id assigned");
      return;
    }

    // Get ADMIN role
    const { data: roles } = await supabase
      .from("roles")
      .select("id, name")
      .eq("name", "ADMIN");

    if (!roles || roles.length === 0) {
      console.log("❌ ADMIN role not found in database");
      return;
    }

    const adminRole = roles[0];
    console.log("✅ Found ADMIN role:", adminRole.id);

    // Check if already assigned
    const { data: existing } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", stanley.user_id)
      .eq("role_id", adminRole.id);

    if (existing && existing.length > 0) {
      console.log("✅ Stanley already has ADMIN role");
      return;
    }

    // Assign the role
    const { data, error } = await supabase
      .from("user_roles")
      .insert([
        {
          user_id: stanley.user_id,
          role_id: adminRole.id,
        }
      ]);

    if (error) {
      console.log("❌ Error assigning role:", error.message);
    } else {
      console.log("✅ Successfully assigned ADMIN role to Stanley!");
      console.log("   The role will now appear in the dashboard banner.");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

assignRole();
