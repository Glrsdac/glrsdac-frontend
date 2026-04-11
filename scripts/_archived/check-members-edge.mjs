import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!VITE_SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_ANON_KEY);

async function listMembers() {
  console.log('📋 All Members in Database:\n');

  const { data, error } = await supabase
    .from('members')
    .select('id, first_name, last_name, email, user_id')
    .order('first_name');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  data.forEach((member, idx) => {
    console.log(`${idx + 1}. ${member.first_name} ${member.last_name}`);
    console.log(`   ID: ${member.id}`);
    console.log(`   Email: ${member.email || 'N/A'}`);
    console.log(`   User ID: ${member.user_id || 'Not linked'}`);
    console.log('');
  });

  // Test edge function with actual member name
  console.log('\n' + '=' .repeat(70) + '\n');
  console.log('🚀 Testing edge function with actual member names:\n');

  const EDGE_FUNCTION_URL = `${VITE_SUPABASE_URL}/functions/v1/request-signup`;

  // Test with first member
  const testMember = data[0];
  const fullName = `${testMember.first_name} ${testMember.last_name}`;

  console.log(`📝 Test: Valid signup request with ${fullName}\n`);

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `${testMember.first_name.toLowerCase()}.signup@glrsdac.com`,
        full_name: fullName,
      }),
    });

    const result = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

listMembers();
