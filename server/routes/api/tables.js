const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth'); // Middleware for authentication
const Table = require('../../models/Table'); // Table model

// @route   GET /api/tables
// @desc    Get all tables
// @access  Private
router.get('/', auth, async (req, res) => {
  console.log('GET /api/tables route hit by:', req.user?.role);
  try {
    const tables = await Table.find().sort({ number: 1 });
    res.json(tables);
  } catch (err) {
    console.error('Error fetching tables:', err.message);
    res.status(500).send('Gabim në server');
  }
});

// @route   GET /api/tables/:id
// @desc    Get table by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    
    if (!table) {
      return res.status(404).json({ message: 'Tavolina nuk u gjet' });
    }
    
    res.json(table);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Tavolina nuk u gjet' });
    }
    res.status(500).send('Gabim në server');
  }
});

// @route   POST /api/tables
// @desc    Create a table
// @access  Private (both manager and waiter can create)
router.post('/', auth, async (req, res) => {
  // Log the user and request for debugging
  console.log('Create table request from:', req.user?.role);
  console.log('Request body:', req.body);

  try {
    const { number, name, capacity } = req.body;
    
    // Check if table number already exists
    let table = await Table.findOne({ number });
    if (table) {
      return res.status(400).json({ message: 'Kjo tavolinë ekziston tashmë' });
    }
    
    // Create new table
    table = new Table({
      number,
      name: name || '',
      capacity: capacity || 4,
      status: 'free'
    });
    
    await table.save();
    console.log('Table created successfully:', table);
    res.json(table);
  } catch (err) {
    console.error('Error creating table:', err.message);
    res.status(500).send('Gabim në server');
  }
});

// @route   PUT /api/tables/:id
// @desc    Update table
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    
    if (!table) {
      return res.status(404).json({ message: 'Tavolina nuk u gjet' });
    }
    
    // Build table fields object from all request fields
    const tableFields = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (value !== undefined) {
        tableFields[key] = value;
      }
    }
    
    console.log('Updating table with fields:', tableFields);
    
    const updatedTable = await Table.findByIdAndUpdate(
      req.params.id,
      { $set: tableFields },
      { new: true }
    );
    
    res.json(updatedTable);
  } catch (err) {
    console.error('Error updating table:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Tavolina nuk u gjet' });
    }
    res.status(500).send('Gabim në server');
  }
});

// @route   DELETE /api/tables/:id
// @desc    Delete a table
// @access  Private (both manager and waiter can delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    
    if (!table) {
      return res.status(404).json({ message: 'Tavolina nuk u gjet' });
    }
    
    // Check if table has an active order
    if (table.status !== 'free') {
      return res.status(400).json({ message: 'Nuk mund të fshihet një tavolinë me porosi aktive' });
    }
    
    await Table.findByIdAndDelete(req.params.id);
    res.json({ message: 'Tavolina u fshi' });
  } catch (err) {
    console.error('Error deleting table:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Tavolina nuk u gjet' });
    }
    res.status(500).send('Gabim në server');
  }
});

// Export the router
module.exports = router;