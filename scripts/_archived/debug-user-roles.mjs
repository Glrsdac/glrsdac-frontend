import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://upqwgwemuaqhnxskxbfr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwcXdnd2VtdWFxaG54c2t4YmZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2Nzg4MTksImV4cCI6MjA4NzI1NDgxOX0.zTphCl9xqoEe2N55uYyeVczn09nO5BsdEcmLPZLYbUs";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkUserRoles() {
  console.log("🔍 CHECKING USER ROLES & PERMISSIONS\n");
  console.log("=".repeat(60));

  try {
    // Get the auth session to find the logged-in user
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      console.log("❌ No authenticated user found");
      console.log("You need to be logged in to check roles.");
      return;
    }

    const userId = session.user.id;
    console.log(`\n👤 User ID: ${userId}`);
    console.log(`📧 Email: ${session.user.email}`);

    // Check user roles
    console.log("\n1️⃣  USER ROLES:");
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role_id, roles(id, name)")
      .eq("user_id", userId);

    if (roleError) {
      console.log("   ❌ Error:", roleError.message);
    } else {
      const roles = (roleData ?? []).map((r: any) => r.roles?.name).filter(Boolean);
      if (roles.length === 0) {
        console.log("   ⚠️  No roles assigned");
      } else {
        console.log("   ✅ Roles:", roles.join(", "));
      }
    }

    // Check department memberships
    console.log("\n2️⃣  DEPARTMENT MEMBERSHIPS:");
    const { data: deptData, error: deptError } = await supabase
      .from("department_members")
      .select("department_id, departments(name)")
      .eq("member_id", userId);

    if (deptError) {
      console.log("   ❌ Error:", deptError.message);
    } else {
      const departments = (deptData ?? []).map((d: any) => d.departments?.name).filter(Boolean);
      if (departments.length === 0) {
        console.log("   ⚠️  No department memberships");
      } else {
        console.log("   ✅ Departments:", departments.join(", "));
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("\n📊 MANAGER VIEW ELIGIBILITY:\n");

    const { data: roleData: finalRoles } = await supabase
      .from("user_roles")
      .select("role_id, roles(name)")
      .eq("user_id", userId);
    
    const roles = (finalRoles ?? []).map((r: any) => r.roles?.name).filter(Boolean);
    const managerRoles = ["ADMIN", "TREASURER", "CLERK", "System Admin", "Super Admin", "SuperAdmin"];
    const hasManagerRole = roles.some((r) => managerRoles.includes(r));

    const { data: deptData: finalDepts } = await supabase
      .from("department_members")
      .select("department_id")
      .eq("member_id", userId);
    
    const hasDepartmentMembership = (finalDepts ?? []).length > 0;

    console.log(`✓ Has Manager Role: ${hasManagerRole ? "YES ✅" : "NO ❌"}`);
    console.log(`✓ Has Department Membership: ${hasDepartmentMembership ? "YES ✅" : "NO ❌"}`);

    if (hasManagerRole || hasDepartmentMembership) {
      console.log("\n✅ Manager View SHOULD be available");
    } else {
      console.log("\n❌ Manager View is NOT available");
      console.log("\n💡 To enable Manager View, you need:");
      console.log("   • A manager role (ADMIN, TREASURER, CLERK, etc.), OR");
      console.log("   • A department membership");
    }

  } catch (error) {
    console.error("❌ Unexpected error:", error.message);
  }
}

checkUserRoles();
