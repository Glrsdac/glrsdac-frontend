import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://upqwgwemuaqhnxskxbfr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwcXdnd2VtdWFxaG54c2t4YmZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY3ODgxOSwiZXhwIjoyMDg3MjU0ODE5fQ.TYPrxdp_NhkcZTmNA7VlQXl5VDSiwy3h1mYQMoqME5c";

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchStanleyData() {
  try {
    console.log("===============================================");
    console.log("STANLEY YEBOAH - Complete Data Fetch");
    console.log("===============================================\n");

    // 1. Get profiles
    console.log("=== AUTHENTICATION & PROFILE ===");
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .or("email.ilike.%stanley%,email.ilike.%yeboah%");
    
    if (profiles && profiles.length > 0) {
      const profile = profiles[0];
      console.log(`✓ Profile ID: ${profile.id}`);
      console.log(`✓ Full Name: ${profile.full_name}`);
      console.log(`✓ Email: ${profile.email}`);
      console.log(`✓ Account Created: ${new Date(profile.created_at).toLocaleDateString()}\n`);

      const userId = profile.id;

      // 2. Get members
      console.log("=== MEMBER INFORMATION ===");
      const { data: members } = await supabase
        .from("members")
        .select("*")
        .eq("user_id", userId);
      
      if (members && members.length > 0) {
        const member = members[0];
        console.log(`✓ Member ID: ${member.id}`);
        console.log(`✓ Member Number: ${member.member_no}`);
        console.log(`✓ First Name: ${member.first_name}`);
        console.log(`✓ Last Name: ${member.last_name}`);
        console.log(`✓ Known As: ${member.known_as}`);
        console.log(`✓ Title: ${member.title}`);
        console.log(`✓ Gender: ${member.gender}`);
        console.log(`✓ Date of Birth: ${new Date(member.dob).toLocaleDateString()}`);
        console.log(`✓ Age: ${new Date().getFullYear() - new Date(member.dob).getFullYear()} years`);
        console.log(`✓ Status: ${member.status}`);
        console.log(`✓ Position: ${member.position}`);
        console.log(`✓ Phone: ${member.phone}`);
        console.log(`✓ Email: ${member.email}`);
        console.log(`✓ Church ID: ${member.church_id}`);
        console.log(`✓ Is Disciplined: ${member.is_disciplined}`);
        console.log(`✓ Membership Date: ${new Date(member.created_at).toLocaleDateString()}\n`);

        const memberId = member.id;

        // 3. Get user roles
        console.log("=== USER ROLES & PERMISSIONS ===");
        const { data: roles, error: roleError } = await supabase
          .from("user_roles")
          .select("*")
          .eq("user_id", userId);
        
        if (roleError) {
          console.log(`⚠ Could not fetch role details: ${roleError.message}`);
        } else if (!roles || roles.length === 0) {
          console.log(`ℹ No assigned roles found`);
        } else {
          console.log(`✓ Total Roles: ${roles.length}`);
          for (const role of roles) {
            try {
              const { data: roleData, error: rdError } = await supabase
                .from("roles")
                .select("name, description, category, scope_type")
                .eq("id", role.role_id)
                .single();
              
              if (rdError) {
                console.log(`  └─ Role ID: ${role.role_id} (details unavailable)`);
              } else if (roleData) {
                console.log(`  └─ Role: ${roleData.name}`);
                console.log(`     Category: ${roleData.category}, Scope: ${roleData.scope_type}`);
                console.log(`     Description: ${roleData.description}`);
              }
            } catch (e) {
              console.log(`  └─ Role ID: ${role.role_id}`);
            }
          }
        }
        console.log();

        // 4. Get department memberships
        console.log("=== DEPARTMENT ASSIGNMENTS ===");
        const { data: deptMembers } = await supabase
          .from("department_members")
          .select("*")
          .eq("member_id", memberId);
        
        if (!deptMembers || deptMembers.length === 0) {
          console.log(`ℹ No department assignments found`);
        } else {
          console.log(`✓ Total Departments: ${deptMembers.length}`);
          for (const dept of deptMembers) {
            console.log(`  └─ Department ID: ${dept.department_id}`);
            if (dept.assigned_role) console.log(`     Role: ${dept.assigned_role}`);
            console.log(`     Assigned: ${new Date(dept.created_at).toLocaleDateString()}`);
          }
        }
        console.log();

        // 5. Get contributions
        console.log("=== CONTRIBUTIONS ===");
        const { data: contributions } = await supabase
          .from("contributions")
          .select("*")
          .eq("member_id", memberId)
          .order("contribution_date", { ascending: false });
        
        if (!contributions || contributions.length === 0) {
          console.log(`ℹ No contributions recorded`);
        } else {
          const totalAmount = contributions.reduce((sum, c) => sum + (c.amount || 0), 0);
          console.log(`✓ Total Contributions: ${contributions.length}`);
          console.log(`✓ Total Amount: GH₵ ${totalAmount.toFixed(2)}`);
          console.log(`✓ Period: ${new Date(contributions[contributions.length - 1].contribution_date).toLocaleDateString()} - ${new Date(contributions[0].contribution_date).toLocaleDateString()}`);
          console.log(`\nFirst 5 Contributions:`);
          contributions.slice(0, 5).forEach((c, idx) => {
            console.log(`  ${idx + 1}. GH₵ ${c.amount.toFixed(2)} on ${new Date(c.contribution_date).toLocaleDateString()}`);
          });
        }
        console.log();

        // 6. Get church info
        console.log("=== CHURCH AFFILIATION ===");
        try {
          const { data: church, error: churchError } = await supabase
            .from("churches")
            .select("id, name")
            .eq("id", member.church_id)
            .single();
          
          if (churchError) {
            console.log(`⚠ Church details unavailable: ${churchError.message}`);
          } else if (church) {
            console.log(`✓ Church: ${church.name}`);
          }
        } catch (e) {
          console.log(`⚠ Could not fetch church info`);
        }
      }
    } else {
      console.log("⚠ Stanley Yeboah not found in the system");
    }

    console.log("\n===============================================");
    console.log("End of Report");
    console.log("===============================================");
  } catch (error) {
    console.error("Fatal error:", error);
  }
}

fetchStanleyData();
