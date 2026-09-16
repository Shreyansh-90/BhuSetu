require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndFixUsers() {
  console.log("Fetching user profiles...");
  
  // 1. Check current users
  const { data: users, error } = await supabase
    .from('user_profiles')
    .select('email, role, state_code, district_code, id');
    
  if (error) {
    console.error("Error fetching users:", error);
    return;
  }
  
  console.table(users);

  // 2. We want to ensure district_officer has districtCode = 'GNR' and stateCode = 'GJ'
  // Also field_officer, state_officer, etc., for smooth testing.
  console.log("Updating users to GJ/GNR jurisdiction for testing...");
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({ state_code: 'GJ', district_code: 'GNR' })
    .not('role', 'eq', 'admin'); // Update everyone except admin maybe

  if (updateError) {
    console.error("Error updating users:", updateError);
  } else {
    console.log("Users jurisdiction successfully set to GJ and GNR!");
  }
}

checkAndFixUsers();
