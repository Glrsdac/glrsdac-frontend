import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAdminUserRoles() {
  const adminEmail = "admin@glrsdac.com";
  
  // Get admin user ID
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error("Error fetching users:", userError);
    return;
  }
  
  const adminUser = users.users.find(u => u.email === adminEmail);
  if (!adminUser) {
    console.error("Admin user not found");
    return;
  }
  
  console.log(`\nChecking roles for ${adminEmail} (${adminUser.id}):\n`);
  
  // Get all role assignments
  const { data: userRoles, error: rolesError } = await supabase
    .from("user_roles")
    .select(`
      id,
      role_id,
      scope_type,
      scope_id,
      is_active,
      start_date,
      end_date,
      roles!inner(id, name, category)
    `)
    .eq("user_id", adminUser.id);
  
  if (rolesError) {
    console.error("Error fetching roles:", rolesError);
    return;
  }
  
  console.log(`Found ${userRoles.length} role assignment(s):\n`);
  
  userRoles.forEach((ur, index) => {
    console.log(`${index + 1}. ${ur.roles.name} (${ur.roles.category})`);
    console.log(`   - Assignment ID: ${ur.id}`);
    console.log(`   - Role ID: ${ur.role_id}`);
    console.log(`   - Scope Type: ${ur.scope_type} (type: ${typeof ur.scope_type})`);
    console.log(`   - Scope ID: ${ur.scope_id}`);
    console.log(`   - Active: ${ur.is_active}`);
    console.log(`   - Start: ${ur.start_date || "N/A"}`);
    console.log(`   - End: ${ur.end_date || "N/A"}`);
    console.log();
  });
  
  // Check for duplicates
  const roleCounts = {};
  userRoles.forEach(ur => {
    const key = `${ur.role_id}-${ur.scope_type || "global"}-${ur.scope_id || ""}`;
    roleCounts[key] = (roleCounts[key] || 0) + 1;
  });
  
  const duplicates = Object.entries(roleCounts).filter(([_, count]) => count > 1);
  if (duplicates.length > 0) {
    console.log("⚠️  DUPLICATE ROLE ASSIGNMENTS FOUND:");
    duplicates.forEach(([key, count]) => {
      console.log(`   - ${key}: ${count} assignments`);
    });
  } else {
    console.log("✓ No duplicate role assignments found");
  }
}

checkAdminUserRoles();
