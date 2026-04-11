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
    const eventsCount = await client.query(
      "SELECT COUNT(*) as total FROM events WHERE source_document = $1 AND plan_year = 2026",
      ["Gloryland SDA Church Plan - 2026.odt"]
    );
    
    const departmentsCount = await client.query(
      "SELECT COUNT(*) as total FROM departments WHERE description LIKE $1",
      ["%Gloryland%"]
    );
    
    const sampleEvents = await client.query(
      "SELECT name, event_date, department_id, plan_month FROM events WHERE source_document = $1 AND plan_year = 2026 LIMIT 5",
      ["Gloryland SDA Church Plan - 2026.odt"]
    );
    
    const sampleDepts = await client.query(
      "SELECT name FROM departments WHERE description LIKE $1 LIMIT 5",
      ["%Gloryland%"]
    );
    
    console.log(`✅ Events imported: ${eventsCount.rows[0].total}`);
    console.log(`✅ Departments found: ${departmentsCount.rows[0].total}`);
    console.log("\n📋 Sample Events:");
    sampleEvents.rows.forEach(row => console.log(`  - ${row.name} (${row.event_date}, Month ${row.plan_month})`));
    console.log("\n📋 Sample Departments:");
    sampleDepts.rows.forEach(row => console.log(`  - ${row.name}`));
    
    if (eventsCount.rows[0].total > 0) {
      console.log("\n🎉 Gloryland Plan import successful!");
    } else {
      console.log("\n⚠️  No events found - import may have failed.");
    }
    
  } catch (error) {
    console.error("❌ Verification failed:", error.message);
  } finally {
    await client.end();
  }
}

main();
