import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const client = new pg.Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  const { rows: indexRows } = await client.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'departments'
      AND indexname = 'ux_departments_name_normalized'
  `);

  const { rows: duplicateRows } = await client.query(`
    SELECT lower(trim(name)) AS normalized_name, COUNT(*)::int AS total
    FROM public.departments
    GROUP BY 1
    HAVING COUNT(*) > 1
  `);

  console.log("Unique index rows:");
  console.table(indexRows);
  console.log("Duplicate normalized names:");
  console.table(duplicateRows);
} finally {
  await client.end();
}
