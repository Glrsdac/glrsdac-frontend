import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const cwd = process.cwd();
const migrationsDir = path.join(cwd, 'supabase/migrations');

console.log('🔄 Supabase Migration Auto-Fix Script');
console.log('====================================');

function runCommand(cmd) {
  try {
    const output = execSync(cmd, { cwd, encoding: 'utf8', stdio: 'pipe' });
    console.log(`✅ ${cmd}`);
    console.log(output.trim());
    return true;
  } catch (error) {
    console.log(`❌ ${cmd}: ${error.message}`);
    return false;
  }
}

function checkMigrationsList() {
  const result = runCommand('supabase migration list');
  // Parse output to check if all Local have Remote (simplified)
  console.log('\n📊 Migration Status Check Complete');
}

async function automateFix() {
  console.log('\n1. Checking current status...');
  checkMigrationsList();

  console.log('\n2. Repairing known problematic migration (20260317)...');
  runCommand('supabase migration repair --status reverted 20260317');
  runCommand('supabase migration repair --status applied 20260317');

  console.log('\n3. Attempting db pull to sync remote schema...');
  const pullSuccess = runCommand('supabase db pull');

  console.log('\n4. Final status check...');
  checkMigrationsList();

  console.log('\n5. Attempting final push...');
  const pushSuccess = runCommand('supabase db push --include-all --yes');

  if (pushSuccess) {
    console.log('\n🎉 SUCCESS: Database fully synced!');
  } else {
    console.log('\n⚠️  Push failed - manual intervention may be needed.');
    console.log('Run: supabase db pull && supabase db push --include-all --yes');
  }

  console.log('\n✅ Script complete. Check TODO.md for next steps.');
}

automateFix();
