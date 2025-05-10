// server/scripts/createPasswordlessUsers.js
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

// Define the User Schema for passwordless auth
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true, lowercase: true },
  role: { type: String, enum: ['waiter', 'kitchen', 'manager'], required: true },
  createdAt: { type: Date, default: Date.now }
});

// Create a model from the schema
const User = mongoose.model('User', userSchema, 'users');

// Sample users to create
const usersToCreate = [
  {
    name: 'Menaxher Demo',
    username: 'admin',
    role: 'manager'
  },
  {
    name: 'Kamarier Demo',
    username: 'waiter',
    role: 'waiter'
  },
  {
    name: 'Kuzhina Demo',
    username: 'kitchen',
    role: 'kitchen'
  }
];

// Create users function
const createUsers = async () => {
  try {
    // Connect to database
    await connectDB();
    
    console.log('Starting to create initial users...');
    
    // Count existing users
    const existingCount = await User.countDocuments();
    console.log(`Current user count: ${existingCount}`);
    
    if (existingCount > 0) {
      console.log('Users already exist in the database. If you want to add more users, please modify the script.');
      process.exit(0);
    }
    
    // Track progress
    let createdCount = 0;
    
    // Create each user
    for (const userData of usersToCreate) {
      // Check if user already exists
      const existing = await User.findOne({ username: userData.username.toLowerCase() });
      
      if (existing) {
        console.log(`User ${userData.username} already exists, skipping...`);
        continue;
      }
      
      // Create new user
      const user = new User(userData);
      await user.save();
      
      console.log(`Created user: ${userData.name} (${userData.role})`);
      createdCount++;
    }
    
    console.log(`Successfully created ${createdCount} of ${usersToCreate.length} users`);
    
    // Final user count
    const finalCount = await User.countDocuments();
    console.log(`Final user count: ${finalCount}`);
    
    console.log('User creation completed successfully!');
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
  } catch (error) {
    console.error('User creation failed:', error);
    process.exit(1);
  }
};

// Run the function
createUsers();