const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generatePasswordForEmail(email) {
  // Extract the part before the @ symbol
  const namePart = email.split('@')[0];
  // Capitalize first letter
  const capitalized = namePart.charAt(0).toUpperCase() + namePart.slice(1);
  // Ensure it has at least one lowercase by appending one if needed, but 'namePart' usually has lowercase
  // Append a number and special character to meet complexity requirements:
  // - at least one capital letter
  // - at least one small letter
  // - at least one special character
  // - at least one number
  // - no spaces
  // - length >= 8, <= 25
  let password = `${capitalized}@2026!`;
  
  if (password.length < 8) {
      password = `${password}App`;
  }
  return password;
}

async function main() {
  console.log('Fetching users from Supabase...');
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  
  if (!users || users.length === 0) {
    console.log('No users found.');
    return;
  }

  console.log(`Found ${users.length} users. Resetting passwords...`);
  
  const credentials = [];
  
  for (const user of users) {
    const newPassword = generatePasswordForEmail(user.email);
    
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );
    
    if (updateError) {
      console.error(`Failed to update password for ${user.email}:`, updateError.message);
    } else {
      credentials.push({
        email: user.email,
        password: newPassword
      });
      console.log(`Updated password for ${user.email}`);
    }
  }
  
  // Write the credentials to a file for the user to view
  const outputPath = 'user_credentials.txt';
  const fileContent = credentials.map(c => `Email: ${c.email} | Password: ${c.password}`).join('\n');
  fs.writeFileSync(outputPath, fileContent);
  
  console.log(`\nAll done! Credentials have been saved to ${outputPath}`);
}

main();
