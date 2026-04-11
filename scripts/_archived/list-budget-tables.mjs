import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const client = new pg.Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
const { rows } = await client.query(
  "select table_name from information_schema.tables where table_schema='public' and table_name ilike '%budget%' order by table_name"
);
console.table(rows);
await client.end();
