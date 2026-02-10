const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const config = require('./config/config');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

// Validate required environment variables
if (!config.mongoURI) {
  console.error('FATAL: MONGO_URI environment variable is required');
  process.exit(1);
}
if (!config.jwtSecret) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && config.jwtSecret.length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters in production');
  process.exit(1);
}

const app = express();
const server = http.createServer(app);

// Connect to Database
connectDB();

// Security headers
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Keni bere shume kerkesa. Provoni perseri me vone.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Shume perpjekje per hyrje. Provoni perseri me vone.' }
});

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

// Apply rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/login', loginLimiter);

// Make io accessible to API routes via req.app.get('io')
app.set('io', io);

// Socket handlers
require('./sockets/index')(io);

// API Routes
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/tables', require('./routes/api/tables'));
app.use('/api/menu', require('./routes/api/menu'));
app.use('/api/orders', require('./routes/api/orders'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    message: 'Vila Falo Restaurant Server is running!',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
  app.use(express.static(clientBuildPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
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

const PORT = config.port;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));

module.exports = { io };
