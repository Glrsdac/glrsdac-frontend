import dotenv from "dotenv";

dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;

async function login(email, password) {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data.access_token;
}

async function call(token, body) {
  const res = await fetch(`${url}/functions/v1/admin-manage-roles`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      "x-user-token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

const token = await login("SuperAdmin@glrsdac.com", "Kwabena754");
const rolesRes = await call(token, { action: "list_roles" });
const roleId = rolesRes.data?.roles?.[0]?.id;
const rolePermsRes = await call(token, { action: "list_role_permissions", role_id: roleId });

console.log(JSON.stringify({
  list_roles_status: rolesRes.status,
  role_id: roleId,
  list_role_permissions_status: rolePermsRes.status,
  role_permissions_count: rolePermsRes.data?.role_permissions?.length ?? null,
}, null, 2));
