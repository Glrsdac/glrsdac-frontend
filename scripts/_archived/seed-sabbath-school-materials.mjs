artbimport { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://upqwgwemuaqhnxskxbfr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwcXdnd2VtdWFxaG54c2t4YmZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2Nzg4MTksImV4cCI6MjA4NzI1NDgxOX0.zTphCl9xqoEe2N55uYyeVczn09nO5BsdEcmLPZLYbUs';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function seed() {
  console.log('Seeding Sabbath School materials...');

  const samples = [
    {
      title: 'Lesson 1: Unity in Christ',
      content: 'Sample content for week 1. Study Philippians 1.',
      week_start: '2024-10-05',
      week_end: '2024-10-11',
      language: 'en',
      age_group: 'adult',
      is_children: false,
      is_published: true,
    },
    {
      title: 'Lesson 2: Heaven and Earth',
      content: 'Sample content for week 2. Colossian themes.',
      week_start: '2024-10-12',
      week_end: '2024-10-18',
      language: 'en',
      age_group: 'adult',
      is_children: false,
      is_published: true,
    },
    {
      title: 'Lesson 3: The Church as Body',
      content: 'Week 3 sample lesson.',
      week_start: '2024-10-19',
      week_end: '2024-10-25',
      language: 'en',
      age_group: 'adult',
      is_children: false,
      is_published: true,
    },
    {
      title: 'Children Lesson: God\\'s Love',
      content: 'Children\\'s lesson sample.',
      week_start: '2024-10-05',
      week_end: '2024-10-11',
      language: 'en',
      age_group: 'children',
      is_children: true,
      is_published: true,
    },
    {
      title: 'Lesson 4: Reconciliation',
      content: 'Final sample.',
      week_start: '2024-10-26',
      week_end: '2024-11-01',
      language: 'en',
      age_group: 'adult',
      is_children: false,
      is_published: true,
    },
  ];

  // Clear existing
  const { error: deleteError } = await supabase
    .from('sabbath_school_materials')
    .delete()
    .eq('is_published', true);

  if (deleteError) console.error('Clear error:', deleteError);

  // Insert
  const { data, error } = await supabase
    .from('sabbath_school_materials')
    .insert(samples)
    .select();

  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log(`Inserted ${data.length} lessons.`);
  }

  console.log('Done.');
}

seed();

