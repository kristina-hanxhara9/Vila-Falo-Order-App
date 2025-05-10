// middleware/auth.js
const jwt = require('jsonwebtoken');
const config = require('../config/config');

module.exports = function(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
  
  // Check if no token
  if (!token) {
    console.log('No auth token provided');
    return res.status(401).json({ message: 'Nuk keni qasje në këtë resurs' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Add user to request
    req.user = decoded;
    
    console.log('Auth successful:', {
      userId: decoded.id,
      role: decoded.role
    });
    
    next();
  } catch (err) {
    console.error('Token error:', err.message);
    res.status(401).json({ message: 'Token i pavlefshëm' });
  }
};