import dotenv from "dotenv";

dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;

const email = "SuperAdmin@glrsdac.com";
const password = "Kwabena754";

async function login() {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anon,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Login failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function callFn(fn, body, token) {
  const res = await fetch(`${url}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      "x-user-token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  return { status: res.status, data };
}

async function run() {
  const token = await login();
  const roleRes = await callFn("admin-manage-roles", { action: "list_roles" }, token);
  const permRes = await callFn("admin-manage-roles", { action: "list_permissions" }, token);

  console.log(JSON.stringify({
    list_roles_status: roleRes.status,
    list_permissions_status: permRes.status,
    roles_count: roleRes.data?.roles?.length ?? null,
    permissions_count: permRes.data?.permissions?.length ?? null,
    list_roles_error: roleRes.data?.error ?? null,
    list_permissions_error: permRes.data?.error ?? null,
  }, null, 2));
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
