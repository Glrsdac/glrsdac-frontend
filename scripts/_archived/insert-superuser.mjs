import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const email = "SuperAdmin@glrsdac.com";
const password = "Kwabena754";
const fullName = "Super User";

async function run() {
  const { data: roles, error: roleErr } = await supabase
    .from("roles")
    .select("id,name")
    .eq("name", "SuperAdmin")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(1);

  if (roleErr || !roles || roles.length === 0) {
    throw new Error(`Admin role not found: ${roleErr?.message ?? "no role rows"}`);
  }

  const adminRole = roles[0];

  const { data: listed, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) throw new Error(`List users failed: ${listErr.message}`);

  let user = listed.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (error || !data.user) {
      throw new Error(`Create user failed: ${error?.message ?? "no user"}`);
    }

    user = data.user;
    console.log(`Created auth user: ${user.id}`);
  } else {
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { ...(user.user_metadata ?? {}), full_name: fullName },
    });

    if (error) {
      throw new Error(`Update existing user failed: ${error.message}`);
    }

    console.log(`User already existed, updated credentials: ${user.id}`);
  }

  const profilePayload = {
    id: user.id,
    email,
    full_name: fullName,
    user_type: "system_admin",
  };

  let { error: profileErr } = await supabase
    .from("profiles")
    .upsert(profilePayload, { onConflict: "id" });

  if (profileErr?.message?.toLowerCase().includes("user_type")) {
    const retry = await supabase
      .from("profiles")
      .upsert({ id: user.id, email, full_name: fullName }, { onConflict: "id" });
    profileErr = retry.error;
  }

  if (profileErr) {
    throw new Error(`Upsert profile failed: ${profileErr.message}`);
  }

  const { data: existingRoleRows, error: existingRoleErr } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", user.id)
    .eq("role_id", adminRole.id)
    .eq("is_active", true)
    .eq("scope_type", "global")
    .is("scope_id", null)
    .limit(1);

  if (existingRoleErr) {
    throw new Error(`Check existing role failed: ${existingRoleErr.message}`);
  }

  if (!existingRoleRows || existingRoleRows.length === 0) {
    const today = new Date().toISOString().slice(0, 10);
    const { error: insertRoleErr } = await supabase
      .from("user_roles")
      .insert({
        user_id: user.id,
        role_id: adminRole.id,
        scope_type: "global",
        scope_id: null,
        start_date: today,
        end_date: null,
        is_active: true,
      });

    if (insertRoleErr) {
      throw new Error(`Assign admin role failed: ${insertRoleErr.message}`);
    }

    console.log(`Assigned role: ${adminRole.name}`);
  } else {
    console.log(`Role already assigned: ${adminRole.name}`);
  }

  console.log(`DONE | email=${email} | user_id=${user.id} | role=${adminRole.name}`);
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
