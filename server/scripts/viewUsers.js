// scripts/viewUsers.js
require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }
};

// Define the User Schema
const userSchema = new mongoose.Schema({
  name: { type: String },
  username: { type: String },
  role: { type: String }
});

// Create model
const User = mongoose.model('User', userSchema, 'users');

// View all users
const viewUsers = async () => {
  try {
    await connectDB();
    
    console.log('Retrieving all users...');
    const users = await User.find({}).select('name username role');
    
    console.log('Users in database:');
    console.log('==================');
    
    users.forEach(user => {
      console.log(`Name: ${user.name}`);
      console.log(`Username: ${user.username}`);
      console.log(`Role: ${user.role}`);
      console.log('------------------');
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error viewing users:', error);
    process.exit(1);
  }
};

// Run the function
viewUsers();