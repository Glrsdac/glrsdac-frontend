import * as dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const dbUrl = process.env.SUPABASE_DB_URL;
console.log('DB URL set:', !!dbUrl);

if (!dbUrl) process.exit(1);

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  
  try {
    // 1. Events table structure
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'events'
      ORDER BY ordinal_position
    `);
    
    console.log('EVENTS TABLE COLUMNS:');
    columns.rows.forEach(row => {
      console.log(`  ${row.column_name.padEnd(25)} | ${row.data_type.padEnd(15)} | nullable: ${row.is_nullable}`);
    });
    
    // 2. Sample data count
    const count = await client.query('SELECT COUNT(*) as total FROM events');
    console.log(`\nTotal events: ${count.rows[0].total}`);
    
    // 3. Departments count
    const deptCount = await client.query('SELECT COUNT(*) as total FROM departments');
    console.log(`Total departments: ${deptCount.rows[0].total}`);
    
    // 4. Test minimal INSERT
    try {
      await client.query("INSERT INTO events (event_date) VALUES (NOW()) RETURNING id");
      console.log('\n✅ Minimal INSERT to events succeeded');
      await client.query('DELETE FROM events WHERE event_date >= NOW() - INTERVAL \'1 minute\'');
    } catch (e) {
      console.log('\n❌ Minimal INSERT failed:', e.message);
    }
    
    // 5. Check if events table exists
    const tableCheck = await client.query("SELECT to_regclass('public.events') as table_oid");
    console.log('Events table exists:', tableCheck.rows[0].table_oid !== null);
    
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.end();
  }
}

main();
