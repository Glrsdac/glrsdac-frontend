import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("Missing SUPABASE_DB_URL");
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const table = args.find((arg) => !arg.startsWith("--"));
const clearAllMode = process.argv[1] === "clear-all" || args.includes("--all");

if (clearAllMode) {
  if (!force) {
    console.error("Refusing to clear all tables without --force flag.");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();

    const { rows } = await client.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    );

    if (rows.length === 0) {
      console.log("No tables found in public schema.");
      process.exit(0);
    }

    for (const row of rows) {
      const tableName = String(row.table_name).replace(/[^a-zA-Z0-9_]/g, "");
      if (!tableName) continue;
      await client.query(`TRUNCATE TABLE public.${tableName} RESTART IDENTITY CASCADE`);
    }

    console.log(`Cleared ${rows.length} table(s) from public schema.`);
  } catch (error) {
    console.error("Clear-all failed:", error.message || error);
    process.exit(1);
  } finally {
    await client.end();
  }

  process.exit(0);
}

if (!table) {
  console.log("Usage: npm run db:clear -- <table> [--force]");
  process.exit(1);
}

const safeTable = String(table).replace(/[^a-zA-Z0-9_]/g, "");
if (!safeTable) {
  console.error("Invalid table name");
  process.exit(1);
}

if (!force) {
  console.error("Refusing to clear table without --force flag.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(`TRUNCATE TABLE public.${safeTable} RESTART IDENTITY CASCADE`);
  console.log(`Cleared table: ${safeTable}`);
} catch (error) {
  console.error("Clear failed:", error.message || error);
  process.exit(1);
} finally {
  await client.end();
}
