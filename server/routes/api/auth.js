const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const config = require('../../config/config');

// Middleware to verify token and protect routes
const auth = (req, res, next) => {
  const authHeader = req.header('Authorization');
  let token;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
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

// @route   POST /api/auth/register
// @desc    Register user (manager only)
// @access  Private
router.post('/register', auth, async (req, res) => {
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

    const user = new User({ name, username: username.toLowerCase(), role });
    await user.save();

    const token = user.generateAuthToken();
    res.json({
      message: 'Përdoruesi u krijua me sukses',
      token,
      user: { id: user._id, name: user.name, username: user.username, role: user.role },
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
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ message: 'Ju lutem shkruani emrin e përdoruesit' });
  }

  try {
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Përdoruesi nuk u gjet' });
    }

    const token = user.generateAuthToken();
    res.json({
      token,
      user: { id: user._id, name: user.name, username: user.username, role: user.role },
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
  if (req.user.role !== 'manager') {
    return res.status(403).json({ message: 'Nuk keni akses në këtë funksion' });
  }

  const { name, username, role } = req.body;

  try {
    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet' });
    }

    if (username && username.toLowerCase() !== user.username) {
      const existingUser = await User.findOne({ username: username.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ message: 'Ky emër përdoruesi ekziston tashmë' });
      }
    }

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
  if (req.user.role !== 'manager') {
    return res.status(403).json({ message: 'Nuk keni akses në këtë funksion' });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet' });
    }

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

// Export the router and auth middleware
router.auth = auth;
module.exports = router;
