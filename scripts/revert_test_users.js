require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function revertUsers() {
  console.log("Reverting test users to original jurisdiction...");

  const updates = [
    { email: 'state@bhushetu.in', state_code: 'MH', district_code: null },
    { email: 'district@bhushetu.in', state_code: 'MH', district_code: 'PN' },
    { email: 'field@bhushetu.in', state_code: 'MH', district_code: 'PN' },
    { email: 'manager@bhushetu.in', state_code: null, district_code: null },
    { email: 'ministry@bhushetu.in', state_code: null, district_code: null },
    { email: 'viewer1@bhushetu.in', state_code: null, district_code: null },
    { email: 'viewer2@bhushetu.in', state_code: null, district_code: null },
  ];

  for (const user of updates) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ state_code: user.state_code, district_code: user.district_code })
      .eq('email', user.email);

    if (error) {
      console.error(`Error updating ${user.email}:`, error);
    } else {
      console.log(`Reverted ${user.email}`);
    }
  }

  // Double check
  const { data: users } = await supabase
    .from('user_profiles')
    .select('email, role, state_code, district_code');
  console.table(users);
}

revertUsers();
