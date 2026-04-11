import * as dotenv from 'dotenv';

dotenv.config();

const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL;

if (!VITE_SUPABASE_URL) {
  console.error('❌ Missing VITE_SUPABASE_URL');
  process.exit(1);
}

const EDGE_FUNCTION_URL = `${VITE_SUPABASE_URL}/functions/v1/request-signup`;

async function testWithLogging() {
  console.log('🔍 DEBUGGING EDGE FUNCTION\n');
  console.log('=' .repeat(70) + '\n');

  // Test different name formats
  const testNames = [
    { email: 'test1@example.com', full_name: 'John Doe' },
    { email: 'test2@example.com', full_name: 'jane smith' },
    { email: 'test3@example.com', full_name: 'GRACE DAVIS' },
    { email: 'test4@example.com', full_name: 'Mary' },  // First name only
  ];

  for (const test of testNames) {
    console.log(`📧 Testing: "${test.full_name}"\n`);

    try {
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(test),
      });

      const data = await response.json();
      console.log(`Status: ${response.status}`);
      console.log(`Message: ${data.error || data.message}\n`);
    } catch (err) {
      console.error('Error:', err.message);
      console.log('');
    }
  }

  console.log('=' .repeat(70));
  console.log('\nNote: If all return 403, the member lookup is failing.');
  console.log('This suggests an issue with the filter logic in the edge function.\n');
}

testWithLogging();
