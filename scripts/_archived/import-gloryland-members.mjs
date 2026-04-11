import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";
import pg from "pg";
import { parse } from "csv-parse/sync";

dotenv.config();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("❌ SUPABASE_DB_URL not set");
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const csvPath = path.resolve(__dirname, "../Gloryland Data Report.csv");

if (!fs.existsSync(csvPath)) {
  console.error(`❌ CSV file not found: ${csvPath}`);
  process.exit(1);
}

const csvRaw = fs.readFileSync(csvPath, "utf8");
const records = parse(csvRaw, {
  columns: true,
  skip_empty_lines: true,
});

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function upsertChurch(churchName, location) {
  if (!churchName) return null;
  const sql = `INSERT INTO churches (name) VALUES ($1)
    ON CONFLICT ((lower(btrim(name)))) DO NOTHING RETURNING id`;
  const result = await client.query(sql, [churchName.trim()]);
  if (result.rows[0]) return result.rows[0].id;
  // If not inserted, fetch existing
  const fetch = await client.query(`SELECT id FROM churches WHERE lower(btrim(name)) = lower(btrim($1))`, [churchName.trim()]);
  return fetch.rows[0]?.id || null;
}

async function upsertDepartment(deptName, churchId) {
  if (!deptName || !churchId) return null;
  const sql = `INSERT INTO departments (name, church_id) VALUES ($1, $2)
    ON CONFLICT ((lower(btrim(name)), church_id)) DO NOTHING RETURNING id`;
  const result = await client.query(sql, [deptName.trim(), churchId]);
  if (result.rows[0]) return result.rows[0].id;
  // If not inserted, fetch existing
  const fetch = await client.query(`SELECT id FROM departments WHERE lower(btrim(name)) = lower(btrim($1)) AND church_id = $2`, [deptName.trim(), churchId]);
  return fetch.rows[0]?.id || null;
}

async function upsertMember(row, churchId, departmentId) {
  // Error handling for empty columns
  const firstName = row["Name"]?.trim() || "Unknown";
  const lastName = row["Last Name"]?.trim() || "Unknown";
  const phone = row["Cellular"]?.trim() || row["Work Phone"]?.trim() || "";
  const email = row["Email"]?.trim() || "";
  const status = row["Status"]?.trim() || "active";
  const createdAt = row["created_at"] || new Date();
  const sql = `INSERT INTO members (
    first_name, last_name, phone, email, status, church_id, created_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7)
  ON CONFLICT ON (lower(trim(first_name)), lower(trim(last_name)), church_id) DO UPDATE SET phone = EXCLUDED.phone, email = EXCLUDED.email, status = EXCLUDED.status RETURNING id`;
  const result = await client.query(sql, [
    firstName,
    lastName,
    phone,
    email,
    status,
    churchId,
    createdAt,
  ]);
  return result.rows[0]?.id || null;
}

async function main() {
  await client.connect();
  await client.query("BEGIN");
  try {
    let imported = 0;
    for (const row of records) {
      const churchName = row["Church"];
      const churchLocation = row["City"] || row["location"] || null;
      const deptName = row["Person type"] || null;
      const department = row["Department"] || deptName;

      const churchId = await upsertChurch(churchName, churchLocation);
      const departmentId = department ? await upsertDepartment(department, churchId) : null;
      const memberId = await upsertMember(row, churchId, departmentId);
      if (memberId) imported++;
    }
    await client.query("COMMIT");
    console.log(`✅ Imported ${imported} members from CSV.`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Import failed:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
