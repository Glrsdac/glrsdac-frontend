import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const DB_URL = process.env.SUPABASE_DB_URL;

if (!VITE_SUPABASE_URL || !SUPABASE_ANON_KEY || !DB_URL) {
  console.error('❌ Missing credentials');
  process.exit(1);
}

const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_ANON_KEY);
const dbClient = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

async function testInviteFunctionsWithNewMember() {
  console.log('📧 TESTING INVITE FUNCTIONS (With New Member)\n');
  console.log('=' .repeat(70) + '\n');

  try {
    await dbClient.connect();

    // Create a new member
    console.log('📝 Step 1: Creating a new member\n');

    const uniqueEmail = `test.invite.${Date.now()}@example.com`;
    const memberResult = await dbClient.query(
      `INSERT INTO public.members (first_name, last_name, email)
       VALUES ($1, $2, $3)
       RETURNING id, first_name, last_name, email`,
      ['Test', 'Invite', uniqueEmail]
    );

    const member = memberResult.rows[0];
    console.log(`✅ Created member: ${member.first_name} ${member.last_name}`);
    console.log(`   ID: ${member.id}`);
    console.log(`   Email: ${uniqueEmail}\n`);

    // Log in as clerk
    console.log('📝 Step 2: Clerk logging in\n');

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'clerk@glrsdac.com',
      password: 'Clerk@123',
    });

    if (signInError) {
      console.log(`❌ Clerk login failed: ${signInError.message}`);
      return;
    }

    const session = signInData.session;
    console.log(`✅ Clerk logged in: clerk@glrsdac.com\n`);

    // Test invite-member function
    console.log('📝 Step 3: Sending invite to new member\n');

    const response = await fetch(
      `${VITE_SUPABASE_URL}/functions/v1/invite-member`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          member_id: member.id,
          email: member.email,
        }),
      }
    );

    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    console.log('');

    if (!response.ok) {
      console.log('❌ Invite failed\n');
      await supabase.auth.signOut();
      return;
    }

    console.log('✅ Invite sent successfully\n');

    // Check if user was created
    console.log('📝 Step 4: Verifying user account was created\n');

    const { data: updatedMember } = await supabase
      .from('members')
      .select('user_id')
      .eq('id', member.id)
      .single();

    if (updatedMember.user_id) {
      console.log(`✅ User account created with ID: ${updatedMember.user_id}\n`);

      // Test resend-invite
      console.log('📝 Step 5: Testing resend-invite\n');

      const resendResponse = await fetch(
        `${VITE_SUPABASE_URL}/functions/v1/resend-invite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            member_id: member.id,
          }),
        }
      );

      const resendData = await resendResponse.json();
      console.log(`Status: ${resendResponse.status}`);
      console.log(`Response:`, JSON.stringify(resendData, null, 2));
      console.log('');

      if (resendResponse.ok) {
        console.log('✅ Resend invite successful\n');
      }
    } else {
      console.log('❌ User account not linked to member\n');
    }

    // Test permission check - try as viewer
    console.log('📝 Step 6: Testing permission check (Viewer should fail)\n');

    await supabase.auth.signOut();

    const { data: viewerSignIn } = await supabase.auth.signInWithPassword({
      email: 'viewer1@glrsdac.com',
      password: 'Viewer1@2026',
    });

    if (viewerSignIn.session) {
      const deniedResponse = await fetch(
        `${VITE_SUPABASE_URL}/functions/v1/invite-member`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${viewerSignIn.session.access_token}`,
          },
          body: JSON.stringify({
            member_id: member.id,
            email: member.email,
          }),
        }
      );

      const deniedData = await deniedResponse.json();
      console.log(`Status: ${deniedResponse.status}`);
      console.log(`Response:`, deniedData.error);

      if (deniedResponse.status === 403) {
        console.log('✅ Permission check working correctly (403 Forbidden)\n');
      }

      await supabase.auth.signOut();
    }

    console.log('=' .repeat(70));
    console.log('\n✅ All tests completed!\n');

    // Clean up - delete the test member
    console.log('📝 Cleanup: Deleting test member\n');
    await dbClient.query('DELETE FROM public.members WHERE id = $1', [member.id]);
    console.log('✅ Cleanup complete\n');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await dbClient.end();
  }
}

testInviteFunctionsWithNewMember();
