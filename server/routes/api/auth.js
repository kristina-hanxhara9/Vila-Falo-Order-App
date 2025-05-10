// server/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const config = require('../../config/config');

// Middleware to verify token and protect routes
const auth = function(req, res, next) {
  // Get token from header
  const authHeader = req.header('Authorization');
  let token;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Extract token from 'Bearer <token>'
    token = authHeader.substring(7);
  } else {
    // Try the x-auth-token header as fallback
    token = req.header('x-auth-token');
  }

  if (!token) {
    return res.status(401).json({ message: 'Nuk keni akses, autentifikimi mungon' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(401).json({ message: 'Token i pavlefshëm' });
  }
};

// @route   GET /api/auth/test
// @desc    Test auth route
// @access  Public
router.get('/test', (req, res) => {
  res.json({ message: 'Auth API is working' });
});

// @route   GET /api/auth/user
// @desc    Get authenticated user data
// @access  Private
router.get('/user', auth, async (req, res) => {
  try {
    console.log('User request received, user ID from token:', req.user.id);
    const user = await User.findById(req.user.id);
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet' });
    }
    res.json(user);
  } catch (err) {
    console.error('User fetch error:', err);
    res.status(500).json({ message: 'Gabim në server' });
  }
});

// @route   GET /api/auth/me
// @desc    Alias for /user for compatibility
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet' });
    }
    res.json(user);
  } catch (err) {
    console.error('User fetch error:', err);
    res.status(500).json({ message: 'Gabim në server' });
  }
});

// @route   GET /api/auth/users
// @desc    Get all users (manager only)
// @access  Private
router.get('/users', auth, async (req, res) => {
  try {
    // Check if user is manager
    if (req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Nuk keni akses në këtë funksion' });
    }
    
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error('User fetch error:', err);
    res.status(500).json({ message: 'Gabim në server' });
  }
});

// DEBUG route - Remove in production!
router.get('/all-users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    console.error('Error fetching all users:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/register
// @desc    Register user (manager only)
// @access  Private
router.post('/register', auth, async (req, res) => {
  // Check if user is manager
  if (req.user.role !== 'manager') {
    return res.status(403).json({ message: 'Nuk keni akses në këtë funksion' });
  }
  
  const { name, username, role } = req.body;
  if (!name || !username || !role) {
    return res.status(400).json({ message: 'Ju lutem plotësoni të gjitha fushat' });
  }

  try {
    const exists = await User.findOne({ username: username.toLowerCase() });
    if (exists) {
      return res.status(400).json({ message: 'Përdoruesi ekziston tashmë' });
    }

    const user = new User({ 
      name, 
      username: username.toLowerCase(), 
      role 
    });
    
    await user.save();
    
    // Generate token for the new user
    const token = user.generateAuthToken();

    res.json({ 
      message: 'Përdoruesi u krijua me sukses',
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        username: user.username, 
        role: user.role 
      } 
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Gabim në server' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user (passwordless)
// @access  Public
router.post('/login', async (req, res) => {
  console.log('Login request received. Full request body:', req.body);
  const { username } = req.body;

  if (!username) {
    console.log('Username is missing or undefined');
    return res.status(400).json({ message: 'Ju lutem shkruani emrin e përdoruesit' });
  }

  try {
    console.log('Looking for user with username:', username.toLowerCase());
    
    // Log all users to help with debugging
    const allUsers = await User.find();
    console.log('All users in database:', allUsers.map(u => u.username));
    
    const user = await User.findOne({ username: username.toLowerCase() });
    console.log('User search result:', user ? 'Found' : 'Not found');
    console.log('User details if found:', user);
    
    if (!user) {
      return res.status(400).json({ message: 'Përdoruesi nuk u gjet' });
    }

    // Generate token
    const token = user.generateAuthToken();
    console.log('Generated token for user');
    
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        username: user.username,
        role: user.role 
      } 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Gabim në server' });
  }
});

// @route   PUT /api/auth/users/:id
// @desc    Update a user (manager only)
// @access  Private
router.put('/users/:id', auth, async (req, res) => {
  // Check if user is manager
  if (req.user.role !== 'manager') {
    return res.status(403).json({ message: 'Nuk keni akses në këtë funksion' });
  }
  
  const { name, username, role } = req.body;

  try {
    // Check if user exists
    let user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet' });
    }
    
    // Check if new username is already taken (if changing)
    if (username && username.toLowerCase() !== user.username) {
      const existingUser = await User.findOne({ username: username.toLowerCase() });
      
      if (existingUser) {
        return res.status(400).json({ message: 'Ky emër përdoruesi ekziston tashmë' });
      }
    }
    
    // Update fields
    if (name) user.name = name;
    if (username) user.username = username.toLowerCase();
    if (role) user.role = role;
    
    await user.save();
    
    res.json(user);
  } catch (err) {
    console.error('User update error:', err);
    res.status(500).json({ message: 'Gabim në server' });
  }
});

// @route   DELETE /api/auth/users/:id
// @desc    Delete a user (manager only)
// @access  Private
router.delete('/users/:id', auth, async (req, res) => {
  // Check if user is manager
  if (req.user.role !== 'manager') {
    return res.status(403).json({ message: 'Nuk keni akses në këtë funksion' });
  }
  
  try {
    // Find user
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet' });
    }
    
    // Don't allow managers to delete themselves
    if (req.user.id === req.params.id) {
      return res.status(400).json({ message: 'Nuk mund të fshini llogarinë tuaj' });
    }
    
    await User.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Përdoruesi u fshi me sukses' });
  } catch (err) {
    console.error('User delete error:', err);
    res.status(500).json({ message: 'Gabim në server' });
  }
});

// Correctly export both the router and auth middleware
router.auth = auth;
module.exports = router;