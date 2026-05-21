/**
 * Centralized error handling for the application
 */

class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Standard API response format
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200, meta = null) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  if (meta) response.meta = meta;
  return res.status(statusCode).json(response);
};

const sendError = (res, error) => {
  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    message: error.message || 'Internal server error',
  };

  if (error.code) response.code = error.code;
  if (error.errors) response.errors = error.errors;

  // Don't expose stack trace or internal errors in production
  if (process.env.NODE_ENV === 'development' && !error.isOperational) {
    response.stack = error.stack;
  }

  return res.status(statusCode).json(response);
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  const logger = require('./logger');

  // Log the error
  if (err.isOperational) {
    logger.warn(`${err.statusCode} - ${err.message}`, {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
  } else {
    logger.error('Unhandled error:', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError' && err.errors) {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
    }));
    return sendError(res, new ValidationError('Validation failed', errors));
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return sendError(res, new ConflictError(`A record with this ${field} already exists`));
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return sendError(res, new NotFoundError('Resource'));
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, new UnauthorizedError('Invalid token'));
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, new UnauthorizedError('Token expired'));
  }

  // Default
  if (err.isOperational) {
    return sendError(res, err);
  }

  // Unknown error
  return sendError(res, new AppError(
    process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
    500
  ));
};

module.exports = {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  sendSuccess,
  sendError,
  errorHandler,
};
