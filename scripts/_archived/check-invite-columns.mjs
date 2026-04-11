#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://upqwgwemuaqhnxskxbfr.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwcXdnd2VtdWFxaG54c2t4YmZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNzkyMzI2MiwiZXhwIjoxODc1NjAwMjYyfQ.WOxxN22x89TvKzP6-IrX1oOI3Vc0yxXfmH7aPwD-_Ig";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkAndAddColumns() {
  console.log("=== Checking & Adding Invite Columns ===\n");

  try {
    // Check if columns exist by trying to select them
    console.log("Step 1: Checking if columns exist...");
    const { data, error } = await supabase
      .from("members")
      .select("invite_token, invite_status, invite_sent_at, invite_accepted_at")
      .limit(1);

    if (error) {
      console.log("❌ Columns missing or error:", error.message);
      console.log("\nStep 2: Adding missing columns...\n");

      // Use SQL to add columns
      const sqlStatements = [
        `ALTER TABLE public.members ADD COLUMN IF NOT EXISTS invite_token VARCHAR(255) UNIQUE;`,
        `ALTER TABLE public.members ADD COLUMN IF NOT EXISTS invite_status VARCHAR(50) DEFAULT 'not_invited';`,
        `ALTER TABLE public.members ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ;`,
        `ALTER TABLE public.members ADD COLUMN IF NOT EXISTS invite_accepted_at TIMESTAMPTZ;`,
      ];

      for (const sql of sqlStatements) {
        try {
          const { error: sqlError } = await supabase.rpc("exec_sql", { sql_query: sql }).catch(() => ({ error: { message: "RPC not available" } }));
          if (sqlError) {
            console.log(`⚠️  Could not execute via RPC: ${sql}`);
          }
        } catch (e) {
          console.log(`⚠️  Skipped: ${sql}`);
        }
      }

      console.log("\n⚠️  Columns need to be added manually via Supabase SQL Editor");
      console.log("\nGo to: Supabase Dashboard → SQL Editor → Create new query");
      console.log("Paste and run this SQL:\n");
      console.log(`ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS invite_token VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS invite_status VARCHAR(50) DEFAULT 'not_invited',
ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS invite_accepted_at TIMESTAMPTZ;`);
    } else {
      console.log("✅ All columns exist!");
      console.log(`Sample data retrieved: ${data?.length || 0} record(s)\n`);
    }

    // Check members table structure
    console.log("Step 3: Checking members table structure...");
    const { data: tableInfo } = await supabase.rpc("get_table_columns", { table_name: "members" }).catch(() => ({ data: null }));
    
    if (tableInfo) {
      console.log("Table columns:", tableInfo);
    } else {
      console.log("Could not retrieve table structure");
    }

  } catch (error) {
    console.error("Error:", error.message);
  }
}

checkAndAddColumns();
