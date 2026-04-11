#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

const functionsDir = path.join(process.cwd(), 'supabase', 'functions');

if (!fs.existsSync(functionsDir)) {
  console.error('❌ supabase/functions directory not found');
  process.exit(1);
}

const functions = fs.readdirSync(functionsDir).filter(f => {
  return fs.statSync(path.join(functionsDir, f)).isDirectory();
});

if (functions.length === 0) {
  console.log('⚠️  No functions to deploy');
  process.exit(0);
}

console.log(`📦 Deploying ${functions.length} edge function(s)...\n`);

functions.forEach(func => {
  console.log(`📤 Deploying: ${func}`);
  
  const process = spawn('supabase', ['functions', 'deploy', func], {
    stdio: 'inherit',
    shell: true
  });

  process.on('error', (err) => {
    console.error(`❌ Error deploying ${func}:`, err);
  });

  process.on('close', (code) => {
    if (code === 0) {
      console.log(`✅ ${func} deployed successfully\n`);
    } else {
      console.error(`❌ ${func} deployment failed with code ${code}\n`);
    }
  });
});

console.log('✅ Edge function deployment complete!');
