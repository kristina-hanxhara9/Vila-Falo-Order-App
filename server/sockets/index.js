const Order = require('../models/Order');
const Table = require('../models/Table');

module.exports = (io) => {
  // Add socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      // Allow connection but track as unauthenticated
      socket.user = { authenticated: false };
      return next();
    }
    
    try {
      // You can import your jwt verification from auth middleware
      const jwt = require('jsonwebtoken');
      const config = require('../config/config');
      
      const decoded = jwt.verify(token, config.jwtSecret);
      socket.user = { 
        ...decoded, 
        authenticated: true 
      };
      next();
    } catch (err) {
      socket.user = { authenticated: false };
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log('New client connected', socket.id);
    
    // Track user authentication status
    const isAuthenticated = socket.user && socket.user.authenticated;
    const userRole = isAuthenticated ? socket.user.role : null;
    const userId = isAuthenticated ? socket.user._id : null;
    
    // If authenticated, auto-join appropriate role room
    if (isAuthenticated && userRole) {
      socket.join(userRole);
      console.log(`Authenticated user (${userId}) joined ${userRole} room automatically`);
      
      // Also join the legacy room name if different
      if (userRole === 'waiter') {
        socket.join('waiters');
      }
    }
    
    // Join room based on role - keep for backward compatibility
    socket.on('join-room', (room) => {
      // Only allow joining appropriate rooms based on role
      if (!isAuthenticated) {
        // Allow unauthenticated for now, but could restrict
        socket.join(room);
        console.log(`Unauthenticated socket ${socket.id} joined room: ${room}`);
      } else {
        // For authenticated users, validate room access
        if (
          room === userRole || 
          (userRole === 'manager') || // Managers can join any room
          (room === 'waiters' && userRole === 'waiter')
        ) {
          socket.join(room);
          console.log(`Authenticated socket ${socket.id} joined room: ${room}`);
        } else {
          // Emit error if trying to join unauthorized room
          socket.emit('error', { message: 'Unauthorized room access' });
        }
      }
    });
    
    // New order event
    socket.on('new-order', async (orderData) => {
      try {
        // Add creator info if authenticated
        if (isAuthenticated) {
          orderData.createdBy = userId;
        }
        
        // Broadcast to kitchen room
        io.to('kitchen').emit('order-received', orderData);
        
        // Update table status
        await Table.findByIdAndUpdate(orderData.table, { 
          status: 'ordering'
        });
        
        // Broadcast table update to waiters
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
        
        // Add updater info if authenticated
        const updateData = { 
          ...data,
          updatedBy: isAuthenticated ? userId : 'unknown'
        };
        
        // Update order item status
        const order = await Order.findById(orderId);
        if (order) {
          const item = order.items.id(itemId);
          if (item) {
            item.status = status;
            item.updatedBy = isAuthenticated ? userId : undefined;
            item.updatedAt = new Date();
            await order.save();
            
            // Broadcast update to relevant rooms
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
          
          // Add completer info if authenticated
          if (isAuthenticated) {
            order.completedBy = userId;
          }
          
          await order.save();
          
          // Update table status
          await Table.findByIdAndUpdate(order.table, {
            status: 'unpaid'
          });
          
          // Broadcast updates
          io.to('waiters').to('waiter').emit('order-completed', { 
            orderId, 
            completedBy: isAuthenticated ? userId : undefined,
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
        
        // Update order payment status with processor info
        await Order.findByIdAndUpdate(orderId, {
          paymentStatus: 'paid',
          paidAt: new Date(),
          processedBy: isAuthenticated ? userId : undefined
        });
        
        // Update table status
        await Table.findByIdAndUpdate(tableId, {
          status: 'free',
          currentOrder: null
        });
        
        // Create payment notification with processor info
        const paymentNotification = {
          orderId,
          tableId,
          processedBy: isAuthenticated ? userId : undefined,
          timestamp: new Date()
        };
        
        // Broadcast table update
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
        authenticated: isAuthenticated,
        user: isAuthenticated ? {
          id: userId,
          role: userRole
        } : null
      });
    });
    
    // Disconnect event
    socket.on('disconnect', () => {
      console.log('Client disconnected', socket.id);
    });
  });
};