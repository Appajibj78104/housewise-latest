const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xssSanitize = require('./middleware/xssSanitize');
const path = require('path');
const dns = require('dns');
const logger = require('./config/logger');
const { errorHandler } = require('./config/errorHandler');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Override DNS resolution to use Google Public DNS (8.8.8.8)
// Fixes local DNS resolver timeouts when connecting to MongoDB Atlas
const resolver = new dns.Resolver();
resolver.setServers(['8.8.8.8', '8.8.4.4']);
const originalLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
  if (typeof options === 'function') { callback = options; options = {}; }
  if (hostname && hostname.endsWith('.mongodb.net')) {
    resolver.resolve4(hostname, (err, addresses) => {
      if (err) return originalLookup.call(dns, hostname, options, callback);
      callback(null, addresses[0], 4);
    });
  } else {
    originalLookup.call(dns, hostname, options, callback);
  }
};

const app = express();

// Disable ETag to prevent stale 304 responses in development
app.set('etag', false);

// CORS — environment-based origins
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000')
  .split(',')
  .map(origin => origin.trim());

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200,
  maxAge: 86400, // Preflight cache 24h
}));

// Security middleware
app.use(helmet());

// Body parsing — before sanitization
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Sanitize data — prevent NoSQL injection & XSS
app.use(mongoSanitize({ replaceWith: '_' }));
app.use(xssSanitize);

// GZIP compression — compress responses > 1KB
app.use(compression({ level: 6, threshold: 1024 }));

// Rate limiting (more permissive for development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 500 : 2000,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// HTTP Request logging via Winston
app.use(morgan(
  process.env.NODE_ENV === 'production' ? 'short' : 'dev',
  { stream: logger.stream }
));

// Slow query warning (dev only)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      if (ms > 800 && req.path.startsWith('/api/')) {
        logger.warn(`[SLOW] ${req.method} ${req.path} — ${ms.toFixed(0)}ms`);
      }
    });
    next();
  });
}

// Serve static files from uploads directory with caching
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  immutable: true,
}));

// Database connection with retry
const connectDB = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/housewife-services', {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 30000,
        maxPoolSize: 20,
        minPoolSize: 5,
        maxIdleTimeMS: 30000,
        family: 4,
      });
      logger.info('Connected to MongoDB');
      return;
    } catch (err) {
      logger.error(`MongoDB connection attempt ${i + 1}/${retries} failed: ${err.message}`);
      if (i < retries - 1) {
        const delay = Math.min(2000 * (i + 1), 10000);
        logger.info(`Retrying in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        logger.error('All MongoDB connection attempts failed.');
        process.exit(1);
      }
    }
  }
};
connectDB();

// Routes — versioned under /api/v1 with backward-compat aliases
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const servicesRoutes = require('./routes/services');
const bookingsRoutes = require('./routes/bookings');
const reviewsRoutes = require('./routes/reviews');
const adminRoutes = require('./routes/admin');
const providerRoutes = require('./routes/provider');
const customerRoutes = require('./routes/customer');
const notificationsRoutes = require('./routes/notifications');
const referralRoutes = require('./routes/referrals');
const gamificationRoutes = require('./routes/gamification');
const recommendationsRoutes = require('./routes/recommendations');
const invoiceRoutes = require('./routes/invoices');
const reviewAutomationRoutes = require('./routes/reviewAutomation');
const chatRoutes = require('./routes/chat');
const quoteRoutes = require('./routes/quotes');

// API v1 routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/services', servicesRoutes);
app.use('/api/v1/bookings', bookingsRoutes);
app.use('/api/v1/reviews', reviewsRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/provider', providerRoutes);
app.use('/api/v1/customer', customerRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/referrals', referralRoutes);
app.use('/api/v1/gamification', gamificationRoutes);
app.use('/api/v1/recommendations', recommendationsRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/review-automation', reviewAutomationRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/quotes', quoteRoutes);

// Backward-compatible /api/* routes (alias to v1)
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/provider', providerRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/review-automation', reviewAutomationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/quotes', quoteRoutes);

// app.use('/api/upload', require('./routes/upload')); // Temporarily disabled

// Upload error handling middleware
const { handleMulterError } = require('./middleware/upload');
app.use(handleMulterError);

// Health check endpoint (enhanced)
app.get('/api/health', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStates = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  
  const healthData = {
    status: dbState === 1 ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: require('./package.json').version,
    uptime: Math.floor(process.uptime()),
    database: {
      status: dbStates[dbState] || 'unknown',
      connected: dbState === 1,
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
    },
  };

  const statusCode = dbState === 1 ? 200 : 503;
  res.status(statusCode).json(healthData);
});
app.get('/api/v1/health', (req, res) => res.redirect('/api/health'));

// Global error handler (centralized)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

const PORT = process.env.PORT || 5000;

// Create HTTP server and attach Socket.io
const http = require('http');
const { initSocket } = require('./config/socket');
const server = http.createServer(app);
initSocket(server);

// Start booking reminder scheduler + recurring + badge evaluator
require('./jobs/bookingReminders');
require('./jobs/recurringBookings');
require('./jobs/badgeEvaluator');

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`API versioned: /api/v1/* (with /api/* backward compat)`);
  logger.info(`Socket.io enabled for real-time notifications`);
});

module.exports = { app, server };
