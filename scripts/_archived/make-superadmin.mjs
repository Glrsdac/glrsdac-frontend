import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("❌ SUPABASE_DB_URL not set");
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function makeSuperadmin() {

  await client.connect();
  // Get user id for admin@glrsdac.com
  const { rows: users } = await client.query(
    `SELECT id FROM auth.users WHERE email = $1 LIMIT 1`,
    ["admin@glrsdac.com"]
  );
  if (!users.length) {
    console.error("❌ User admin@glrsdac.com not found in auth.users");
    process.exit(1);
  }
  const userId = users[0].id;

  // Get role_id for 'SuperAdmin'
  const { rows: roleRows } = await client.query(
    `SELECT id FROM roles WHERE name = 'SuperAdmin' LIMIT 1`
  );
  if (!roleRows.length) {
    console.error("❌ 'System Admin' role not found in roles table");
    process.exit(1);
  }
  const roleId = roleRows[0].id;

  // Check if already superadmin
  const { rows: userRoleRows } = await client.query(
    `SELECT * FROM user_roles WHERE user_id = $1 AND role_id = $2 AND scope_type = 'global'`,
    [userId, roleId]
  );
  if (userRoleRows.length) {
    console.log("✅ admin@glrsdac.com is already a superadmin");
    process.exit(0);
  }

  // Insert System Admin role for user
  await client.query(
    `INSERT INTO user_roles (user_id, role_id, scope_type, is_active) VALUES ($1, $2, 'global', true)`,
    [userId, roleId]
  );
  console.log("✅ admin@glrsdac.com is now a superadmin");
  await client.end();
}

makeSuperadmin();