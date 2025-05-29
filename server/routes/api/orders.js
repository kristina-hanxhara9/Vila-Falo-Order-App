const express = require('express');
const router = express.Router();
const Order = require('../../models/Order');
const Table = require('../../models/Table');
const MenuItem = require('../../models/MenuItem');
const auth = require('../../middleware/auth');

// Helper function to check if user is manager, waiter, or kitchen
const hasAccess = (user) => {
  return user.role === 'manager' || user.role === 'waiter' || user.role === 'kitchen';
};

// @route   GET /api/orders
// @desc    Get all orders (kitchen and manager view)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    console.log('GET /api/orders - Fetching orders for user:', req.user.role);
    
    let query = {};
    
    // Kitchen staff only sees active orders
    if (req.user.role === 'kitchen') {
      query.status = 'active';
    }
    
    // Waiter only sees their own orders
    if (req.user.role === 'waiter') {
      query.waiter = req.user.id;
    }
    
    const orders = await Order.find(query)
      .populate('table', 'number status')
      .populate('waiter', 'name')
      .populate('items.menuItem', 'name albanianName category')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${orders.length} orders`);
    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    if (!hasAccess(req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const order = await Order.findById(req.params.id)
      .populate('table', 'number status')
      .populate('waiter', 'name')
      .populate('items.menuItem', 'name albanianName category price');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Waiter can only see their own orders
    if (req.user.role === 'waiter' && order.waiter._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(order);
  } catch (err) {
    console.error('Error fetching order:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route   POST /api/orders
// @desc    Create new order
// @access  Private (waiter)
router.post('/', auth, async (req, res) => {
  try {
    console.log('POST /api/orders - Creating new order');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User role:', req.user.role);
    console.log('User ID:', req.user.id);
    
    // Check if user is waiter or manager
    if (req.user.role !== 'waiter' && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Only waiters and managers can create orders' });
    }
    
    const { table, items } = req.body;
    
    // Validate required fields
    if (!table || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        message: 'Table ID and items array are required',
        received: { table, itemsLength: items ? items.length : 0 }
      });
    }
    
    // Validate table exists
    const tableExists = await Table.findById(table);
    if (!tableExists) {
      return res.status(404).json({ message: 'Table not found' });
    }
    
    // Process and validate items
    const processedItems = [];
    let totalAmount = 0;
    
    for (const item of items) {
      console.log('Processing item:', item);
      
      let processedItem = {
        quantity: parseInt(item.quantity) || 1,
        price: parseFloat(item.price) || 0,
        notes: item.notes || '',
        status: 'pending'
      };
      
      // Handle custom items vs menu items
      if (item.custom) {
        // For custom items, we don't have a menuItem reference
        // We'll store the name in notes or create a special handling
        processedItem.name = item.name;
        processedItem.custom = true;
        
        // Create a temporary menu item or handle differently
        // For now, we'll skip menuItem reference for custom items
        const tempMenuItem = new MenuItem({
          name: item.name,
          albanianName: item.name,
          category: 'custom',
          price: processedItem.price,
          description: 'Custom item',
          available: false // Mark as not available for regular menu
        });
        
        const savedTempItem = await tempMenuItem.save();
        processedItem.menuItem = savedTempItem._id;
      } else {
        // Regular menu item
        if (!item.menuItem) {
          return res.status(400).json({ 
            message: 'Menu item ID is required for non-custom items',
            item: item 
          });
        }
        
        // Validate menu item exists
        const menuItem = await MenuItem.findById(item.menuItem);
        if (!menuItem) {
          return res.status(404).json({ message: `Menu item not found: ${item.menuItem}` });
        }
        
        processedItem.menuItem = item.menuItem;
        // Use menu item price if not provided
        if (processedItem.price === 0) {
          processedItem.price = menuItem.price;
        }
      }
      
      // Validate processed item
      if (processedItem.quantity <= 0 || processedItem.price < 0) {
        return res.status(400).json({ 
          message: 'Invalid item quantity or price',
          item: processedItem 
        });
      }
      
      totalAmount += processedItem.price * processedItem.quantity;
      processedItems.push(processedItem);
    }
    
    console.log('Processed items:', processedItems);
    console.log('Total amount:', totalAmount);
    
    // Create the order
    const orderData = {
      table: table,
      waiter: req.user.id,
      items: processedItems,
      totalAmount: totalAmount,
      status: 'active',
      paymentStatus: 'unpaid'
    };
    
    console.log('Creating order with data:', JSON.stringify(orderData, null, 2));
    
    const order = new Order(orderData);
    const savedOrder = await order.save();
    
    // Populate the saved order for response
    const populatedOrder = await Order.findById(savedOrder._id)
      .populate('table', 'number status')
      .populate('waiter', 'name')
      .populate('items.menuItem', 'name albanianName category price');
    
    console.log('Order created successfully:', populatedOrder._id);
    
    res.status(201).json(populatedOrder);
  } catch (err) {
    console.error('Error creating order:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ 
      message: 'Server error while creating order', 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// @route   PUT /api/orders/:id
// @desc    Update order status
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    if (!hasAccess(req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Waiter can only update their own orders
    if (req.user.role === 'waiter' && order.waiter.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { status, paymentStatus } = req.body;
    
    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    
    if (status === 'completed' && !order.completedAt) {
      order.completedAt = new Date();
    }
    
    const updatedOrder = await order.save();
    
    const populatedOrder = await Order.findById(updatedOrder._id)
      .populate('table', 'number status')
      .populate('waiter', 'name')
      .populate('items.menuItem', 'name albanianName category');
    
    res.json(populatedOrder);
  } catch (err) {
    console.error('Error updating order:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route   PUT /api/orders/:id/prepared
// @desc    Mark order as prepared (kitchen use)
// @access  Private (kitchen, manager)
router.put('/:id/prepared', auth, async (req, res) => {
  try {
    if (req.user.role !== 'kitchen' && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Only kitchen staff can mark orders as prepared' });
    }
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Mark all items as ready and order as completed
    order.items.forEach(item => {
      if (item.status !== 'ready') {
        item.status = 'ready';
      }
    });
    
    order.status = 'completed';
    order.completedAt = new Date();
    
    const updatedOrder = await order.save();
    
    const populatedOrder = await Order.findById(updatedOrder._id)
      .populate('table', 'number status')
      .populate('waiter', 'name')
      .populate('items.menuItem', 'name albanianName category');
    
    res.json(populatedOrder);
  } catch (err) {
    console.error('Error marking order as prepared:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route   PUT /api/orders/:id/item/:itemId/prepared
// @desc    Mark individual item as prepared
// @access  Private (kitchen, manager)
router.put('/:id/item/:itemId/prepared', auth, async (req, res) => {
  try {
    if (req.user.role !== 'kitchen' && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Only kitchen staff can mark items as prepared' });
    }
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const item = order.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: 'Order item not found' });
    }
    
    item.status = 'ready';
    
    const updatedOrder = await order.save();
    
    const populatedOrder = await Order.findById(updatedOrder._id)
      .populate('table', 'number status')
      .populate('waiter', 'name')
      .populate('items.menuItem', 'name albanianName category');
    
    res.json(populatedOrder);
  } catch (err) {
    console.error('Error marking item as prepared:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route   DELETE /api/orders/:id
// @desc    Cancel/delete order
// @access  Private (waiter who created it, manager)
router.delete('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Only waiter who created order or manager can delete
    if (req.user.role === 'waiter' && order.waiter.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    } else if (req.user.role !== 'waiter' && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    order.status = 'cancelled';
    await order.save();
    
    res.json({ message: 'Order cancelled successfully' });
  } catch (err) {
    console.error('Error cancelling order:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
