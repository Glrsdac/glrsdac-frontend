import * as dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("❌ SUPABASE_DB_URL not set");
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  
  try {
    console.log("🔍 Verifying Gloryland Plan import...");
    
    const glorylandEvents = await client.query(
      "SELECT COUNT(*) as total FROM events WHERE description ILIKE '%gloryland%' OR name ILIKE '%gloryland%'"
    );
    
    const recentEvents = await client.query(
      "SELECT name, description, event_date, department_id FROM events WHERE event_date LIKE '2026%' LIMIT 5"
    );
    
    const departments = await client.query(
      "SELECT COUNT(*) as total FROM departments WHERE description LIKE '%Gloryland%'"
    );
    
    const sampleDepts = await client.query(
      "SELECT name FROM departments WHERE description LIKE '%Gloryland%' OR description LIKE '%Plan%' LIMIT 10"
    );
    
    console.log(`📊 Gloryland events: ${glorylandEvents.rows[0].total}`);
    console.log(`📊 2026 events: ${recentEvents.rowCount}`);
    console.log(`📊 Plan departments: ${departments.rows[0].total}`);
    
    console.log("\n📋 Sample 2026 Events:");
    recentEvents.rows.forEach((row, i) => {
      console.log(`  ${i+1}. ${row.name}`);
      console.log(`     Date: ${row.event_date}, Dept: ${row.department_id ? 'Yes' : 'No'}`);
    });
    
    console.log("\n📋 Sample Departments:");
    sampleDepts.rows.forEach(row => console.log(`  - ${row.name}`));
    
    if (glorylandEvents.rows[0].total > 0 || recentEvents.rowCount > 0) {
      console.log("\n🎉 Gloryland Plan data present in events table!");
    } else {
      console.log("\n⚠️ No Gloryland plan events found");
    }
    
  } catch (error) {
    console.error("❌ Verification error:", error.message);
  } finally {
    await client.end();
  }
}

main();
