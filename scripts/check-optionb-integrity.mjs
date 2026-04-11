import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config();

if (!process.env.SUPABASE_DB_URL) {
  console.error("Missing SUPABASE_DB_URL in environment");
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

const sql = `
SELECT
  (SELECT COUNT(*) FROM public.roles WHERE is_active = true) AS active_roles,
  (SELECT COUNT(*) FROM public.permissions WHERE is_active = true) AS active_permissions,
  (SELECT COUNT(*) FROM public.role_permissions) AS role_permission_rows,
  (
    SELECT COUNT(*)
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE r.name IN ('Department Director', 'Department Secretary', 'Department Treasurer', 'Department Member')
      AND (ur.scope_type <> 'department' OR ur.scope_id IS NULL)
  ) AS invalid_department_scoped_role_rows,
  (
    SELECT COUNT(*)
    FROM public.profiles p
    WHERE p.user_type = 'member'
      AND NOT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = p.id
          AND ur.is_active = true
          AND (ur.end_date IS NULL OR ur.end_date >= CURRENT_DATE)
      )
  ) AS members_without_active_role,
  (
    SELECT COUNT(*)
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE r.name = 'SuperAdmin'
      AND (ur.scope_type <> 'global' OR ur.scope_id IS NOT NULL)
  ) AS invalid_superadmin_scope_rows;
`;

try {
  await client.connect();
  const { rows } = await client.query(sql);
  const result = rows[0] ?? {};

  console.log("Option B integrity summary:");
  console.log(JSON.stringify(result, null, 2));

  const errors = [
    Number(result.invalid_department_scoped_role_rows || 0),
    Number(result.members_without_active_role || 0),
    Number(result.invalid_superadmin_scope_rows || 0),
  ].reduce((sum, n) => sum + n, 0);

  if (errors > 0) {
    console.error("\n❌ Option B integrity check failed");
    process.exitCode = 1;
  } else {
    console.log("\n✅ Option B integrity check passed");
  }
} catch (error) {
  console.error("Integrity check failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
