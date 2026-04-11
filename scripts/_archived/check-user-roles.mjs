import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from("user_roles")
  .select(`
    id,
    user_id,
    scope_type,
    is_active,
    roles (
      name,
      category
    )
  `);

if (error) {
  console.error("Error:", error);
} else {
  console.log("\nUser role assignments:");
  console.log(JSON.stringify(data, null, 2));
}
