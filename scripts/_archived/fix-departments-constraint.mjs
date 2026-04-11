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
    console.log("🔍 Checking current departments constraints...");
    
    const constraints = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'public.departments'::regclass 
      AND contype IN ('p', 'u', 'x')
    `);
    
    console.log("Current constraints:");
    constraints.rows.forEach(row => console.log(`  ${row.conname}: ${row.definition}`));
    
    // Create unique index on lower(trim(name))
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS departments_name_unique 
      ON public.departments (lower(trim(name)))
    `);
    
    console.log("✅ Created unique constraint: departments_name_unique");
    
    // Verify
    const verify = await client.query("SELECT * FROM public.departments LIMIT 3");
    console.log(`\n📊 Sample departments (${verify.rowCount} total):`);
    verify.rows.forEach(row => console.log(`  ${row.name}`));
    
  } catch (error) {
    console.error("❌ Fix failed:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
