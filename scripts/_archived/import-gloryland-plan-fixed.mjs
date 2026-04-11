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

if (!fs.existsSync(dataPath)) {
  console.error(`❌ Data file not found: ${dataPath}`);
  process.exit(1);
}

const rawJson = fs.readFileSync(dataPath, "utf8").replace(/^\uFEFF/, "");
const rawRows = JSON.parse(rawJson);

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  
  try {
    await client.query("BEGIN");
    
    // Upsert departments (using existing unique constraint)
    const departments = [...new Set(rawRows.map(row => row.department).filter(Boolean))];
    for (const deptName of departments) {
      await client.query(`
        INSERT INTO departments (name, description, is_active)
        VALUES ($1, $2, true)
        ON CONFLICT (lower(trim(name))) DO UPDATE SET is_active = true, updated_at = NOW()
      `, [deptName, `From Gloryland 2026 Plan`]);
    }
    
    // Clear old plan events
    await client.query(`
      DELETE FROM events 
      WHERE plan_year = 2026 OR description ILIKE '%gloryland%'
    `);
    
    let count = 0;
    for (const row of rawRows) {
      const month = row.month.toUpperCase();
      const monthNum = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'].indexOf(month) + 1;
      if (monthNum === 0) continue;
      
      const program = row.program || row.afternoon_program || row.sabbath_school || row.department || 'Church Program';
      const description = [row.department, row.lead, row.sabbath_school, row.afternoon_program].filter(Boolean).join(' | ');
      const dept = row.department || null;
      
      const eventDate = `2026-${monthNum.toString().padStart(2,'0')}-01`;
      
      await client.query(`
        INSERT INTO events (name, description, event_date, department_id)
        VALUES ($1, $2, $3, (SELECT id FROM departments WHERE lower(trim(name)) = lower(trim($4))))
      `, [program, description, eventDate, dept]);
      
      count++;
    }
    
    await client.query("COMMIT");
    
    const total = await client.query("SELECT COUNT(*) as total FROM events WHERE event_date LIKE '2026%'");
    console.log(`✅ Successfully imported ${count} Gloryland Plan events! Total 2026 events: ${total.rows[0].total}`);
    
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Import failed:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
