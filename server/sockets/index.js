const jwt = require('jsonwebtoken');
const config = require('../config/config');
const Order = require('../models/Order');
const Table = require('../models/Table');

module.exports = (io) => {
  // Reject unauthenticated socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      socket.user = { ...decoded, authenticated: true };
      next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userRole = socket.user.role;
    const userId = socket.user.id;

    // Auto-join appropriate role room
    if (userRole) {
      socket.join(userRole);
      if (userRole === 'waiter') {
        socket.join('waiters');
      }
    }

    // Join room based on role
    socket.on('join-room', (room) => {
      if (
        room === userRole ||
        userRole === 'manager' ||
        (room === 'waiters' && userRole === 'waiter')
      ) {
        socket.join(room);
      } else {
        socket.emit('error', { message: 'Unauthorized room access' });
      }
    });

    // New order event
    socket.on('new-order', async (orderData) => {
      try {
        orderData.createdBy = userId;

        io.to('kitchen').emit('order-received', orderData);

        await Table.findByIdAndUpdate(orderData.table, {
          status: 'ordering'
        });

        io.to('waiters').to('waiter').emit('table-updated', {
          tableId: orderData.table,
          status: 'ordering'
        });
      } catch (error) {
        console.error('Error handling new order:', error);
      }
    });

    // Order status update event
    socket.on('update-order-status', async (data) => {
      try {
        const { orderId, itemId, status } = data;

        const updateData = {
          ...data,
          updatedBy: userId
        };

        const order = await Order.findById(orderId);
        if (order) {
          const item = order.items.id(itemId);
          if (item) {
            item.status = status;
            item.updatedBy = userId;
            item.updatedAt = new Date();
            await order.save();

            io.to('kitchen').emit('order-item-updated', updateData);
            io.to('waiters').to('waiter').emit('order-item-updated', updateData);
          }
        }
      } catch (error) {
        console.error('Error updating order status:', error);
      }
    });

    // Order completion event
    socket.on('complete-order', async (orderId) => {
      try {
        const order = await Order.findById(orderId);
        if (order) {
          order.status = 'completed';
          order.completedAt = new Date();
          order.completedBy = userId;
          await order.save();

          await Table.findByIdAndUpdate(order.table, {
            status: 'unpaid'
          });

          io.to('waiters').to('waiter').emit('order-completed', {
            orderId,
            completedBy: userId,
            timestamp: new Date()
          });
          io.to('waiters').to('waiter').emit('table-updated', {
            tableId: order.table,
            status: 'unpaid'
          });
        }
      } catch (error) {
        console.error('Error completing order:', error);
      }
    });

    // Payment event
    socket.on('payment-received', async (data) => {
      try {
        const { orderId, tableId } = data;

        await Order.findByIdAndUpdate(orderId, {
          paymentStatus: 'paid',
          paidAt: new Date(),
          processedBy: userId
        });

        await Table.findByIdAndUpdate(tableId, {
          status: 'free',
          currentOrder: null
        });

        const paymentNotification = {
          orderId,
          tableId,
          processedBy: userId,
          timestamp: new Date()
        };

        io.to('waiters').to('waiter').emit('table-updated', {
          tableId,
          status: 'free'
        });

        io.to('manager').emit('payment-received', paymentNotification);
      } catch (error) {
        console.error('Error processing payment:', error);
      }
    });

    // Authentication status check
    socket.on('auth-status', () => {
      socket.emit('auth-status-response', {
        authenticated: true,
        user: { id: userId, role: userRole }
      });
    });

    socket.on('disconnect', () => {
      // Client disconnected
    });
  });
};
