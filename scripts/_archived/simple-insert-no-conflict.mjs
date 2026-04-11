import * as dotenv from "dotenv";
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
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

const csvRaw = fs.readFileSync(csvPath, "utf8");
const records = parse(csvRaw, { columns: true, skip_empty_lines: true });

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  
  try {
    // Clear table for clean import
    await client.query("DELETE FROM members");
    console.log("🧹 Cleared members table");
    
    let count = 0;
    for (const row of records) {
      const churchName = row["Church"]?.trim();
      if (!churchName) continue;
      
      // Simple get/create church
      let churchRes = await client.query("SELECT id FROM churches WHERE lower(trim(name)) = lower($1)", [churchName]);
      let churchId = churchRes.rows[0]?.id;
      if (!churchId) {
        const insertChurch = await client.query("INSERT INTO churches (name) VALUES ($1) RETURNING id", [churchName]);
        churchId = insertChurch.rows[0].id;
      }
      
      const firstName = row["Name"]?.trim() || "Unknown";
      const lastName = row["Last Name"]?.trim() || "Unknown";
      const phone = row["Cellular"]?.trim() || row["Work Phone"]?.trim() || null;
      const email = row["Email"]?.trim() || null;
      
      await client.query(`
        INSERT INTO members (first_name, last_name, phone, email, status, church_id)
        VALUES ($1, $2, $3, $4, 'active', $5)
      `, [firstName, lastName, phone, email, churchId]);
      
      count++;
      console.log(`Added ${count}: ${firstName} ${lastName} (${churchName})`);
    }
    
    const total = await client.query("SELECT COUNT(*) as total FROM members");
    console.log(`✅ Successfully imported ${count} Gloryland members! Total in DB: ${total.rows[0].total}`);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.end();
  }
}

main();

