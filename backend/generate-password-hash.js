#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔐 Dhanno Password Hash Generator');
console.log('This will generate a bcrypt hash for your new password.\n');

rl.question('Enter your new password: ', (password) => {
  if (password.length < 6) {
    console.log('❌ Error: Password must be at least 6 characters long');
    rl.close();
    return;
  }

  // Generate hash with same salt rounds as the application (10)
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  console.log('\n✅ Password hash generated successfully!');
  console.log('📋 Copy this hash:');
  console.log('-'.repeat(80));
  console.log(hashedPassword);
  console.log('-'.repeat(80));
  
  console.log('\n📝 Instructions:');
  console.log('1. Open Prisma Studio: http://localhost:5555');
  console.log('2. Go to the "User" table');
  console.log('3. Find your user account and click edit');
  console.log('4. Replace the current password field with the hash above');
  console.log('5. Save the changes');
  console.log('\nYour data will be preserved and you can login with your new password! 🎉');
  
  rl.close();
});

rl.on('close', () => {
  process.exit(0);
});