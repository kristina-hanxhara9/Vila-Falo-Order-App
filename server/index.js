const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

// Initialize express app
const app = express();

// Create HTTP server and Socket.io
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Socket.io handling
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });

  socket.on('table-status-change', (data) => {
    console.log('Table status change:', data);
    io.emit('table-updated', data);
  });

  socket.on('new-order', (data) => {
    console.log('New order:', data);
    io.emit('new-order', data);
  });

  socket.on('order-status-change', (data) => {
    console.log('Order status change:', data);
    io.emit('order-updated', data);
  });
});

// Define Routes
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/tables', require('./routes/api/tables'));
app.use('/api/menu', require('./routes/api/menu'));
app.use('/api/orders', require('./routes/api/orders'));
app.use('/api/reports', require('./routes/api/reports'));

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
  app.use(express.static(clientBuildPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({
    message: 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));

// Export io instance
module.exports = { io };
