// server/scripts/migrateToPasswordless.js
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

// Define the old User Schema with password
const oldUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['waiter', 'kitchen', 'manager'], required: true }
});

// Create a model with the old schema
const OldUser = mongoose.model('UserWithPassword', oldUserSchema, 'users');

// Migrate to passwordless
const migrateToPasswordless = async () => {
  try {
    // Connect to database
    await connectDB();
    
    console.log('Starting migration to passwordless authentication...');
    
    // Get all users
    const users = await OldUser.find({});
    console.log(`Found ${users.length} users to migrate`);
    
    // Track progress
    let migratedCount = 0;
    
    // Migrate each user
    for (const user of users) {
      console.log(`Migrating user: ${user.username}`);
      
      // Update user document by removing password field
      await mongoose.connection.collection('users').updateOne(
        { _id: user._id },
        { $unset: { password: "" } }
      );
      
      migratedCount++;
    }
    
    console.log(`Successfully migrated ${migratedCount} of ${users.length} users to passwordless authentication`);
    
    // Verify migration
    const verifyCount = await mongoose.connection.collection('users').countDocuments({ password: { $exists: false } });
    console.log(`Verification: ${verifyCount} users are now passwordless`);
    
    console.log('Migration completed successfully!');
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

// Run the migration
migrateToPasswordless();