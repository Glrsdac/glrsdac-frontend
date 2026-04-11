import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("Missing SUPABASE_DB_URL");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  const { rows: duplicateGroups } = await client.query(`
    SELECT lower(trim(name)) AS key, COUNT(*)::int AS total
    FROM public.departments
    GROUP BY 1
    HAVING COUNT(*) > 1
    ORDER BY total DESC, key ASC
  `);

  const { rows: treasuryRows } = await client.query(`
    SELECT id, name, is_active, created_at
    FROM public.departments
    WHERE lower(trim(name)) = 'treasury'
    ORDER BY created_at ASC, id ASC
  `);

  console.log("Duplicate department name groups:");
  console.table(duplicateGroups);
  console.log("Treasury rows:");
  console.table(treasuryRows);
} finally {
  await client.end();
}
