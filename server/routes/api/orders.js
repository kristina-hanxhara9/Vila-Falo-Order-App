const express = require('express');
const router = express.Router();
const MenuItem = require('../../models/MenuItem');
const auth = require('../../middleware/auth');

// Helper function to check if user is manager or waiter
const isManagerOrWaiter = (user) => {
  return user.role === 'manager' || user.role === 'waiter';
};

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
    res.status(500).send('Server error');
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
    res.status(500).send('Server error');
  }
});

// @route   POST /api/menu
// @desc    Add a new menu item
// @access  Private (manager or waiter)
router.post('/', auth, async (req, res) => {
  // Check if user is manager or waiter
  if (!isManagerOrWaiter(req.user)) {
    return res.status(403).json({ message: 'You do not have access to this feature' });
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
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/menu/:id
// @desc    Update a menu item
// @access  Private (manager or waiter)
router.put('/:id', auth, async (req, res) => {
  // Check if user is manager or waiter
  if (!isManagerOrWaiter(req.user)) {
    return res.status(403).json({ message: 'You do not have access to this feature' });
  }
  
  try {
    let menuItem = await MenuItem.findById(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
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
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/menu/:id
// @desc    Delete a menu item
// @access  Private (manager or waiter)
router.delete('/:id', auth, async (req, res) => {
  // Check if user is manager or waiter
  if (!isManagerOrWaiter(req.user)) {
    return res.status(403).json({ message: 'You do not have access to this feature' });
  }
  
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Menu item deleted successfully' });
  } catch (err) {
    console.error('Error deleting menu item:', err.message);
    res.status(500).send('Server error');
  }
});

// Export the router
module.exports = router;
