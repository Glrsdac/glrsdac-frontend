import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixDuplicateRoles() {
  console.log("🔍 Finding duplicate role assignments...\n");
  
  // Get all role assignments
  const { data: allRoles, error } = await supabase
    .from("user_roles")
    .select("*")
    .order("user_id, role_id, start_date");
  
  if (error) {
    console.error("Error fetching roles:", error);
    return;
  }
  
  // Group by user_id + role_id + scope
  const grouped = {};
  allRoles.forEach(ur => {
    const key = `${ur.user_id}-${ur.role_id}-${ur.scope_type || "global"}-${ur.scope_id || ""}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(ur);
  });
  
  // Find duplicates
  const duplicates = Object.entries(grouped).filter(([_, roles]) => roles.length > 1);
  
  if (duplicates.length === 0) {
    console.log("✓ No duplicate role assignments found");
    return;
  }
  
  console.log(`Found ${duplicates.length} duplicate role assignment(s):\n`);
  
  const toDelete = [];
  
  duplicates.forEach(([key, roles]) => {
    const [userId, roleId, scopeType, scopeId] = key.split("-");
    console.log(`\nUser ${userId.substring(0, 8)}... has ${roles.length} assignments for role ${roleId.substring(0, 8)}...`);
    
    // Keep the oldest one (earliest start_date), delete the rest
    const sorted = [...roles].sort((a, b) => {
      const dateA = new Date(a.start_date || a.created_at || "1970-01-01");
      const dateB = new Date(b.start_date || b.created_at || "1970-01-01");
      return dateA - dateB;
    });
    
    console.log(`  Keeping: ${sorted[0].id} (${sorted[0].start_date || sorted[0].created_at})`);
    
    for (let i = 1; i < sorted.length; i++) {
      console.log(`  Deleting: ${sorted[i].id} (${sorted[i].start_date || sorted[i].created_at})`);
      toDelete.push(sorted[i].id);
    }
  });
  
  if (toDelete.length > 0) {
    console.log(`\n🗑️  Deleting ${toDelete.length} duplicate role assignment(s)...`);
    
    const { error: deleteError } = await supabase
      .from("user_roles")
      .delete()
      .in("id", toDelete);
    
    if (deleteError) {
      console.error("Error deleting duplicates:", deleteError);
      return;
    }
    
    console.log("✓ Duplicates removed successfully");
  }
  
  console.log("\n✅ Done! Run 'apply-sql.mjs scripts/add-unique-constraint.sql' to add unique constraint.");
}

fixDuplicateRoles();
