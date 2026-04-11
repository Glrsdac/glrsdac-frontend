import * as dotenv from "dotenv";
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("❌ SUPABASE_DB_URL not set");
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.resolve(__dirname, "data", "gloryland_plan_2026_raw.json");

const rawJson = fs.readFileSync(dataPath, "utf8").replace(/^\uFEFF/, "");
const rawRows = JSON.parse(rawJson);

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  
  try {
    // Clear previous Gloryland events
    await client.query("DELETE FROM events WHERE title ILIKE '%gloryland%' OR description ILIKE '%gloryland%' OR description ILIKE '%plan%'");
    console.log("🧹 Cleared old Gloryland events");
    
    let count = 0;
    for (const row of rawRows) {
      const month = row.month.toUpperCase();
      const monthNum = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'].indexOf(month) + 1;
      if (monthNum === 0) continue;
      
      const title = row.program || row.afternoon_program || row.sabbath_school || row.department || 'Gloryland Plan Event';
      const department = row.department || null;
      
      const descParts = [];
      if (department) descParts.push(`Department: ${department}`);
      if (row.lead) descParts.push(`Lead: ${row.lead}`);
      if (row.sabbath_school) descParts.push(`Sabbath School: ${row.sabbath_school}`);
      if (row.afternoon_program) descParts.push(`Afternoon: ${row.afternoon_program}`);
      const description = descParts.join('; ') || 'From Gloryland SDA Church 2026 Plan';
      
      const start_date = new Date(`2026-${monthNum.toString().padStart(2,'0')}-01`).toISOString();
      
      // Link to department if exists (foreign key optional)
      const churchRes = await client.query("SELECT id FROM churches WHERE name ILIKE '%gloryland%' LIMIT 1");
      const church_id = churchRes.rows[0]?.id || null;
      
      await client.query(
        `INSERT INTO events (church_id, title, description, start_date) 
         VALUES ($1, $2, $3, $4)`,
        [church_id, title, description, start_date]
      );
      
      count++;
    }
    
    const total = await client.query("SELECT COUNT(*) as total FROM events WHERE description ILIKE '%gloryland%' OR title ILIKE '%gloryland%'");
    console.log(`\n✅ SUCCESS: Imported ${count} Gloryland Plan events to events table!`);
    console.log(`Total matching events: ${total.rows[0].total}`);
    
  } catch (error) {
    console.error("❌ Import failed:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
