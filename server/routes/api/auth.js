const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const auth = require('../../middleware/auth');

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
      return res.status(404).json({ message: 'Perdoruesi nuk u gjet' });
    }
    res.json(user);
  } catch (err) {
    console.error('User fetch error:', err.message);
    res.status(500).json({ message: 'Gabim ne server' });
  }
});

// @route   GET /api/auth/me
// @desc    Alias for /user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Perdoruesi nuk u gjet' });
    }
    res.json(user);
  } catch (err) {
    console.error('User fetch error:', err.message);
    res.status(500).json({ message: 'Gabim ne server' });
  }
});

// @route   GET /api/auth/users
// @desc    Get all users (manager only)
// @access  Private
router.get('/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Nuk keni akses ne kete funksion' });
    }
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error('User fetch error:', err.message);
    res.status(500).json({ message: 'Gabim ne server' });
  }
});

// @route   POST /api/auth/register
// @desc    Register user (manager only)
// @access  Private
router.post('/register', auth, async (req, res) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ message: 'Nuk keni akses ne kete funksion' });
  }

  const { name, username, role, pin } = req.body;
  if (!name || !username || !role || !pin) {
    return res.status(400).json({ message: 'Ju lutem plotesoni te gjitha fushat' });
  }

  if (!/^\d{4}$/.test(pin)) {
    return res.status(400).json({ message: 'PIN duhet te jete 4 shifra' });
  }

  try {
    const exists = await User.findOne({ username: username.toLowerCase() });
    if (exists) {
      return res.status(400).json({ message: 'Perdoruesi ekziston tashme' });
    }

    const user = new User({ name, username: username.toLowerCase(), role, pin });
    await user.save();

    const token = user.generateAuthToken();
    res.json({
      message: 'Perdoruesi u krijua me sukses',
      token,
      user: { id: user._id, name: user.name, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(500).json({ message: 'Gabim ne server' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user with PIN
// @access  Public
router.post('/login', async (req, res) => {
  const { username, pin } = req.body;

  if (!username || !pin) {
    return res.status(400).json({ message: 'Ju lutem shkruani emrin dhe PIN-in' });
  }

  try {
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Kredencialet jane te gabuara' });
    }

    const isMatch = await user.comparePin(pin);
    if (!isMatch) {
      return res.status(400).json({ message: 'Kredencialet jane te gabuara' });
    }

    const token = user.generateAuthToken();
    res.json({
      token,
      user: { id: user._id, name: user.name, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Gabim ne server' });
  }
});

// @route   PUT /api/auth/users/:id
// @desc    Update a user (manager only)
// @access  Private
router.put('/users/:id', auth, async (req, res) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ message: 'Nuk keni akses ne kete funksion' });
  }

  const { name, username, role, pin } = req.body;

  try {
    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Perdoruesi nuk u gjet' });
    }

    if (username && username.toLowerCase() !== user.username) {
      const existingUser = await User.findOne({ username: username.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ message: 'Ky emer perdoruesi ekziston tashme' });
      }
    }

    if (name) user.name = name;
    if (username) user.username = username.toLowerCase();
    if (role) user.role = role;
    if (pin) {
      if (!/^\d{4}$/.test(pin)) {
        return res.status(400).json({ message: 'PIN duhet te jete 4 shifra' });
      }
      user.pin = pin;
    }

    await user.save();
    res.json(user);
  } catch (err) {
    console.error('User update error:', err.message);
    res.status(500).json({ message: 'Gabim ne server' });
  }
});

// @route   DELETE /api/auth/users/:id
// @desc    Delete a user (manager only)
// @access  Private
router.delete('/users/:id', auth, async (req, res) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ message: 'Nuk keni akses ne kete funksion' });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Perdoruesi nuk u gjet' });
    }

    if (req.user.id === req.params.id) {
      return res.status(400).json({ message: 'Nuk mund te fshini llogarite tuaj' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Perdoruesi u fshi me sukses' });
  } catch (err) {
    console.error('User delete error:', err.message);
    res.status(500).json({ message: 'Gabim ne server' });
  }
});

module.exports = router;
