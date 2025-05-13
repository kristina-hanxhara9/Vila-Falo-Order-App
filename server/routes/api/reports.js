const express = require('express');
const router = express.Router();
const Order = require('../../models/Order');
const Table = require('../../models/Table');
const auth = require('../../middleware/auth');
let io;

try {
  // Try to import the socket.io instance from server.js
  const server = require('../../server');
  io = server.io;
} catch (err) {
  console.log('Socket.io not available for orders routes');
}

// @route   GET /api/orders
// @desc    Get all orders
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('table', 'number')
      .populate('waiter', 'name');
    
    res.json(orders);
  } catch (err) {
    console.error('Error getting orders:', err);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/orders/active
// @desc    Get all active orders (not completed or cancelled)
// @access  Private
router.get('/active', auth, async (req, res) => {
  try {
    const orders = await Order.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .populate('table', 'number')
      .populate('waiter', 'name');
    
    res.json(orders);
  } catch (err) {
    console.error('Error getting active orders:', err);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('table', 'number')
      .populate('waiter', 'name');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(order);
  } catch (err) {
    console.error('Error getting order by ID:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   GET /api/orders/table/:tableId
// @desc    Get orders for a specific table
// @access  Private
router.get('/table/:tableId', auth, async (req, res) => {
  try {
    const orders = await Order.find({ 
      table: req.params.tableId,
      status: { $in: ['active', 'completed'] }
    })
      .sort({ createdAt: -1 })
      .populate('table', 'number')
      .populate('waiter', 'name');
    
    res.json(orders);
  } catch (err) {
    console.error('Error getting orders by table:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Order not found for table' });
    }
    res.status(500).send('Server error');
  }
});

// @route   GET /api/orders/waiter/:waiterId
// @desc    Get orders for a specific waiter
// @access  Private
router.get('/waiter/:waiterId', auth, async (req, res) => {
  try {
    const orders = await Order.find({ waiter: req.params.waiterId })
      .sort({ createdAt: -1 })
      .populate('table', 'number')
      .populate('waiter', 'name');
    
    res.json(orders);
  } catch (err) {
    console.error('Error getting orders by waiter:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Order not found for waiter' });
    }
    res.status(500).send('Server error');
  }
});

// @route   POST /api/orders
// @desc    Create a new order
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { tableId, items } = req.body;
    
    if (!tableId || !items || items.length === 0) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    
    const table = await Table.findById(tableId);
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }
    
    const totalAmount = items.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    const newOrder = new Order({
      table: tableId,
      waiter: req.user.id,
      items: items.map(item => ({
        menuItem: item.menuItem,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes || ''
      })),
      totalAmount
    });
    
    const order = await newOrder.save();
    
    table.status = table.status === 'free' ? 'ordering' : 'unpaid';
    table.currentOrder = order._id;
    await table.save();
    
    const populatedOrder = await Order.findById(order._id)
      .populate('table', 'number')
      .populate('waiter', 'name');
    
    if (io) {
      io.emit('new-order', populatedOrder);
      io.emit('table-updated', table);
    }
    
    res.json(populatedOrder);
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/orders/:id
// @desc    Update an order
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { items, status } = req.body;
    
    let order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    if (items) {
      order.items = items;
      order.totalAmount = items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }
    
    if (status) {
      order.status = status;
      if (status === 'completed') {
        order.completedAt = Date.now();
      }
    }
    
    order = await order.save();
    
    const populatedOrder = await Order.findById(order._id)
      .populate('table', 'number')
      .populate('waiter', 'name');
    
    if (io) {
      io.emit('order-updated', populatedOrder);
    }
    
    res.json(populatedOrder);
  } catch (err) {
    console.error('Error updating order:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/orders/:id
// @desc    Delete an order
// @access  Private (manager only)
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    let updatedTable = null;
    const table = await Table.findById(order.table);
    
    if (table && table.currentOrder && table.currentOrder.toString() === req.params.id) {
      const activeOrders = await Order.find({
        table: order.table,
        status: 'active',
        _id: { $ne: order._id }
      });
      
      if (activeOrders.length === 0) {
        table.status = 'free';
        table.currentOrder = null;
        updatedTable = await table.save();
      }
    }
    
    await Order.findByIdAndDelete(req.params.id);
    
    if (io) {
      io.emit('order-deleted', req.params.id);
      if (updatedTable) {
        io.emit('table-updated', updatedTable);
      }
    }
    
    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    console.error('Error deleting order:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;
