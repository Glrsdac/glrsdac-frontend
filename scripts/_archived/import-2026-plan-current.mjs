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

const rawJson = fs.readFileSync(jsonPath, "utf8").replace(/^\\uFEFF/, "");
const rawRows = JSON.parse(rawJson);

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

const MONTH_NAMES = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
const MONTH_MAP = {};
MONTH_NAMES.forEach((name, index) => MONTH_MAP[name] = index + 1);

async function main() {
  await client.connect();

  try {
    // Get Gloryland church ID if exists
    const churchRes = await client.query("SELECT id FROM churches WHERE name ILIKE '%gloryland%' OR name ILIKE '%glrsdac%' LIMIT 1");
    const churchId = churchRes.rows[0]?.id || null;

    // Clear previous Gloryland plan events (approximate)
    await client.query("DELETE FROM events WHERE description ILIKE '%Gloryland%' OR title ILIKE '%Gloryland%' OR description ILIKE '%2026%'");

    console.log(`Using church_id: ${churchId || 'NULL'}`);
    console.log('🧹 Cleared old events');

    let count = 0;
    for (const row of rawRows) {
      const month = row.month?.toUpperCase();
      if (!MONTH_MAP[month]) continue;

      const monthNum = MONTH_MAP[month];
      let dayNum = 1; // default
      if (row.day) {
        const dayMatch = row.day.match(/(\\d{1,2})/);
        if (dayMatch) dayNum = parseInt(dayMatch[1]);
      }

      const title = row.program || row.department || `${month} Church Program`;
      const description = [
        row.day || '',
        row.department || '',
        row.lead || ''
      ].filter(Boolean).join(' - ');

      const startDateStr = `2026-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')} 09:00:00+00`;

      const res = await client.query(`
        INSERT INTO events (church_id, title, description, start_date)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [churchId, title, description, startDateStr]);

      count++;
      console.log(`Added ${count}: ${title} (${month} ${row.day || dayNum})`);
    }

    const totalNew = await client.query("SELECT COUNT(*) as total FROM events WHERE description ILIKE '%Gloryland%' OR title ILIKE '%Gloryland%'");
    console.log(`\n✅ Successfully imported ${count} Gloryland 2026 Plan events!`);
    console.log(`Total matching events in DB: ${totalNew.rows[0].total} (was 64 total events before)`);

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.end();
  }
}

main();

