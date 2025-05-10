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
    res.status(500).send('Gabim në server');
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
    res.status(500).send('Gabim në server');
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
      return res.status(404).json({ message: 'Porosia nuk u gjet' });
    }
    
    res.json(order);
  } catch (err) {
    console.error('Error getting order by ID:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Porosia nuk u gjet' });
    }
    res.status(500).send('Gabim në server');
  }
});

// @route   GET /api/orders/table/:tableId
// @desc    Get orders for a specific table
// @access  Private
router.get('/table/:tableId', auth, async (req, res) => {
  try {
    console.log('Getting orders for table:', req.params.tableId);
    const orders = await Order.find({ 
      table: req.params.tableId,
      status: { $in: ['active', 'completed'] }
    })
      .sort({ createdAt: -1 })
      .populate('table', 'number')
      .populate('waiter', 'name');
    
    console.log('Found orders:', orders.length);
    res.json(orders);
  } catch (err) {
    console.error('Error getting orders by table:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Porosia nuk u gjet' });
    }
    res.status(500).send('Gabim në server');
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
      return res.status(404).json({ message: 'Porosia nuk u gjet' });
    }
    res.status(500).send('Gabim në server');
  }
});

// @route   POST /api/orders
// @desc    Create a new order
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { tableId, items } = req.body;
    
    // Validate input
    if (!tableId || !items || items.length === 0) {
      return res.status(400).json({ message: 'Ju lutem plotësoni të gjitha fushat e kërkuara' });
    }
    
    // Check if table exists
    const table = await Table.findById(tableId);
    if (!table) {
      return res.status(404).json({ message: 'Tavolina nuk u gjet' });
    }
    
    // Calculate total amount
    const totalAmount = items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
    
    // Create new order
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
    
    // Update table status to "ordering" or "unpaid"
    table.status = table.status === 'free' ? 'ordering' : 'unpaid';
    table.currentOrder = order._id;
    await table.save();
    
    // Populate table and waiter info
    const populatedOrder = await Order.findById(order._id)
      .populate('table', 'number')
      .populate('waiter', 'name');
    
    // Emit socket events if available
    if (io) {
      io.emit('new-order', populatedOrder);
      io.emit('table-updated', table);
    }
    
    res.json(populatedOrder);
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).send('Gabim në server');
  }
});

// @route   PUT /api/orders/:id
// @desc    Update an order
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { items, status } = req.body;
    
    // Find the order
    let order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Porosia nuk u gjet' });
    }
    
    // Update order fields
    if (items) {
      order.items = items;
      
      // Recalculate total amount
      order.totalAmount = items.reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);
    }
    
    if (status) {
      order.status = status;
      
      // If order is completed, set completion date
      if (status === 'completed') {
        order.completedAt = Date.now();
      }
    }
    
    // Save order
    order = await order.save();
    
    // Populate table and waiter info
    const populatedOrder = await Order.findById(order._id)
      .populate('table', 'number')
      .populate('waiter', 'name');
    
    // Emit socket event if available
    if (io) {
      io.emit('order-updated', populatedOrder);
    }
    
    res.json(populatedOrder);
  } catch (err) {
    console.error('Error updating order:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Porosia nuk u gjet' });
    }
    res.status(500).send('Gabim në server');
  }
});

// @route   DELETE /api/orders/:id
// @desc    Delete an order
// @access  Private (manager only)
router.delete('/:id', auth, async (req, res) => {
  // Only managers can delete orders
  if (req.user.role !== 'manager') {
    return res.status(403).json({ message: 'Nuk keni akses në këtë funksion' });
  }
  
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Porosia nuk u gjet' });
    }
    
    // Update table status if this is the current order
    let updatedTable = null;
    const table = await Table.findById(order.table);
    
    if (table && table.currentOrder && table.currentOrder.toString() === req.params.id) {
      // Check if there are other active orders for this table
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
    
    // Emit socket events if available
    if (io) {
      io.emit('order-deleted', req.params.id);
      
      if (updatedTable) {
        io.emit('table-updated', updatedTable);
      }
    }
    
    res.json({ message: 'Porosia u fshi me sukses' });
  } catch (err) {
    console.error('Error deleting order:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Porosia nuk u gjet' });
    }
    res.status(500).send('Gabim në server');
  }
});

module.exports = router;