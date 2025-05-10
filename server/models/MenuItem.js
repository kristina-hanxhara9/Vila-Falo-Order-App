// server/models/MenuItem.js
const mongoose = require('mongoose');

const MenuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  albanianName: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['food', 'drink', 'dessert'],
    // Albanian translations for categories
    // food: ushqime
    // drink: pije
    // dessert: ëmbëlsira
  },
  price: {
    type: Number,
    required: true
  },
  available: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    trim: true
  },
  albanianDescription: {
    type: String,
    trim: true
  }
});

// Export the model with explicit collection name
module.exports = mongoose.model('MenuItem', MenuItemSchema, 'menuitems');