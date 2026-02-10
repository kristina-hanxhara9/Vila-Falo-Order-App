const express = require('express');
const router = express.Router();
const Order = require('../../models/Order');
const Table = require('../../models/Table');
const MenuItem = require('../../models/MenuItem');
const auth = require('../../middleware/auth');

const hasAccess = (user) => {
  return user.role === 'manager' || user.role === 'waiter' || user.role === 'kitchen';
};

// @route   GET /api/orders
// @desc    Get all orders (kitchen and manager view)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'kitchen') {
      query.status = 'active';
    }

    if (req.user.role === 'waiter') {
      query.waiter = req.user.id;
    }

    const orders = await Order.find(query)
      .populate('table', 'number status')
      .populate('waiter', 'name')
      .populate('items.menuItem', 'name albanianName category')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err.message);
    res.status(500).json({ message: 'Gabim ne server' });
  }
});

// @route   GET /api/orders/active
// @desc    Get only active orders
// @access  Private
router.get('/active', auth, async (req, res) => {
  try {
    let query = { status: 'active' };

    if (req.user.role === 'waiter') {
      query.waiter = req.user.id;
    }

    const orders = await Order.find(query)
      .populate('table', 'number status')
      .populate('waiter', 'name')
      .populate('items.menuItem', 'name albanianName category')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error('Error fetching active orders:', err.message);
    res.status(500).json({ message: 'Gabim ne server' });
  }
});

// @route   GET /api/orders/reports/summary
// @desc    Get aggregated report data for date range (manager only)
// @access  Private
router.get('/reports/summary', auth, async (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required' });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end }
    }).populate('items.menuItem', 'name albanianName category');

    const paidOrders = orders.filter(o => o.paymentStatus === 'paid');
    const totalSales = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    // Sales by day
    const salesByDay = {};
    paidOrders.forEach(order => {
      const date = new Date(order.createdAt).toISOString().split('T')[0];
      salesByDay[date] = (salesByDay[date] || 0) + order.totalAmount;
    });
    const salesByDayArray = Object.entries(salesByDay)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Order counts
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const canceledOrders = orders.filter(o => o.status === 'cancelled').length;

    // Items and categories
    const itemsSold = {};
    const categoriesSold = {};
    paidOrders.forEach(order => {
      order.items.forEach(item => {
        const menuItem = item.menuItem;
        const itemName = menuItem ? (menuItem.albanianName || menuItem.name) : 'Te tjera';
        const categoryName = menuItem ? menuItem.category : 'te tjera';
        const quantity = item.quantity;
        const totalPrice = item.price * quantity;

        if (!itemsSold[itemName]) {
          itemsSold[itemName] = { name: itemName, quantity: 0, revenue: 0, category: categoryName };
        }
        itemsSold[itemName].quantity += quantity;
        itemsSold[itemName].revenue += totalPrice;

        if (!categoriesSold[categoryName]) {
          categoriesSold[categoryName] = { name: categoryName, quantity: 0, revenue: 0 };
        }
        categoriesSold[categoryName].quantity += quantity;
        categoriesSold[categoryName].revenue += totalPrice;
      });
    });

    res.json({
      sales: { total: totalSales, byDay: salesByDayArray },
      orders: { total: orders.length, completed: completedOrders, canceled: canceledOrders },
      items: Object.values(itemsSold).sort((a, b) => b.revenue - a.revenue),
      categories: Object.values(categoriesSold).sort((a, b) => b.revenue - a.revenue)
    });
  } catch (err) {
    console.error('Error generating report:', err.message);
    res.status(500).json({ message: 'Gabim ne server' });
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

    if (req.user.role === 'waiter' && order.waiter._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(order);
  } catch (err) {
    console.error('Error fetching order:', err.message);
    res.status(500).json({ message: 'Gabim ne server' });
  }
});

// @route   POST /api/orders
// @desc    Create new order
// @access  Private (waiter)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'waiter' && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Only waiters and managers can create orders' });
    }

    const { table, items } = req.body;

    if (!table || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Table ID and items array are required' });
    }

    const tableExists = await Table.findById(table);
    if (!tableExists) {
      return res.status(404).json({ message: 'Table not found' });
    }

    const processedItems = [];
    let totalAmount = 0;

    for (const item of items) {
      let processedItem = {
        quantity: parseInt(item.quantity) || 1,
        price: parseFloat(item.price) || 0,
        notes: item.notes || '',
        status: 'pending'
      };

      if (item.custom) {
        processedItem.name = item.name;
        processedItem.custom = true;

        const tempMenuItem = new MenuItem({
          name: item.name,
          albanianName: item.name,
          category: 'custom',
          price: processedItem.price,
          description: 'Custom item',
          available: false
        });

        const savedTempItem = await tempMenuItem.save();
        processedItem.menuItem = savedTempItem._id;
      } else {
        if (!item.menuItem) {
          return res.status(400).json({ message: 'Menu item ID is required for non-custom items' });
        }

        const menuItem = await MenuItem.findById(item.menuItem);
        if (!menuItem) {
          return res.status(404).json({ message: 'Menu item not found' });
        }

        processedItem.menuItem = item.menuItem;
        if (processedItem.price === 0) {
          processedItem.price = menuItem.price;
        }
      }

      if (processedItem.quantity <= 0 || processedItem.price < 0) {
        return res.status(400).json({ message: 'Invalid item quantity or price' });
      }

      totalAmount += processedItem.price * processedItem.quantity;
      processedItems.push(processedItem);
    }

    const order = new Order({
      table,
      waiter: req.user.id,
      items: processedItems,
      totalAmount,
      status: 'active',
      paymentStatus: 'unpaid'
    });

    const savedOrder = await order.save();

    const populatedOrder = await Order.findById(savedOrder._id)
      .populate('table', 'number status')
      .populate('waiter', 'name')
      .populate('items.menuItem', 'name albanianName category price');

    // Notify kitchen and manager of new order
    const io = req.app.get('io');
    if (io) {
      io.to('kitchen').emit('new-order', populatedOrder);
      io.to('manager').emit('order-received', populatedOrder);
      io.to('kitchen').emit('order-updated', populatedOrder);
    }

    res.status(201).json(populatedOrder);
  } catch (err) {
    console.error('Error creating order:', err.message);
    res.status(500).json({ message: 'Gabim ne server' });
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

    // Notify all roles of order update
    const io = req.app.get('io');
    if (io) {
      io.to('kitchen').emit('order-updated', populatedOrder);
      io.to('waiters').to('waiter').emit('order-updated', populatedOrder);
      io.to('manager').emit('order-updated', populatedOrder);
      if (status === 'completed') {
        io.to('waiters').to('waiter').emit('order-completed', {
          orderId: populatedOrder._id,
          timestamp: new Date()
        });
      }
    }

    res.json(populatedOrder);
  } catch (err) {
    console.error('Error updating order:', err.message);
    res.status(500).json({ message: 'Gabim ne server' });
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

    // Notify waiter that their order is ready
    const io = req.app.get('io');
    if (io) {
      io.to('waiters').to('waiter').emit('order-completed', {
        orderId: populatedOrder._id,
        tableNumber: populatedOrder.table?.number,
        timestamp: new Date()
      });
      io.to('waiters').to('waiter').emit('order-updated', populatedOrder);
      io.to('manager').emit('order-updated', populatedOrder);
    }

    res.json(populatedOrder);
  } catch (err) {
    console.error('Error marking order as prepared:', err.message);
    res.status(500).json({ message: 'Gabim ne server' });
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

    // Notify waiter that an item is ready
    const io = req.app.get('io');
    if (io) {
      io.to('waiters').to('waiter').emit('order-item-updated', {
        orderId: req.params.id,
        itemId: req.params.itemId,
        status: 'ready'
      });
      io.to('waiters').to('waiter').emit('order-updated', populatedOrder);
      io.to('manager').emit('order-item-updated', {
        orderId: req.params.id,
        itemId: req.params.itemId,
        status: 'ready'
      });
    }

    res.json(populatedOrder);
  } catch (err) {
    console.error('Error marking item as prepared:', err.message);
    res.status(500).json({ message: 'Gabim ne server' });
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

    if (req.user.role === 'waiter' && order.waiter.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    } else if (req.user.role !== 'waiter' && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Access denied' });
    }

    order.status = 'cancelled';
    await order.save();

    // Notify kitchen and manager of cancellation
    const io = req.app.get('io');
    if (io) {
      io.to('kitchen').emit('order-updated', { _id: req.params.id, status: 'cancelled' });
      io.to('manager').emit('order-updated', { _id: req.params.id, status: 'cancelled' });
    }

    res.json({ message: 'Order cancelled successfully' });
  } catch (err) {
    console.error('Error cancelling order:', err.message);
    res.status(500).json({ message: 'Gabim ne server' });
  }
});

module.exports = router;
