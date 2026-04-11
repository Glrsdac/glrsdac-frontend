import * as dotenv from "dotenv";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("❌ SUPABASE_DB_URL not set");
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationPath = path.resolve(__dirname, "../supabase/migrations/202611_fix_members_unique_constraint.sql");

if (!fs.existsSync(migrationPath)) {
  console.error(`❌ Migration file not found: ${migrationPath}`);
  process.exit(1);
}

const migrationSql = fs.readFileSync(migrationPath, "utf8");

const client = new pg.Client({ 
  connectionString: dbUrl, 
  ssl: { rejectUnauthorized: false } 
});

async function applyMigration() {
  await client.connect();
  try {
    console.log("Applying members unique constraint migration...");
    // Run without transaction since CONCURRENTLY can't be in txn
    await client.query(migrationSql);
    console.log("✅ Migration applied successfully");
    
    // Verify - fix ambiguous oid
    const check = await client.query(`
      SELECT c.conname, pg_get_indexdef(c.conindid) as indexdef
      FROM pg_constraint c 
      JOIN pg_class t ON c.conrelid = t.oid 
      WHERE t.relname = 'members' 
      AND c.contype = 'u' 
      AND c.conname LIKE '%name_church'
    `);
    console.log("✅ Constraint verification:", check.rows);
    
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();

