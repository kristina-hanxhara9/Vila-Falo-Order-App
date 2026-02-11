// server/config/db.js
const mongoose = require('mongoose');

// Log masked URI so user can verify format without exposing password
function getMaskedUri(uri) {
  try {
    const masked = uri.replace(/:([^@/]+)@/, ':****@');
    return masked;
  } catch {
    return '(could not parse URI)';
  }
}

const connectDB = async () => {
  let uri = process.env.MONGO_URI;

  // Guard against common mistake: env var value set as "MONGO_URI=mongodb+srv://..."
  if (uri && uri.startsWith('MONGO_URI=')) {
    console.warn('WARNING: MONGO_URI value contains "MONGO_URI=" prefix — stripping it automatically.');
    console.warn('Please fix this in your Railway/hosting environment variables.');
    uri = uri.replace(/^MONGO_URI=/, '');
  }

  console.log(`Connecting to MongoDB: ${getMaskedUri(uri)}`);

  try {
    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`MongoDB Connection Error: ${err.message}`);

    if (err.message.includes('bad auth') || err.message.includes('Authentication failed')) {
      console.error('');
      console.error('=== AUTHENTICATION TROUBLESHOOTING ===');
      console.error('The password in MONGO_URI is incorrect. To fix:');
      console.error('1. Go to MongoDB Atlas → Database Access');
      console.error('2. Click Edit on your database user');
      console.error('3. Set a NEW simple password (letters and numbers only, no special chars)');
      console.error('4. Update the MONGO_URI in Railway Variables with the new password');
      console.error('5. Make sure there are no extra spaces in the MONGO_URI value');
      console.error(`6. URI format should be: mongodb+srv://USERNAME:PASSWORD@cluster.xxxxx.mongodb.net/vila-falo`);
      console.error('7. Also check: Atlas → Network Access → Allow 0.0.0.0/0 (access from anywhere)');
      console.error('======================================');
    }

    process.exit(1);
  }
};

module.exports = connectDB;