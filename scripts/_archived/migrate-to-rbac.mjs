#!/usr/bin/env node
/**
 * RBAC Data Migration Script
 * Assigns System Admin role to admin user
 * 
 * Usage: node migrate-to-rbac.mjs
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("🔄 Starting RBAC Migration...\n");

  try {
    // Step 1: Check if new tables exist
    console.log("📋 Checking if RBAC tables exist...");
    const { data: rolesCheck } = await supabase
      .from("roles")
      .select("id")
      .limit(1);

    if (!rolesCheck) {
      console.error(
        "❌ RBAC tables do not exist. Run SQL migrations first:"
      );
      console.error("   supabase/migrations/add_rbac_tables.sql");
      process.exit(1);
    }

    console.log("✅ RBAC tables exist\n");

    // Step 2: Get SuperAdmin role
    console.log("📥 Fetching SuperAdmin role...");
    const { data: systemAdminRole, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("name", "SuperAdmin")
      .single();

    if (roleError || !systemAdminRole) {
      console.error("❌ SuperAdmin role not found");
      process.exit(1);
    }

    console.log("✅ Found SuperAdmin role\n");

    // Step 3: Get admin user (first user or by email)
    console.log("📥 Fetching admin user...");
    const { data: adminProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("email", "admin@glrsdac.com")
      .single();

    if (profileError || !adminProfile) {
      console.error("❌ Admin user not found. Looking for first user...");
      const { data: firstUser } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      
      if (!firstUser) {
        console.error("❌ No users found in profiles table");
        process.exit(1);
      }
      
      console.log(`✅ Using first user: ${firstUser.email}\n`);
      
      // Assign SuperAdmin role to first user
      const { error: assignError } = await supabase
        .from("user_roles")
        .insert({
          user_id: firstUser.id,
          role_id: systemAdminRole.id,
          scope_type: "global",
          scope_id: null,
          is_active: true,
        });

      if (assignError) {
        console.error("❌ Error assigning role:", assignError);
        process.exit(1);
      }

      console.log(`✅ Assigned SuperAdmin role to ${firstUser.email}`);
    } else {
      console.log(`✅ Found admin user: ${adminProfile.email}\n`);

      // Check if admin already has role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", adminProfile.id)
        .eq("role_id", systemAdminRole.id)
        .single();

      if (existingRole) {
        console.log("ℹ️  Admin user already has SuperAdmin role");
      } else {
        // Assign SuperAdmin role
        const { error: assignError } = await supabase
          .from("user_roles")
          .insert({
            user_id: adminProfile.id,
            role_id: systemAdminRole.id,
            scope_type: "global",
            scope_id: null,
            is_active: true,
          });

        if (assignError) {
          console.error("❌ Error assigning role:", assignError);
          process.exit(1);
        }

        console.log(`✅ Assigned SuperAdmin role to ${adminProfile.email}`);
      }
    }

    console.log("\n✅ RBAC Migration Complete!");
    console.log("\nNext steps:");
    console.log("1. Log in as admin user to access user management");
    console.log("2. Assign roles to other users via the Users page");
    console.log("3. Test role-based permissions");
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
