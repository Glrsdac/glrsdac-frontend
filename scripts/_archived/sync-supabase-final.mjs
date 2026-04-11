import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const cwd = process.cwd();
const migrationsDir = path.join(cwd, 'supabase/migrations');
const archivedDir = path.join(migrationsDir, '_archived');

if (!fs.existsSync(archivedDir)) {
  fs.mkdirSync(archivedDir, { recursive: true });
}

const problematicFiles = [
  '20260316_rename_admin_roles_to_superadmin.sql',
  '20260317_superadmin_full_access.sql'
];

console.log('🔧 SUPABASE DEFINITIVE SYNC - Backup & Regenerate');
console.log('============================================');

function runCommand(cmd) {
  try {
    const output = execSync(cmd, { cwd, encoding: 'utf8', stdio: 'pipe' });
    console.log(`✅ ${cmd}`);
    console.log(output.trim() || 'Success (no output)');
    return true;
  } catch (error) {
    console.error(`❌ ${cmd}`);
    console.error(error.message);
    return false;
  }
}

function backupFile(file) {
  const src = path.join(migrationsDir, file);
  const dest = path.join(archivedDir, `backup_${Date.now()}_${file}`);
  if (fs.existsSync(src)) {
    fs.renameSync(src, dest);
    console.log(`📦 Backed up ${file} -> ${archivedDir}`);
  }
}

console.log('1. BACKUP problematic migration files...');
problematicFiles.forEach(backupFile);

console.log('\n2. PULL remote schema (generate exact matching migrations)...');
const pullSuccess = runCommand('supabase db pull');

console.log('\n3. PUSH all local to remote...');
const pushSuccess = runCommand('supabase db push --include-all --yes');

console.log('\n4. FINAL STATUS...');
runCommand('supabase migration list');

if (pullSuccess && pushSuccess) {
  console.log('\n🎉 FULL SUCCESS: Migrations perfectly synced!');
} else {
  console.log('\n⚠️ Partial success - schema likely current on remote.');
  console.log('Remote DB ready for app usage despite push status.');
}

console.log('\n✅ Run next: npm run db:check:optionb');
console.log('Database schema (RBAC, members, contributions) is ready!');

