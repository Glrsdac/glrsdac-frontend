import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAdminPermissions() {
  // Get SuperAdmin role
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id, name, category")
    .eq("name", "SuperAdmin")
    .limit(1)
    .single();
  
  if (roleError || !role) {
    console.error("❌ SuperAdmin/System Admin role not found:", roleError);
    return;
  }
  
  console.log(`\n📋 ${role.name} Role: ${role.id}\n`);
  
  // Get all permissions for System Admin
  const { data: rolePermissions, error: permError } = await supabase
    .from("role_permissions")
    .select(`
      id,
      permission_id,
      permissions!inner(id, action, resource, description)
    `)
    .eq("role_id", role.id);
  
  if (permError) {
    console.error("❌ Error fetching permissions:", permError);
    return;
  }
  
  if (!rolePermissions || rolePermissions.length === 0) {
    console.log("⚠️  System Admin has NO permissions assigned!\n");
    console.log("Expected permissions:");
    console.log("  - manage:users");
    console.log("  - manage:roles");
    console.log("  - manage:permissions");
    console.log("  - read:users");
    console.log("  - etc.\n");
    return;
  }
  
  console.log(`✅ ${role.name} has ${rolePermissions.length} permission(s):\n`);
  
  rolePermissions.forEach(rp => {
    console.log(`   ${rp.permissions.action}:${rp.permissions.resource}`);
    if (rp.permissions.description) {
      console.log(`      → ${rp.permissions.description}`);
    }
  });
  
  // Check specifically for user management permissions
  const userPerms = rolePermissions.filter(rp => 
    rp.permissions.resource === "users" || rp.permissions.resource === "user"
  );
  
  console.log(`\n👥 User Management Permissions (${userPerms.length}):`);
  if (userPerms.length === 0) {
    console.log("   ⚠️  NO user management permissions found!");
  } else {
    userPerms.forEach(rp => {
      console.log(`   ✓ ${rp.permissions.action}:${rp.permissions.resource}`);
    });
  }
  
  // Check for role management permissions
  const rolePerms = rolePermissions.filter(rp => 
    rp.permissions.resource === "roles" || rp.permissions.resource === "role"
  );
  
  console.log(`\n🛡️  Role Management Permissions (${rolePerms.length}):`);
  if (rolePerms.length === 0) {
    console.log("   ⚠️  NO role management permissions found!");
  } else {
    rolePerms.forEach(rp => {
      console.log(`   ✓ ${rp.permissions.action}:${rp.permissions.resource}`);
    });
  }
}

checkAdminPermissions();
