/**
 * Migration script: Add default PINs to existing users
 * Run once: node server/scripts/addDefaultPins.js
 *
 * Sets PIN "0000" for all users that don't have one.
 * After running, remind all staff to change their PIN via the manager.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config/config');

async function migrate() {
  if (!config.mongoURI) {
    console.error('MONGO_URI is required. Set it in server/.env');
    process.exit(1);
  }

  await mongoose.connect(config.mongoURI);
  console.log('Connected to MongoDB');

  const User = mongoose.connection.collection('users');
  const users = await User.find({ pin: { $exists: false } }).toArray();

  if (users.length === 0) {
    console.log('All users already have PINs. Nothing to do.');
  } else {
    const defaultPin = await bcrypt.hash('0000', 10);

    for (const user of users) {
      await User.updateOne(
        { _id: user._id },
        { $set: { pin: defaultPin } }
      );
      console.log(`Set default PIN for: ${user.username} (${user.name})`);
    }

    console.log(`\nDone! Updated ${users.length} users with default PIN "0000".`);
    console.log('IMPORTANT: Tell all staff to ask the manager to change their PIN.');
  }

  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
