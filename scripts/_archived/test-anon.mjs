import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8');
const url = env.split('VITE_SUPABASE_URL="')[1]?.split('"')[0];
const anon = env.split('VITE_SUPABASE_ANON_KEY="')[1]?.split('"')[0];

if (!url || !anon) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url, anon);
const { data, error } = await supabase.from('funds').select('*').limit(5);

if (error) {
  console.error('Error reading funds:', error.message);
  process.exit(1);
}

console.log(`Success: Read ${data?.length ?? 0} funds using anon key`);
if (data?.length > 0) {
  console.log('First fund:', data[0]);
}
