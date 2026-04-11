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
const jsonPath = path.resolve(__dirname, "data/gloryland_plan_2026_raw.json");

const rawJson = fs.readFileSync(jsonPath, "utf8").replace(/^\uFEFF/, "");
const rawRows = JSON.parse(rawJson);

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  
  try {
    // Clear old events
    await client.query("DELETE FROM events WHERE description LIKE '%Gloryland%' OR name LIKE '%gloryland%'");
    console.log("🧹 Cleared old Gloryland events");
    
    let count = 0;
    for (const row of rawRows) {
      const month = row.month.toUpperCase();
      const monthNum = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'].indexOf(month) + 1;
      if (monthNum === 0) continue;
      
      const day = row.day || '';
      const program = row.program || row.afternoon_program || row.sabbath_school || 'Church Program';
      const department = row.department || '';
      const lead = row.lead || '';
      
      const churchRes = await client.query("SELECT id FROM churches WHERE name ILIKE '%gloryland%' LIMIT 1");
      const churchId = churchRes.rows[0]?.id;
      
      const eventRes = await client.query(`
        INSERT INTO events (name, description, event_date, church_id, department_name, lead_person)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [program, `${month} ${day} - ${department} - ${lead}`, `2026-${monthNum.toString().padStart(2,'0')}-01`, churchId, department, lead]);
      
      count++;
      console.log(`Added ${count}: ${program} (${department})`);
    }
    
    const total = await client.query("SELECT COUNT(*) as total FROM events WHERE description LIKE '%Gloryland%' OR name LIKE '%Gloryland%'");
    console.log(`✅ Successfully imported ${count} church plan events! Total matching: ${total.rows[0].total}`);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.end();
  }
}

main();

