import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("Missing SUPABASE_DB_URL");
  process.exit(1);
}

const [, , action, table] = process.argv;
if (!action || !table) {
  console.error("Usage: npm run db:query -- <list|count|info> <table>");
  process.exit(1);
}

const safeTable = String(table).replace(/[^a-zA-Z0-9_]/g, "");
if (!safeTable) {
  console.error("Invalid table name");
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();

  if (action === "count") {
    const { rows } = await client.query(`SELECT COUNT(*)::int AS count FROM public.${safeTable}`);
    console.log(rows[0]);
  } else if (action === "list") {
    const { rows } = await client.query(`SELECT * FROM public.${safeTable} LIMIT 100`);
    console.table(rows);
  } else if (action === "info") {
    const { rows } = await client.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [safeTable]
    );
    console.table(rows);
  } else {
    console.error("Action must be one of: list, count, info");
    process.exit(1);
  }
} catch (error) {
  console.error("Query failed:", error.message || error);
  process.exit(1);
} finally {
  await client.end();
}
