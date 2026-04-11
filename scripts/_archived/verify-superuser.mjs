import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const email = "SuperAdmin@glrsdac.com";

async function run() {
  const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();
  if (usersErr) throw usersErr;

  const user = usersData.users.find((u) => (u.email ?? "").toLowerCase() === email);
  if (!user) {
    console.log("NOT_FOUND");
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,full_name,user_type")
    .eq("id", user.id)
    .maybeSingle();

  const { data: roles } = await supabase
    .from("user_roles")
    .select("scope_type,is_active,end_date,role:roles(name)")
    .eq("user_id", user.id)
    .eq("is_active", true);

  console.log(JSON.stringify({
    id: user.id,
    email: user.email,
    confirmed: !!user.email_confirmed_at,
    profile,
    roles,
  }, null, 2));
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
