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
    console.log("\n🏛️ CHURCHES:", churches.rows);
    
    const eventsCount = await client.query("SELECT COUNT(*) as total FROM events WHERE church_id IN (SELECT id FROM churches WHERE name ILIKE '%gloryland%')");
    console.log("\n📅 EVENTS (Gloryland):", eventsCount.rows[0].total);
    
    const allEvents = await client.query("SELECT COUNT(*) as total FROM events");
    console.log("📅 ALL EVENTS:", allEvents.rows[0].total);
    
    const sampleMembers = await client.query("SELECT first_name, last_name, phone FROM members LIMIT 3");
    console.log("\n👥 Sample members:", sampleMembers.rows);
    
    console.log("\n✅ VERIFICATION COMPLETE");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.end();
  }
}

verify();

