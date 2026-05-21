const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

let io = null;

const initSocket = (httpServer) => {
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map(origin => origin.trim());

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId || decoded.adminId || decoded.id;
      socket.userRole = decoded.role;
      socket.isAdmin = !!decoded.isAdmin;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    socket.join(`user:${userId}`);
    logger.info(`Socket connected: user=${userId}`);

    if (socket.userRole === 'admin') {
      socket.join('room:admins');
    }

    // Subscribe to per-booking room (used by chat + live timeline)
    socket.on('booking:subscribe', async (bookingId) => {
      try {
        if (!bookingId || typeof bookingId !== 'string') return;
        // Authorize: customer or provider on the booking, or admin
        const Booking = require('../models/Booking');
        const booking = await Booking.findById(bookingId).select('customer provider').lean();
        if (!booking) return;
        const uid = String(socket.userId);
        const isParticipant =
          String(booking.customer) === uid ||
          String(booking.provider) === uid ||
          socket.isAdmin;
        if (!isParticipant) return;
        socket.join(`booking:${bookingId}`);
      } catch (e) {
        logger.warn('booking:subscribe failed: ' + e.message);
      }
    });

    socket.on('booking:unsubscribe', (bookingId) => {
      if (!bookingId) return;
      socket.leave(`booking:${bookingId}`);
    });

    // Typing indicator (transient, not persisted)
    socket.on('chat:typing', ({ bookingId, isTyping }) => {
      if (!bookingId) return;
      socket.to(`booking:${bookingId}`).emit('chat:typing', {
        bookingId,
        userId: socket.userId,
        isTyping: !!isTyping
      });
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: user=${userId}`);
    });
  });

  logger.info('Socket.io initialized');
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Emit notification to a specific user
const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

// Emit to all admins
const emitToAdmins = (event, data) => {
  if (io) {
    io.to('room:admins').emit(event, data);
  }
};

// Emit to a per-booking room (chat + live timeline)
const emitToBooking = (bookingId, event, data) => {
  if (io && bookingId) {
    io.to(`booking:${bookingId}`).emit(event, data);
  }
};

module.exports = { initSocket, getIO, emitToUser, emitToAdmins, emitToBooking };
