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

if (!fs.existsSync(jsonPath)) {
  console.error(`❌ Data file not found: ${jsonPath}`);
  process.exit(1);
}

const rawJson = fs.readFileSync(jsonPath, "utf8").replace(/^\uFEFF/, "");
const rawRows = JSON.parse(rawJson);

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  
  try {
    console.log("🧹 Clearing old Gloryland events...");
    await client.query("DELETE FROM events WHERE description ILIKE '%gloryland%' OR name ILIKE '%gloryland plan%'");
    
    let count = 0;
    for (const row of rawRows) {
      const month = row.month.toUpperCase();
      const monthNum = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'].indexOf(month) + 1;
      if (monthNum === 0) continue;
      
      const day = row.day || '';
      const program = row.program || row.afternoon_program || row.sabbath_school || 'Church Program';
      const department = row.department || null;
      const lead = row.lead || null;
      const descParts = [];
      if (department) descParts.push(`Department: ${department}`);
      if (lead) descParts.push(`Lead: ${lead}`);
      if (row.sabbath_school) descParts.push(`SS: ${row.sabbath_school}`);
      if (row.afternoon_program) descParts.push(`Afternoon: ${row.afternoon_program}`);
      const description = descParts.join(' | ') || 'Gloryland 2026 Church Plan Event';
      
      const event_date = `2026-${monthNum.toString().padStart(2, '0')}-01`;
      
      // Get department_id if exists
      let deptId = null;
      if (department) {
        const deptRes = await client.query("SELECT id FROM departments WHERE lower(trim(name)) = lower(trim($1)) LIMIT 1", [department]);
        deptId = deptRes.rows[0]?.id;
      }
      
      await client.query(
        "INSERT INTO events (name, description, event_date, department_id) VALUES ($1, $2, $3, $4)",
        [program, description, event_date, deptId]
      );
      
      count++;
      console.log(`${count}. ${program} (${month} - ${department || 'N/A'})`);
    }
    
    const total = await client.query("SELECT COUNT(*) as total FROM events WHERE description ILIKE '%gloryland%'");
    console.log(`\n✅ Successfully imported ${count} Gloryland Plan events!`);
    console.log(`Total Gloryland events in DB: ${total.rows[0].total}`);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.end();
  }
}

main();
