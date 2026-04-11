import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

console.log('🚀 Applying AccountSettings fixes...');

try {
  // 1. Run migration
  console.log('1. Running new migration...');
  execSync('supabase migration up', { stdio: 'inherit', cwd: process.cwd() });
  
  // 2. Restart db for schema cache
  console.log('2. Restarting Supabase DB...');
  execSync('supabase db restart', { stdio: 'inherit' });
  
  // 3. Test queries
  console.log('3. Testing queries...');
  execSync('bun run scripts/fix-accountsettings-schema.mjs', { stdio: 'inherit' });
  
  console.log('✅ All fixes applied successfully!');
  console.log('Next: Test AccountSettings page at /account-settings');
} catch (error) {
  console.error('❌ Fix failed:', error.message);
  process.exit(1);
}

