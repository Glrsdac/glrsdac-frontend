import * as dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("❌ SUPABASE_DB_URL not set");
  process.exit(1);
}

const client = new pg.Client({ 
  connectionString: dbUrl, 
  ssl: { rejectUnauthorized: false } 
});

async function verify() {
  await client.connect();
  try {
    // Check constraint exists
    const constraint = await client.query(`
      SELECT c.conname, pg_get_indexdef(c.conindid) as indexdef
      FROM pg_constraint c 
      JOIN pg_class t ON c.conrelid = t.oid 
      WHERE t.relname = 'members' AND c.conname LIKE '%name_church'
    `);
    console.log("Constraint:", constraint.rows);

    // Check members count
    const count = await client.query("SELECT COUNT(*) as total FROM members");
    console.log("Members count:", count.rows[0].total);

    // Check for dupes
    const dupes = await client.query(`
      SELECT lower(trim(first_name)) as fn, lower(trim(last_name)) as ln, church_id, COUNT(*) 
      FROM members WHERE church_id IS NOT NULL 
      GROUP BY lower(trim(first_name)), lower(trim(last_name)), church_id 
      HAVING COUNT(*) > 1
    `);
    console.log("Potential dupes groups:", dupes.rows);
    
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.end();
  }
}

verify();

