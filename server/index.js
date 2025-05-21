const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Connect to Database
connectDB();

// CORS configuration - allow your frontend
const corsOptions = {
  origin: [
    'https://dry-cliffs-57282-2269f6e54282.herokuapp.com',
    'http://localhost:3000'
  ],
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

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Restaurant Order System API is running!' });
});

// Remove the static file serving for production
// Remove this entire block:
// if (process.env.NODE_ENV === 'production') { ... }

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));

module.exports = { io };
