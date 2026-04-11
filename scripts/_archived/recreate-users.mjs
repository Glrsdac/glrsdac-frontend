import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CONFIRM = process.env.CONFIRM_DROP_USERS === "true";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
  process.exit(1);
}

if (!CONFIRM) {
  console.error("Set CONFIRM_DROP_USERS=true to proceed.");
  process.exit(1);
}

const seedPath = path.join(__dirname, "users-seed.json");
const seedUsers = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

if (!Array.isArray(seedUsers) || seedUsers.length === 0) {
  console.error("users-seed.json is empty or invalid.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

async function deleteAllUsers() {
  let page = 1;
  const perPage = 100;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data.users || [];
    if (users.length === 0) break;
    for (const user of users) {
      await supabase.auth.admin.deleteUser(user.id);
      await supabase.from("profiles").delete().eq("id", user.id);
      await supabase.from("user_roles").delete().eq("user_id", user.id);
    }
    if (users.length < perPage) break;
    page += 1;
  }
}

async function recreateUsers() {
  const { data: roles, error: rolesError } = await supabase
    .from("roles")
    .select("id, name")
    .eq("is_active", true);

  if (rolesError) throw rolesError;
  const roleMap = new Map((roles ?? []).map((r) => [r.name, r.id]));

  for (const user of seedUsers) {
    const roleId = roleMap.get(user.role_name);
    if (!roleId) {
      throw new Error(`Role not found: ${user.role_name}`);
    }

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
    });

    if (createError || !created.user) {
      throw createError || new Error("Failed to create user");
    }

    const userId = created.user.id;

    await supabase.from("profiles").insert({
      id: userId,
      email: user.email,
      full_name: user.full_name,
    });

    await supabase.from("user_roles").insert({
      user_id: userId,
      role_id: roleId,
      scope_type: user.scope_type || "global",
      scope_id: user.scope_id || null,
      is_active: true,
    });

    console.log(`Created ${user.email} (${user.role_name})`);
  }
}

(async () => {
  try {
    console.log("Deleting all users...");
    await deleteAllUsers();
    console.log("Recreating users from seed...");
    await recreateUsers();
    console.log("Done.");
  } catch (err) {
    console.error("Error:", err.message || err);
    process.exit(1);
  }
})();
