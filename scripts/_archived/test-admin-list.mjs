import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test: Call admin-list-users as the admin user
const { data: adminUser } = await supabase
  .from("profiles")
  .select("id")
  .eq("email", "admin@glrsdac.com")
  .single();

if (!adminUser) {
  console.error("❌ Admin user not found");
  process.exit(1);
}

// Get admin's session (for JWT token)
const { data: { session } } = await supabase.auth.refreshSession();

if (!session?.access_token) {
  console.error("❌ No session token available");
  process.exit(1);
}

console.log("Testing admin-list-users endpoint...");
const response = await fetch(
  `${supabaseUrl}/functions/v1/admin-list-users`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: process.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({}),
  }
);

const result = await response.json();

console.log(`\nStatus: ${response.status}`);
if (response.ok) {
  console.log(`✅ Success! Found ${result.users?.length ?? 0} users`);
  if (result.users && result.users.length > 0) {
    console.log("\nFirst user:");
    console.log(JSON.stringify(result.users[0], null, 2));
  }
} else {
  console.error("❌ Error:", result.error || result.message);
}
