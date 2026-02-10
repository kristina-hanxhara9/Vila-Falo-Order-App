const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config/config');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true, lowercase: true },
  role: { type: String, enum: ['waiter', 'kitchen', 'manager'], required: true },
  pin: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Hash PIN before saving
userSchema.pre('save', async function(next) {
  if (this.isModified('pin')) {
    this.pin = await bcrypt.hash(this.pin, 10);
  }
  next();
});

// Compare PIN
userSchema.methods.comparePin = async function(candidatePin) {
  return bcrypt.compare(candidatePin, this.pin);
};

// Generate JWT token (expires after 12 hours — covers a restaurant shift)
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    {
      id: this._id.toString(),
      role: this.role,
      name: this.name
    },
    config.jwtSecret,
    { expiresIn: '12h' }
  );
};

module.exports = mongoose.model('User', userSchema);
