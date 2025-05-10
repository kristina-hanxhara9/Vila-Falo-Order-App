// server/models/User.js
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true, lowercase: true },
  role: { type: String, enum: ['waiter', 'kitchen', 'manager'], required: true },
  createdAt: { type: Date, default: Date.now }
});

// Generate JWT token (no expiration)
userSchema.methods.generateAuthToken = function() {
  console.log('Generating token for user:', {
    id: this._id.toString(),
    username: this.username,
    role: this.role
  });
  
  return jwt.sign(
    { 
      id: this._id.toString(), // Ensure ID is properly converted to string
      role: this.role,
      name: this.name 
    },
    config.jwtSecret
    // No expiresIn parameter, so token will never expire
  );
};

module.exports = mongoose.model('User', userSchema);