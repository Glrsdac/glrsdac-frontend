// diagnose-and-fix-admin-uuid.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const email = 'admin@glrsdac.com';
  const { data: user, error } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user:', error);
    return;
  }

  if (!user) {
    console.error('User not found:', email);
    return;
  }

  // Check if UUID is valid
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(user.id)) {
    console.log('Invalid UUID detected:', user.id);
    // Generate new UUID
    const { data: newUuidData, error: uuidError } = await supabase.rpc('gen_random_uuid');
    if (uuidError) {
      console.error('Error generating new UUID:', uuidError);
      return;
    }
    const newUuid = newUuidData;
    // Update user record
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ id: newUuid })
      .eq('email', email);
    if (updateError) {
      console.error('Error updating UUID:', updateError);
      return;
    }
    console.log('UUID repaired for', email, 'New UUID:', newUuid);
  } else {
    console.log('UUID is valid for', email);
  }
}

main();
