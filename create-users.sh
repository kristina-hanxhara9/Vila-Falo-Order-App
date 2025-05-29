#!/bin/bash

echo "🔧 Creating Users for Vila Falo Restaurant System"
echo "================================================"

echo "Creating users via Heroku console..."

# Create the admin user
heroku run node -e "
const mongoose = require('mongoose');
const User = require('./server/models/User');

mongoose.connect(process.env.MONGO_URI);

async function createUsers() {
  try {
    // Delete existing users first (clean start)
    await User.deleteMany({});
    console.log('Cleared existing users');
    
    // Create admin user
    const admin = new User({
      name: 'Administrator',
      username: 'admin',
      role: 'manager'
    });
    await admin.save();
    console.log('Created admin user');
    
    // Create genti user
    const genti = new User({
      name: 'Genti',
      username: 'genti', 
      role: 'manager'
    });
    await genti.save();
    console.log('Created genti user');
    
    // Create klarita user
    const klarita = new User({
      name: 'Klarita',
      username: 'klarita',
      role: 'waiter'
    });
    await klarita.save();
    console.log('Created klarita user');
    
    console.log('✅ All users created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating users:', error);
    process.exit(1);
  }
}

createUsers();
"

echo ""
echo "✅ Users created! You can now login with:"
echo "   👤 admin (Manager)"
echo "   👤 genti (Manager)" 
echo "   👤 klarita (Waiter)"
echo ""
echo "🌟 Go to your app and try logging in:"
echo "   https://dry-cliffs-57282-2269f6e54282.herokuapp.com"
