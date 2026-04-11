import fs from "fs";
import { Client } from "pg";

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error("Usage: node scripts/apply-sql.mjs <sql-file>");
  process.exit(1);
}

const env = fs.readFileSync(".env", "utf8");
const urlLine = env.split("SUPABASE_DB_URL=\"")[1];
const url = urlLine ? urlLine.split("\"")[0] : "";

if (!url) {
  console.error("Missing SUPABASE_DB_URL in .env");
  process.exit(1);
}

const sql = fs.readFileSync(sqlFile, "utf8");

const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  await client.query("BEGIN");
  await client.query(sql);
  await client.query("COMMIT");
  console.log(`Applied SQL: ${sqlFile}`);
} catch (err) {
  await client.query("ROLLBACK");
  console.error("SQL apply failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
