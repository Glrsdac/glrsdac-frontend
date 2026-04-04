/**
 * Initialize required departments for portal access
 * Called on app startup to ensure Treasury, Clerk, and Member departments exist
 */

import { supabase } from "@/integrations/supabase/client";

const REQUIRED_DEPARTMENTS = [
  {
    name: "Treasury",
    description: "Treasury Portal - Financial operations and record management",
    is_active: true,
  },
  {
    name: "Clerk",
    description: "Clerk Portal - Membership and administrative records",
    is_active: true,
  },
  {
    name: "Member",
    description: "Member Portal - Self-service member access",
    is_active: true,
  },
];

export async function initializePortalDepartments() {
  try {
    for (const dept of REQUIRED_DEPARTMENTS) {
      // Check if department already exists (case-insensitive, tolerant of historical duplicates)
      const { data: existingRows, error: existingError } = await supabase
        .from("departments")
        .select("id")
        .ilike("name", dept.name)
        .limit(1);

      if (existingError) {
        console.warn(`Failed to check existing ${dept.name} department:`, existingError);
        continue;
      }

      if (!existingRows || existingRows.length === 0) {
        const { error } = await supabase
          .from("departments")
          .insert(dept as any);

        if (error) {
          console.warn(`Failed to create ${dept.name} department:`, error);
        } else {
          console.log(`Created ${dept.name} department`);
        }
      }
    }
  } catch (error) {
    console.error("Error initializing portal departments:", error);
  }
}
