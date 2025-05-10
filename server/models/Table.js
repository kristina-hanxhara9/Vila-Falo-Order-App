const mongoose = require('mongoose');
require('dotenv').config();

const TableSchema = new mongoose.Schema({
  number: {
    type: Number,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['free', 'ordering', 'unpaid', 'paid'],
    // Albanian translations for status
    // free: e lirë
    // ordering: duke porositur
    // unpaid: e papaguar
    // paid: e paguar
    default: 'free'
  },
  currentOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  capacity: {
    type: Number,
    default: 4
  }
});

module.exports = mongoose.model('Table', TableSchema);