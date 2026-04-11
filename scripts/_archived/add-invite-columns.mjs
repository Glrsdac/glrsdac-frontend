#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const supabaseUrl = "https://upqwgwemuaqhnxskxbfr.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwcXdnd2VtdWFxaG54c2t4YmZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNzkyMzI2MiwiZXhwIjoxODc1NjAwMjYyfQ.WOxxN22x89TvKzP6-IrX1oOI3Vc0yxXfmH7aPwD-_Ig";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function addInviteColumns() {
  console.log("=== Adding Invite Tracking Columns ===\n");

  const sql = readFileSync("scripts/add-invite-columns.sql", "utf-8");

  try {
    const { data, error } = await supabase.rpc("exec_sql", { sql_query: sql });

    if (error) {
      console.error("❌ Failed to add columns:", error.message);
      
      // Try alternative approach using fetch
      console.log("\nTrying alternative approach...");
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
          "apikey": serviceRoleKey,
        },
        body: JSON.stringify({ sql_query: sql }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed: ${errorText}`);
      }

      console.log("✅ Columns added successfully via REST API");
    } else {
      console.log("✅ Columns added successfully");
    }

    // Verify columns exist
    console.log("\nVerifying columns...");
    const { data: columns, error: checkError } = await supabase
      .from("members")
      .select("*")
      .limit(1);

    if (checkError) {
      console.error("❌ Error checking columns:", checkError.message);
    } else {
      const firstMember = columns?.[0];
      const hasInviteToken = firstMember && "invite_token" in firstMember;
      const hasInviteStatus = firstMember && "invite_status" in firstMember;
      
      console.log(`invite_token column: ${hasInviteToken ? "✅ Present" : "❌ Missing"}`);
      console.log(`invite_status column: ${hasInviteStatus ? "✅ Present" : "❌ Missing"}`);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

addInviteColumns();
