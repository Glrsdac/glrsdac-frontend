import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const ADMIN_UUID = "e6801862-882e-4b41-ac21-b064e28a173b";

async function fixAdminAccess() {
  console.log("🔧 Fixing admin@glrsdac.com Manager View access...\n");

  // 1. Create/verify profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: ADMIN_UUID,
      full_name: "System Administrator",
      email: "admin@glrsdac.com"
    }, { onConflict: "id" })
    .select("id, full_name")
    .single();

  if (profileError) {
    console.error("❌ Profile error:", profileError.message);
  } else {
    console.log("✅ Profile:", profile.full_name);
  }

  // 2. Create member record
  const { data: existingMember } = await supabase
    .from("members")
    .select("id")
    .eq("user_id", ADMIN_UUID)
    .single();

  let memberId;
  if (!existingMember) {
    const { data: member, error: memberError } = await supabase
      .from("members")
      .insert({
        user_id: ADMIN_UUID,
        first_name: "System",
        last_name: "Administrator",
        status: "Active"
      })
      .select("id")
      .single();

    if (memberError) {
      console.error("❌ Member error:", memberError.message);
    } else {
      memberId = member.id;
      console.log("✅ Created member ID:", memberId);
    }
  } else {
    memberId = existingMember.id;
    console.log("✅ Member exists ID:", memberId);
  }

  // 3. Get departments for membership (pick first active)
  const { data: depts } = await supabase
    .from("departments")
    .select("id, name")
    .eq("is_active", true)
    .order("name")
    .limit(1)
    .single();

  if (depts && memberId) {
    const { error: deptError } = await supabase
      .from("department_members")
      .upsert({
        member_id: memberId,
        department_id: depts.id,
        assigned_role: "Director",
        is_active: true
      }, { 
        onConflict: "(member_id, department_id)",
        ignoreDuplicates: true 
      });

    if (deptError) {
      console.error("⚠️  Dept membership error:", deptError.message);
    } else {
      console.log("✅ Added to department:", depts.name);
    }
  } else {
    console.log("⚠️  No active departments found for membership");
  }

  // 4. Verify roles (should exist)
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role, is_active")
    .eq("user_id", ADMIN_UUID);

  console.log("\n📋 Admin Roles:", roles?.map(r => `${r.role} (${r.is_active})`) || "None");

  console.log("\n🎉 Fix complete! Clear browser localStorage, relogin → Manager View works");
  console.log("   Run: node scripts/diagnose-admin-access.mjs to verify");
}

fixAdminAccess().catch(console.error);

