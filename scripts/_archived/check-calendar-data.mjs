import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.split('VITE_SUPABASE_URL="')[1]?.split('"')[0];
const supabaseKey = env.split('VITE_SUPABASE_ANON_KEY="')[1]?.split('"')[0];

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('Checking calendar and announcements data...\n');

  // Check events
  const { data: events, error: eventsError, count: eventsCount } = await supabase
    .from('events')
    .select('id, name, title, start_date, is_published', { count: 'exact' })
    .limit(5);

  if (eventsError) {
    console.log('❌ Events query error:', eventsError.message);
  } else {
    console.log(`✅ Events table accessible - Found ${eventsCount} total records`);
    console.log(`   Sample events (showing up to 5):`);
    events?.forEach((e, i) => {
      console.log(`   ${i + 1}. "${e.name || e.title}" - Published: ${e.is_published}, Date: ${e.start_date}`);
    });
  }

  console.log();

  // Check announcements
  const { data: announcements, error: announcementsError, count: announcementsCount } = await supabase
    .from('announcements')
    .select('id, title, message, published_at', { count: 'exact' })
    .limit(5);

  if (announcementsError) {
    console.log('❌ Announcements query error:', announcementsError.message);
  } else {
    console.log(`✅ Announcements table accessible - Found ${announcementsCount} total records`);
    console.log(`   Sample announcements (showing up to 5):`);
    announcements?.forEach((a, i) => {
      console.log(`   ${i + 1}. "${a.title}" - Published: ${a.published_at}`);
    });
  }

  console.log();

  // Check departments (used by both)
  const { data: departments, error: departmentsError, count: departmentsCount } = await supabase
    .from('departments')
    .select('id, name', { count: 'exact' })
    .eq('is_active', true);

  if (departmentsError) {
    console.log('❌ Departments query error:', departmentsError.message);
  } else {
    console.log(`✅ Departments table accessible - Found ${departmentsCount} active records`);
    console.log(`   Sample departments (showing up to 5):`);
    departments?.slice(0, 5).forEach((d, i) => {
      console.log(`   ${i + 1}. ${d.name}`);
    });
  }
}

checkData().catch(console.error);
