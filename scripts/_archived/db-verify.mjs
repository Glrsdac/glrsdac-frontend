import * as dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("❌ SUPABASE_DB_URL not set");
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function verify() {
  await client.connect();
  
  try {
    const members = await client.query("SELECT COUNT(*) as total, church_id, status FROM members GROUP BY church_id, status");
    console.log("📊 MEMBERS:");
    console.table(members.rows);
    
    const churches = await client.query("SELECT id, name FROM churches WHERE name ILIKE '%gloryland%'");
    console.log("\\n🏛️ CHURCHES:", churches.rows);
    
    const events = await client.query("SELECT COUNT(*) as total, MIN(event_date), MAX(event_date) FROM events WHERE description LIKE '%Gloryland%' OR church_id IN (SELECT id FROM churches WHERE name ILIKE '%gloryland%')");
    console.log("\\n📅 EVENTS:", events.rows);
    
    const sampleMembers = await client.query("SELECT first_name, last_name, phone, church_id FROM members LIMIT 5");
    console.log("\\n👥 Sample members:", sampleMembers.rows);
    
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.end();
  }
}

verify();

