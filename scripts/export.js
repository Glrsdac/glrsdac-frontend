import fs from "fs";
import path from "path";
import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("Missing SUPABASE_DB_URL");
  process.exit(1);
}

const [, , specificTable] = process.argv;

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();

  let tables = [];
  if (specificTable) {
    tables = [String(specificTable).replace(/[^a-zA-Z0-9_]/g, "")];
  } else {
    const { rows } = await client.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    );
    tables = rows.map((r) => r.table_name);
  }

  const payload = {};
  for (const table of tables) {
    const { rows } = await client.query(`SELECT * FROM public.${table}`);
    payload[table] = rows;
  }

  const exportDir = path.resolve(process.cwd(), "exports");
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = specificTable ? `${specificTable}-${stamp}.json` : `full-export-${stamp}.json`;
  const filePath = path.join(exportDir, fileName);

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Exported to ${filePath}`);
} catch (error) {
  console.error("Export failed:", error.message || error);
  process.exit(1);
} finally {
  await client.end();
}
