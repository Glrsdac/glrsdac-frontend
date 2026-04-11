import * as dotenv from "dotenv";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
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
const records = parse(csvRaw, { columns: true, skip_empty_lines: true });

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function ensureConstraint() {
  console.log("🔧 Ensuring members unique constraint...");
  await client.query(`
    DROP INDEX IF EXISTS uq_members_name_church;
    ALTER TABLE IF EXISTS public.members DROP CONSTRAINT IF EXISTS uq_members_name_church;
    CREATE UNIQUE INDEX uq_members_name_church 
    ON public.members (lower(trim(first_name)), lower(trim(last_name)), church_id) 
    WHERE church_id IS NOT NULL;
  `);
  console.log("✅ Constraint ensured");
  
  // Test it
  await client.query("SELECT 1 FROM members LIMIT 0"); // Just to check table
}

async function upsertChurch(churchName) {
  if (!churchName) return null;
  const result = await client.query(`
    INSERT INTO churches (name) VALUES ($1)
    ON CONFLICT (lower(trim(name))) DO NOTHING RETURNING id
  `, [churchName.trim()]);
  if (result.rows[0]) return result.rows[0].id;
  const fetch = await client.query(`
    SELECT id FROM churches WHERE lower(trim(name)) = lower(trim($1))
  `, [churchName.trim()]);
  return fetch.rows[0]?.id || null;
}

async function upsertMember(row, churchId) {
  const firstName = row["Name"]?.trim() || "Unknown";
  const lastName = row["Last Name"]?.trim() || "Unknown";
  const phone = row["Cellular"]?.trim() || row["Work Phone"]?.trim() || "";
  const email = row["Email"]?.trim() || "";
  const status = row["Status"]?.trim() || "active";
  const createdAt = new Date();
  
  // Use INSERT ... ON CONFLICT DO NOTHING first to avoid constraint error, then update if exists
  await client.query(`
    INSERT INTO members (first_name, last_name, phone, email, status, church_id, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (lower(trim(first_name)), lower(trim(last_name)), church_id) DO NOTHING
  `, [firstName, lastName, phone, email, status, churchId, createdAt]);
  
  // Update if exists
  await client.query(`
    UPDATE members SET 
    phone = $3, email = $4, status = $5
    WHERE lower(trim(first_name)) = lower(trim($1)) 
    AND lower(trim(last_name)) = lower(trim($2)) 
    AND church_id = $6
  `, [firstName, lastName, phone, email, status, churchId]);
  
  return true;
}

async function main() {
  await client.connect();
  
  try {
    await ensureConstraint();
    
    let imported = 0;
    for (const row of records) {
      const churchName = row["Church"];
      const churchId = await upsertChurch(churchName);
      if (!churchId) {
        console.log(`⚠️ Skipping row - no church for "${churchName}"`);
        continue;
      }
      
      const memberId = await upsertMember(row, churchId);
      if (memberId) imported++;
    }
    
    // Final count
    const count = await client.query("SELECT COUNT(*) as total FROM members");
    console.log(`✅ Process complete! Imported/Updated: ${imported} records. Total members: ${count.rows[0].total}`);
    
  } catch (error) {
    console.error("❌ Failed:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

