import * as dotenv from 'dotenv';

dotenv.config();

const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL;

if (!VITE_SUPABASE_URL) {
  console.error('❌ Missing VITE_SUPABASE_URL');
  process.exit(1);
}

const EDGE_FUNCTION_URL = `${VITE_SUPABASE_URL}/functions/v1/request-signup`;

async function testEdgeFunction() {
  console.log('🚀 TESTING EDGE FUNCTION: request-signup\n');
  console.log('=' .repeat(70) + '\n');

  // Test Case 1: Valid request with existing member
  console.log('📝 Test Case 1: Valid signup request with existing member (John Doe)\n');
  try {
    const response1 = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'john.doe.signup@glrsdac.com',
        full_name: 'John Doe',
      }),
    });

    const data1 = await response1.json();
    console.log(`Status: ${response1.status}`);
    console.log(`Response:`, JSON.stringify(data1, null, 2));
    console.log('');
  } catch (err) {
    console.error('Error:', err.message);
    console.log('');
  }

  // Test Case 2: Invalid request (missing email)
  console.log('📝 Test Case 2: Invalid request (missing email)\n');
  try {
    const response2 = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        full_name: 'Jane Smith',
      }),
    });

    const data2 = await response2.json();
    console.log(`Status: ${response2.status}`);
    console.log(`Response:`, JSON.stringify(data2, null, 2));
    console.log('');
  } catch (err) {
    console.error('Error:', err.message);
    console.log('');
  }

  // Test Case 3: Non-member request
  console.log('📝 Test Case 3: Non-member request\n');
  try {
    const response3 = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'unknown@example.com',
        full_name: 'Unknown Person',
      }),
    });

    const data3 = await response3.json();
    console.log(`Status: ${response3.status}`);
    console.log(`Response:`, JSON.stringify(data3, null, 2));
    console.log('');
  } catch (err) {
    console.error('Error:', err.message);
    console.log('');
  }

  // Test Case 4: Existing user (already has account)
  console.log('📝 Test Case 4: Duplicate account request\n');
  try {
    const response4 = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@glrsdac.com',
        full_name: 'Admin User',
      }),
    });

    const data4 = await response4.json();
    console.log(`Status: ${response4.status}`);
    console.log(`Response:`, JSON.stringify(data4, null, 2));
    console.log('');
  } catch (err) {
    console.error('Error:', err.message);
    console.log('');
  }

  // Test Case 5: CORS check
  console.log('📝 Test Case 5: CORS preflight\n');
  try {
    const response5 = await fetch(EDGE_FUNCTION_URL, {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });

    console.log(`Status: ${response5.status}`);
    console.log(`CORS Headers:`);
    console.log(`  Access-Control-Allow-Origin: ${response5.headers.get('Access-Control-Allow-Origin')}`);
    console.log(`  Access-Control-Allow-Headers: ${response5.headers.get('Access-Control-Allow-Headers')}`);
    console.log('');
  } catch (err) {
    console.error('Error:', err.message);
    console.log('');
  }

  console.log('=' .repeat(70));
  console.log('\n✅ Edge function tests completed!\n');
  console.log(`📍 Function URL: ${EDGE_FUNCTION_URL}\n`);
  console.log('📝 Integration Notes:\n');
  console.log('  1. The function validates member names against members table');
  console.log('  2. Returns 403 if member not found');
  console.log('  3. Returns 409 if account already exists');
  console.log('  4. Returns 200 with status "pending" on success');
  console.log('  5. CORS headers allow cross-origin requests\n');
}

testEdgeFunction();
