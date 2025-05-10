const express = require('express');
const router = express.Router();
const MenuItem = require('../../models/MenuItem');
const auth = require('../../middleware/auth');

// @route   GET /api/menu
// @desc    Get all menu items
// @access  Public
router.get('/', async (req, res) => {
  try {
    console.log('GET /api/menu - Fetching all menu items');
    
    // Query all menu items and sort them
    const menuItems = await MenuItem.find().sort({ category: 1, name: 1 });
    
    console.log(`Found ${menuItems.length} menu items`);
    
    // Check if any items were found
    if (menuItems.length === 0) {
      console.log('No menu items found in database');
    } else {
      console.log('Menu items categories:', menuItems.map(item => item.category));
    }
    
    res.json(menuItems);
  } catch (err) {
    console.error('Error fetching menu items:', err.message);
    res.status(500).send('Gabim në server');
  }
});

// @route   GET /api/menu/category/:category
// @desc    Get menu items by category
// @access  Public
router.get('/category/:category', async (req, res) => {
  try {
    console.log(`GET /api/menu/category/${req.params.category} - Fetching menu items by category`);
    
    const menuItems = await MenuItem.find({ 
      category: req.params.category,
      available: true
    }).sort({ name: 1 });
    
    console.log(`Found ${menuItems.length} menu items in category ${req.params.category}`);
    
    res.json(menuItems);
  } catch (err) {
    console.error('Error fetching menu items by category:', err.message);
    res.status(500).send('Gabim në server');
  }
});

// @route   POST /api/menu
// @desc    Add a new menu item
// @access  Private (manager only)
router.post('/', auth, async (req, res) => {
  // Check if user is manager
  if (req.user.role !== 'manager') {
    return res.status(403).json({ message: 'Nuk keni akses në këtë funksion' });
  }
  
  const { name, albanianName, category, price, description, albanianDescription } = req.body;
  
  try {
    // Create new menu item
    const newMenuItem = new MenuItem({
      name,
      albanianName,
      category,
      price,
      description,
      albanianDescription
    });
    
    const menuItem = await newMenuItem.save();
    res.json(menuItem);
  } catch (err) {
    console.error('Error creating menu item:', err.message);
    res.status(500).send('Gabim në server');
  }
});

// @route   PUT /api/menu/:id
// @desc    Update a menu item
// @access  Private (manager only)
router.put('/:id', auth, async (req, res) => {
  // Check if user is manager
  if (req.user.role !== 'manager') {
    return res.status(403).json({ message: 'Nuk keni akses në këtë funksion' });
  }
  
  try {
    let menuItem = await MenuItem.findById(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({ message: 'Artikulli i menusë nuk u gjet' });
    }
    
    const { name, albanianName, category, price, available, description, albanianDescription } = req.body;
    
    // Build menu item object
    const menuItemFields = {};
    if (name) menuItemFields.name = name;
    if (albanianName) menuItemFields.albanianName = albanianName;
    if (category) menuItemFields.category = category;
    if (price) menuItemFields.price = price;
    if (available !== undefined) menuItemFields.available = available;
    if (description) menuItemFields.description = description;
    if (albanianDescription) menuItemFields.albanianDescription = albanianDescription;
    
    menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      { $set: menuItemFields },
      { new: true }
    );
    
    res.json(menuItem);
  } catch (err) {
    console.error('Error updating menu item:', err.message);
    res.status(500).send('Gabim në server');
  }
});

// @route   DELETE /api/menu/:id
// @desc    Delete a menu item
// @access  Private (manager only)
router.delete('/:id', auth, async (req, res) => {
  // Check if user is manager
  if (req.user.role !== 'manager') {
    return res.status(403).json({ message: 'Nuk keni akses në këtë funksion' });
  }
  
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({ message: 'Artikulli i menusë nuk u gjet' });
    }
    
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Artikulli i menusë u fshi' });
  } catch (err) {
    console.error('Error deleting menu item:', err.message);
    res.status(500).send('Gabim në server');
  }
});

// Export the router
module.exports = router;