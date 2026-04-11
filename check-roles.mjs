import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("Missing SUPABASE_DB_URL");
  process.exit(1);
}

const client = new pg.Client(dbUrl);

async function checkRoles() {
  try {
    await client.connect();

    const result = await client.query('SELECT name, category, scope_type FROM roles ORDER BY name');
    console.log('Available roles:');
    result.rows.forEach(r => {
      console.log(`- ${r.name} (${r.category}, ${r.scope_type})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkRoles();