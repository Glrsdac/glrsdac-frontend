import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://upqwgwemuaqhnxskxbfr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwcXdnd2VtdWFxaG54c2t4YmZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY3ODgxOSwiZXhwIjoyMDg3MjU0ODE5fQ.TYPrxdp_NhkcZTmNA7VlQXl5VDSiwy3h1mYQMoqME5c";

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchStanleyData() {
  try {
    console.log("Fetching data for Stanley Yeboah...\n");

    // 1. Get profiles
    console.log("=== PROFILES ===");
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .or("email.ilike.%stanley%,email.ilike.%yeboah%");
    if (profileError) console.error("Profile error:", profileError);
    else console.log(JSON.stringify(profiles, null, 2));

    if (profiles && profiles.length > 0) {
      const userId = profiles[0].id;

      // 2. Get members
      console.log("\n=== MEMBERS ===");
      const { data: members, error: memberError } = await supabase
        .from("members")
        .select("*")
        .eq("user_id", userId);
      if (memberError) console.error("Member error:", memberError);
      else console.log(JSON.stringify(members, null, 2));

      if (members && members.length > 0) {
        const memberId = members[0].id;

        // 3. Get user roles
        console.log("\n=== USER ROLES ===");
        const { data: roles, error: roleError } = await supabase
          .from("user_roles")
          .select("id, user_id, role_id, church_id, active, assigned_at")
          .eq("user_id", userId);
        if (roleError) console.error("Role error:", roleError);
        else {
          console.log(`Total roles: ${roles?.length || 0}`);
          console.log(JSON.stringify(roles, null, 2));
          
          // Get role names
          if (roles && roles.length > 0) {
            for (const role of roles) {
              const { data: roleData } = await supabase
                .from("roles")
                .select("name, description, category, scope_type")
                .eq("id", role.role_id)
                .single();
              if (roleData) {
                console.log(`  → Role: ${roleData.name} (${roleData.category})`);
              }
            }
          }
        }

        // 4. Get department memberships
        console.log("\n=== DEPARTMENT MEMBERSHIPS ===");
        const { data: deptMembers, error: deptError } = await supabase
          .from("department_members")
          .select("id, department_id, assigned_role, created_at")
          .eq("member_id", memberId);
        if (deptError) console.error("Dept error:", deptError);
        else {
          console.log(JSON.stringify(deptMembers, null, 2));
          
          // Get department names
          if (deptMembers && deptMembers.length > 0) {
            for (const dept of deptMembers) {
              const { data: deptData } = await supabase
                .from("departments")
                .select("id, name, description")
                .eq("id", dept.department_id)
                .single();
              if (deptData) {
                console.log(`Department: ${JSON.stringify(deptData, null, 2)}`);
              }
            }
          }
        }

        // 5. Get contributions
        console.log("\n=== CONTRIBUTIONS ===");
        const { data: contributions, error: contribError } = await supabase
          .from("contributions")
          .select("id, amount, contribution_date, fund_id, sabbath_session_id")
          .eq("member_id", memberId)
          .order("contribution_date", { ascending: false })
          .limit(20);
        if (contribError) console.error("Contribution error:", contribError);
        else {
          console.log(`Total contributions: ${contributions?.length || 0}`);
          if (contributions && contributions.length > 0) {
            const totalAmount = contributions.reduce((sum, c) => sum + (c.amount || 0), 0);
            console.log(`Total amount contributed: GH₵ ${totalAmount.toFixed(2)}`);
            console.log("Recent contributions:");
            console.log(JSON.stringify(contributions.slice(0, 5), null, 2));
          }
        }

        // 6. Get church info
        console.log("\n=== CHURCH INFO ===");
        const { data: church } = await supabase
          .from("churches")
          .select("id, name, location")
          .eq("id", members[0].church_id)
          .single();
        if (church) console.log(JSON.stringify(church, null, 2));
      }
    }
  } catch (error) {
    console.error("Fatal error:", error);
  }
}

fetchStanleyData();
