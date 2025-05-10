// routes/api/reports.js
const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const mongoose = require('mongoose');
const Order = require('../../models/Order');
const Table = require('../../models/Table');

/**
 * @route   GET api/reports/daily
 * @desc    Get daily report
 * @access  Private
 */
router.get('/daily', auth, async (req, res) => {
  try {
    // Get today's date (start and end)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Find orders for today
    const orders = await Order.find({
      createdAt: {
        $gte: today,
        $lt: tomorrow
      }
    })
    .populate('table')
    .populate('waiter')
    .populate('items.menuItem')
    .sort({ createdAt: -1 });
    
    // Calculate stats
    const totalOrders = orders.length;
    const completedOrders = orders.filter(order => order.status === 'completed').length;
    
    const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const paidAmount = orders
      .filter(order => order.paymentStatus === 'paid')
      .reduce((sum, order) => sum + order.totalAmount, 0);
    
    // Return report data
    res.json({
      totalOrders,
      completedOrders,
      totalAmount,
      paidAmount,
      orders
    });
  } catch (err) {
    console.error('Error getting daily report:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET api/reports/custom
 * @desc    Get report for custom date range
 * @access  Private
 */
router.get('/custom', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }
    
    // Parse dates
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    // Find orders for the date range
    const orders = await Order.find({
      createdAt: {
        $gte: start,
        $lte: end
      }
    })
    .populate('table')
    .populate('waiter')
    .populate('items.menuItem')
    .sort({ createdAt: -1 });
    
    // Calculate stats
    const totalOrders = orders.length;
    const completedOrders = orders.filter(order => order.status === 'completed').length;
    
    const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const paidAmount = orders
      .filter(order => order.paymentStatus === 'paid')
      .reduce((sum, order) => sum + order.totalAmount, 0);
    
    // Return report data
    res.json({
      totalOrders,
      completedOrders,
      totalAmount,
      paidAmount,
      orders,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    });
  } catch (err) {
    console.error('Error getting custom report:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET api/reports/tables
 * @desc    Get table usage report
 * @access  Private
 */
router.get('/tables', auth, async (req, res) => {
  try {
    // Get tables with current status
    const tables = await Table.find().sort({ number: 1 });
    
    // Get order data for tables
    const orders = await Order.find()
      .populate('table')
      .sort({ createdAt: -1 });
    
    // Calculate table usage
    const tableUsage = tables.map(table => {
      // Filter orders for this table
      const tableOrders = orders.filter(order => 
        order.table && order.table._id.toString() === table._id.toString()
      );
      
      // Calculate stats
      return {
        _id: table._id,
        number: table.number,
        name: table.name,
        capacity: table.capacity,
        status: table.status,
        currentOrder: table.currentOrder,
        orderCount: tableOrders.length,
        totalRevenue: tableOrders.reduce((sum, order) => sum + order.totalAmount, 0),
        lastOrderDate: tableOrders.length > 0 ? tableOrders[0].createdAt : null
      };
    });
    
    res.json(tableUsage);
  } catch (err) {
    console.error('Error getting table usage report:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET api/reports/tables/history
 * @desc    Get table status history
 * @access  Private
 */
router.get('/tables/history', auth, async (req, res) => {
  try {
    // Generate table history data based on orders
    const tables = await Table.find();
    const orders = await Order.find().sort({ createdAt: 1 });
    
    // Generate history data
    const tableHistory = {};
    
    // Initialize with all tables as free
    tables.forEach(table => {
      tableHistory[table._id] = [{
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // One week ago
        status: 'free',
        updatedBy: 'System'
      }];
    });
    
    // Add status changes based on order creation and completion
    orders.forEach(order => {
      if (!order.table) return;
      
      const tableId = order.table.toString();
      
      // When order is created, table goes to "ordering" or "unpaid"
      if (!tableHistory[tableId]) {
        tableHistory[tableId] = [];
      }
      
      tableHistory[tableId].push({
        timestamp: order.createdAt,
        status: 'unpaid',
        updatedBy: order.waiter ? 'Waiter' : 'System'
      });
      
      // When order is completed, table goes to "paid" or "free"
      if (order.status === 'completed' && order.completedAt) {
        tableHistory[tableId].push({
          timestamp: order.completedAt,
          status: 'paid',
          updatedBy: order.waiter ? 'Waiter' : 'System'
        });
        
        // Add a "free" status change 30 minutes after completion
        const freeTime = new Date(order.completedAt);
        freeTime.setMinutes(freeTime.getMinutes() + 30);
        
        if (freeTime < new Date()) { // Only if in the past
          tableHistory[tableId].push({
            timestamp: freeTime,
            status: 'free',
            updatedBy: 'System'
          });
        }
      }
    });
    
    // Sort history for each table by timestamp
    for (const tableId in tableHistory) {
      tableHistory[tableId].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
    }
    
    res.json(tableHistory);
  } catch (err) {
    console.error('Error getting table history:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET api/reports/revenue
 * @desc    Get revenue report
 * @access  Private
 */
router.get('/revenue', auth, async (req, res) => {
  try {
    // Get time period (default to last 7 days)
    const { period } = req.query;
    let startDate = new Date();
    
    // Set start date based on period
    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7); // Default to week
    }
    
    // Find orders for the period
    const orders = await Order.find({
      createdAt: { $gte: startDate },
      paymentStatus: 'paid' // Only count paid orders for revenue
    });
    
    // Calculate total revenue
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    
    // Group by date for time series data
    const revenueByDate = {};
    
    orders.forEach(order => {
      const date = new Date(order.createdAt).toISOString().split('T')[0];
      
      if (!revenueByDate[date]) {
        revenueByDate[date] = 0;
      }
      
      revenueByDate[date] += order.totalAmount;
    });
    
    // Convert to array for frontend
    const revenueData = Object.keys(revenueByDate).map(date => ({
      date,
      revenue: revenueByDate[date]
    })).sort((a, b) => a.date.localeCompare(b.date));
    
    res.json({
      totalRevenue,
      revenueData,
      period
    });
  } catch (err) {
    console.error('Error getting revenue report:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET api/reports/orders
 * @desc    Get orders report
 * @access  Private
 */
router.get('/orders', auth, async (req, res) => {
  try {
    // Get time period (default to last 30 days)
    const { period } = req.query;
    let startDate = new Date();
    
    // Set start date based on period
    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30); // Default to 30 days
    }
    
    // Find orders for the period
    const orders = await Order.find({
      createdAt: { $gte: startDate }
    })
    .populate('table')
    .populate('waiter')
    .sort({ createdAt: -1 });
    
    // Calculate stats
    const totalOrders = orders.length;
    const completedOrders = orders.filter(order => order.status === 'completed').length;
    const cancelledOrders = orders.filter(order => order.status === 'cancelled').length;
    const activeOrders = orders.filter(order => order.status === 'active').length;
    
    const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const paidAmount = orders
      .filter(order => order.paymentStatus === 'paid')
      .reduce((sum, order) => sum + order.totalAmount, 0);
    
    // Group by day
    const ordersByDay = {};
    
    orders.forEach(order => {
      const date = new Date(order.createdAt).toISOString().split('T')[0];
      
      if (!ordersByDay[date]) {
        ordersByDay[date] = {
          count: 0,
          revenue: 0
        };
      }
      
      ordersByDay[date].count += 1;
      ordersByDay[date].revenue += order.totalAmount;
    });
    
    // Convert to array for frontend
    const orderData = Object.keys(ordersByDay).map(date => ({
      date,
      count: ordersByDay[date].count,
      revenue: ordersByDay[date].revenue
    })).sort((a, b) => a.date.localeCompare(b.date));
    
    // Popular menu items
    const itemCounts = {};
    
    orders.forEach(order => {
      order.items.forEach(item => {
        const itemId = item.menuItem ? item.menuItem.toString() : 'unknown';
        const itemName = item.name || 'Unknown Item';
        
        if (!itemCounts[itemId]) {
          itemCounts[itemId] = {
            id: itemId,
            name: itemName,
            count: 0,
            revenue: 0
          };
        }
        
        itemCounts[itemId].count += item.quantity;
        itemCounts[itemId].revenue += item.price * item.quantity;
      });
    });
    
    // Convert to array and sort by count
    const popularItems = Object.values(itemCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10
    
    // Waiter performance
    const waiterStats = {};
    
    orders.forEach(order => {
      if (!order.waiter) return;
      
      const waiterId = order.waiter.toString();
      const waiterName = order.waiter.name || 'Unknown Waiter';
      
      if (!waiterStats[waiterId]) {
        waiterStats[waiterId] = {
          id: waiterId,
          name: waiterName,
          orderCount: 0,
          revenue: 0
        };
      }
      
      waiterStats[waiterId].orderCount += 1;
      waiterStats[waiterId].revenue += order.totalAmount;
    });
    
    // Convert to array and sort by revenue
    const waiterPerformance = Object.values(waiterStats)
      .sort((a, b) => b.revenue - a.revenue);
    
    res.json({
      totalOrders,
      completedOrders,
      cancelledOrders,
      activeOrders,
      totalAmount,
      paidAmount,
      orderData,
      popularItems,
      waiterPerformance,
      period
    });
  } catch (err) {
    console.error('Error getting orders report:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET api/reports/dashboard
 * @desc    Get dashboard summary data
 * @access  Private
 */
router.get('/dashboard', auth, async (req, res) => {
  try {
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Find today's orders
    const todayOrders = await Order.find({
      createdAt: {
        $gte: today,
        $lt: tomorrow
      }
    });
    
    // Find yesterday's orders for comparison
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const yesterdayOrders = await Order.find({
      createdAt: {
        $gte: yesterday,
        $lt: today
      }
    });
    
    // Get active orders
    const activeOrders = await Order.find({ status: 'active' })
      .populate('table')
      .populate('waiter')
      .sort({ createdAt: 1 });
    
    // Get table status
    const tables = await Table.find();
    
    const tableStatus = {
      total: tables.length,
      free: tables.filter(table => table.status === 'free').length,
      ordering: tables.filter(table => table.status === 'ordering').length,
      unpaid: tables.filter(table => table.status === 'unpaid').length,
      paid: tables.filter(table => table.status === 'paid').length
    };
    
    // Calculate today's revenue
    const todayRevenue = todayOrders
      .filter(order => order.paymentStatus === 'paid')
      .reduce((sum, order) => sum + order.totalAmount, 0);
    
    // Calculate yesterday's revenue for comparison
    const yesterdayRevenue = yesterdayOrders
      .filter(order => order.paymentStatus === 'paid')
      .reduce((sum, order) => sum + order.totalAmount, 0);
    
    // Recent completed orders
    const recentOrders = await Order.find({ status: 'completed' })
      .populate('table')
      .populate('waiter')
      .sort({ completedAt: -1 })
      .limit(5);
    
    res.json({
      todayStats: {
        orderCount: todayOrders.length,
        revenue: todayRevenue,
        activeOrders: activeOrders.length,
        completedOrders: todayOrders.filter(order => order.status === 'completed').length,
        percentChange: yesterdayOrders.length > 0 
          ? ((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length) * 100 
          : 0,
        revenueChange: yesterdayRevenue > 0 
          ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
          : 0
      },
      tableStatus,
      activeOrders,
      recentOrders
    });
  } catch (err) {
    console.error('Error getting dashboard data:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET api/reports/items
 * @desc    Get menu item performance report
 * @access  Private
 */
router.get('/items', auth, async (req, res) => {
  try {
    // Get time period (default to last 30 days)
    const { period, limit } = req.query;
    const itemLimit = limit ? parseInt(limit) : 50; // Default to top 50 items
    
    let startDate = new Date();
    
    // Set start date based on period
    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30); // Default to 30 days
    }
    
    // Find orders for the period
    const orders = await Order.find({
      createdAt: { $gte: startDate }
    });
    
    // Analyze item performance
    const itemStats = {};
    
    orders.forEach(order => {
      order.items.forEach(item => {
        const itemId = item.menuItem ? item.menuItem.toString() : 'unknown';
        const itemName = item.name || 'Unknown Item';
        
        if (!itemStats[itemId]) {
          itemStats[itemId] = {
            id: itemId,
            name: itemName,
            quantity: 0,
            revenue: 0,
            orderCount: 0
          };
        }
        
        itemStats[itemId].quantity += item.quantity;
        itemStats[itemId].revenue += item.price * item.quantity;
        itemStats[itemId].orderCount += 1;
      });
    });
    
    // Convert to array for sorting
    const itemArray = Object.values(itemStats);
    
    // Sort by quantity (most popular)
    const mostPopular = [...itemArray]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, itemLimit);
    
    // Sort by revenue (most profitable)
    const mostProfitable = [...itemArray]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, itemLimit);
    
    res.json({
      mostPopular,
      mostProfitable,
      totalItems: itemArray.length,
      period
    });
  } catch (err) {
    console.error('Error getting item report:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;