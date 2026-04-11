import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    envVars[key.trim()] = value;
  }
});

const supabase = createClient(
  envVars.VITE_SUPABASE_URL,
  envVars.VITE_SUPABASE_ANON_KEY
);

async function checkForeignKeys() {
  console.log('🔗 DATABASE FOREIGN KEY RELATIONSHIPS\n');

  // Check key tables and their obvious FK relationships from migrations
  const tables = [
    'user_roles', 'members', 'department_dues', 'department_due_payments',
    'contributions', 'sabbath_school_lessons', 'sabbath_school_members',
    'choir_members', 'sabbath_sessions', 'roles', 'departments',
    'sabbath_school_materials', 'sabbath_school_library_items',
    'sabbath_school_material_comments'
  ];

  console.log('📊 KNOWN FOREIGN KEY RELATIONSHIPS (from migrations):\n');
  
  const fkMap = {
    'department_dues': [
      { col: 'member_id', ref: 'members(id)' },
      { col: 'department_id', ref: 'departments(id)' }
    ],
    'department_due_payments': [
      { col: 'department_due_id', ref: 'department_dues(id)' },
      { col: 'recorded_by', ref: 'auth.users(id)' }
    ],
    'user_roles': [
      { col: 'user_id', ref: 'auth.users(id)' },
      { col: 'role_id', ref: 'roles(id)' },
      { col: 'church_id', ref: 'churches(id)' }
    ],
    'members': [
      { col: 'user_id', ref: 'auth.users(id)' },
      { col: 'church_id', ref: 'churches(id)' }
    ],
    'department_contributions': [
      { col: 'member_id', ref: 'members(id)' },
      { col: 'department_id', ref: 'departments(id)' },
      { col: 'church_id', ref: 'churches(id)' }
    ],
    'sabbath_school_members': [
      { col: 'member_id', ref: 'members(id)' }
    ],
    'sabbath_school_lessons': [
      { col: 'department_id', ref: 'departments(id)' }
    ],
    'sabbath_school_material_comments': [
      { col: 'material_id', ref: 'sabbath_school_materials(id)' },
      { col: 'member_id', ref: 'members(id)' }
    ],
    'choir_members': [
      { col: 'member_id', ref: 'members(id)' }
    ],
    'sabbath_sessions': [
      { col: 'sabbath_date', ref: 'sabbath_school_lessons(week_start)' }
    ]
  };

  Object.entries(fkMap).forEach(([table, fks]) => {
    console.log(`📊 ${table}`);
    fks.forEach(fk => {
      console.log(`  └─ ${fk.col} → ${fk.ref}`);
    });
    console.log();
  });

  console.log('\n✅ VERIFYING TABLE EXISTENCE:\n');
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .limit(0);
    
    if (!error) {
      console.log(`✓ ${table}`);
    } else {
      console.log(`✗ ${table} - Error: ${error.message}`);
    }
  }
}

checkForeignKeys().catch(err => console.error('Error:', err.message));
