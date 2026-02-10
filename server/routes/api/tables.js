const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Table = require('../../models/Table');

// @route   GET /api/tables
// @desc    Get all tables
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const tables = await Table.find().sort({ number: 1 });
    res.json(tables);
  } catch (err) {
    console.error('Error fetching tables:', err.message);
    res.status(500).json({ message: 'Gabim ne server' });
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
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Tavolina nuk u gjet' });
    }
    console.error('Error fetching table:', err.message);
    res.status(500).json({ message: 'Gabim ne server' });
  }
});

// @route   POST /api/tables
// @desc    Create a table
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { number, name, capacity } = req.body;

    let table = await Table.findOne({ number });
    if (table) {
      return res.status(400).json({ message: 'Kjo tavoline ekziston tashme' });
    }

    table = new Table({
      number,
      name: name || '',
      capacity: capacity || 4,
      status: 'free'
    });

    await table.save();
    res.json(table);
  } catch (err) {
    console.error('Error creating table:', err.message);
    res.status(500).json({ message: 'Gabim ne server' });
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

    const allowedFields = ['number', 'name', 'capacity', 'status', 'currentOrder'];
    const tableFields = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        tableFields[key] = req.body[key];
      }
    }

    const updatedTable = await Table.findByIdAndUpdate(
      req.params.id,
      { $set: tableFields },
      { new: true }
    );

    res.json(updatedTable);
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Tavolina nuk u gjet' });
    }
    console.error('Error updating table:', err.message);
    res.status(500).json({ message: 'Gabim ne server' });
  }
});

// @route   DELETE /api/tables/:id
// @desc    Delete a table
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);

    if (!table) {
      return res.status(404).json({ message: 'Tavolina nuk u gjet' });
    }

    if (table.status !== 'free') {
      return res.status(400).json({ message: 'Nuk mund te fshihet nje tavoline me porosi aktive' });
    }

    await Table.findByIdAndDelete(req.params.id);
    res.json({ message: 'Tavolina u fshi' });
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Tavolina nuk u gjet' });
    }
    console.error('Error deleting table:', err.message);
    res.status(500).json({ message: 'Gabim ne server' });
  }
});

module.exports = router;
