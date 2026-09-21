const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

// 1. Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 2. Core Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Serve static frontend assets directly from root and via /frontend alias
app.use(express.static(__dirname));
app.use('/frontend', express.static(path.join(__dirname, 'frontend')));

// 4. Health check endpoint - confirms API is running & reports MongoDB status
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    status: 'success',
    message: 'API is running',
    mongodb: isDbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// 5. API Routes
app.use('/api/products', require('./routes/productRoutes'));

// Fallback route for frontend HTML (serves index.html on root)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 404 Handler for undefined API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'API route not found'
  });
});

// 6. Connect to MongoDB before starting the Express server
const startServer = async () => {
  try {
    console.log('🔄 Connecting to MongoDB Atlas...');
    await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 Server successfully running on port ${PORT}`);
      console.log(`📡 Health Check URL: http://localhost:${PORT}/api/health`);
      console.log(`🌐 Frontend URL:     http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(`\n❌ [Server Startup Aborted] Could not start server: ${error.message}`);
    console.error('👉 Please review your .env configuration or consult README.md for MongoDB Atlas setup steps.\n');
    process.exit(1);
  }
};

startServer();
