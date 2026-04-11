import pg from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error('❌ SUPABASE_DB_URL not set');
  process.exit(1);
}

async function verifySchema() {
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Count tables
    const tableResult = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const tableCount = tableResult.rows[0]?.count || 0;
    console.log(`📊 Tables: ${tableCount}`);

    // List all tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log('   Tables created:');
    tables.rows.forEach(row => console.log(`     - ${row.table_name}`));

    // Count views
    const viewResult = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.views 
      WHERE table_schema = 'public'
    `);
    const viewCount = viewResult.rows[0]?.count || 0;
    console.log(`\n📊 Views: ${viewCount}`);

    // List all views
    const views = await client.query(`
      SELECT table_name FROM information_schema.views 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('   Views created:');
    views.rows.forEach(row => console.log(`     - ${row.table_name}`));

    // Count functions
    const funcResult = await client.query(`
      SELECT COUNT(*) as count FROM pg_proc 
      WHERE pronamespace = 'public'::regnamespace
    `);
    const funcCount = funcResult.rows[0]?.count || 0;
    console.log(`\n📊 Functions: ${funcCount}`);

    // List custom functions
    const funcs = await client.query(`
      SELECT proname FROM pg_proc 
      WHERE pronamespace = 'public'::regnamespace
      AND proname NOT LIKE 'pg_%'
      ORDER BY proname
    `);
    console.log('   Functions created:');
    funcs.rows.forEach(row => console.log(`     - ${row.proname}()`));

    // Count policies
    const policyResult = await client.query(`
      SELECT COUNT(*) as count FROM pg_policies 
      WHERE schemaname = 'public'
    `);
    const policyCount = policyResult.rows[0]?.count || 0;
    console.log(`\n📊 RLS Policies: ${policyCount}`);

    // Verify key tables exist
    const keyTables = [
      'profiles', 'user_roles', 'members', 'departments', 'funds',
      'contributions', 'sabbath_sessions', 'payments', 'cheques',
      'imprest_accounts', 'imprest_issues', 'fund_returns'
    ];

    const existingTables = tables.rows.map(r => r.table_name);
    const allExist = keyTables.every(kt => existingTables.includes(kt));

    console.log(`\n✅ All core tables present: ${allExist ? '✓ YES' : '✗ NO'}`);

    if (!allExist) {
      const missing = keyTables.filter(kt => !existingTables.includes(kt));
      console.log(`   Missing: ${missing.join(', ')}`);
    }

    console.log('\n✅ Schema verification complete!');
    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifySchema();
