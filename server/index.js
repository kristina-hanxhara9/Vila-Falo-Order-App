const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Connect to Database
connectDB();

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};

const io = socketIo(server, {
  cors: corsOptions
});

app.use(cors(corsOptions));
app.use(express.json());

// Socket handlers
require('./sockets/index')(io);

// API Routes
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/tables', require('./routes/api/tables'));
app.use('/api/menu', require('./routes/api/menu'));
app.use('/api/orders', require('./routes/api/orders'));
app.use('/api/reports', require('./routes/api/reports'));

// Health check endpoint - moved to /api/health only
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Vila Falo Restaurant Server is running!',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: 'connected',
      api: 'running'
    }
  });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
  app.use(express.static(clientBuildPath));

  // Catch all handler: send back React's index.html file for any non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  // Development mode - show server status at root
  app.get('/', (req, res) => {
    res.json({ 
      message: 'Vila Falo Restaurant Server is running in development!',
      status: 'OK',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: 'development'
    });
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));

module.exports = { io };
