const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ── In-memory user cache (avoids DB hit on every request) ──
const userCache = new Map();
const USER_CACHE_TTL = 60_000; // 60 seconds

function getCachedUser(userId) {
  const entry = userCache.get(userId);
  if (entry && Date.now() - entry.ts < USER_CACHE_TTL) return entry.user;
  if (entry) userCache.delete(userId);
  return null;
}

function setCachedUser(userId, user) {
  // Cap cache at 500 entries
  if (userCache.size > 500) {
    const oldest = userCache.keys().next().value;
    userCache.delete(oldest);
  }
  userCache.set(userId, { user, ts: Date.now() });
}

function invalidateUserCache(userId) {
  if (userId) userCache.delete(userId.toString());
  else userCache.clear();
}

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Try cache first, then DB
    let user = getCachedUser(decoded.userId);
    if (!user) {
      user = await User.findById(decoded.userId).select('-password').lean();
      if (user) {
        user.id = user._id.toString(); // restore mongoose virtual
        setCachedUser(decoded.userId, user);
      }
    }
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token - user not found' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Account is deactivated' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
};

// Middleware to check if user is housewife
const requireHousewife = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  if (req.user.role !== 'housewife') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Housewife role required' 
    });
  }

  next();
};

// Middleware to check if user is customer
const requireCustomer = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  if (req.user.role !== 'customer') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Customer role required' 
    });
  }

  next();
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Check for isAdmin flag in JWT token (for hard-coded admin)
  if (!req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required'
    });
  }

  next();
};

// Middleware to check resource ownership
const checkResourceOwnership = (resourceModel, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      const Model = require(`../models/${resourceModel}`);
      
      const resource = await Model.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({ 
          success: false, 
          message: `${resourceModel} not found` 
        });
      }

      // Check if user owns the resource or is admin
      const isOwner = resource.customer?.toString() === req.user._id.toString() ||
                     resource.provider?.toString() === req.user._id.toString() ||
                     resource.user?.toString() === req.user._id.toString();

      if (!isOwner && req.user.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied. You can only access your own resources' 
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Resource ownership check error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error checking resource ownership' 
      });
    }
  };
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticateToken,
  requireHousewife,
  requireCustomer,
  requireAdmin,
  checkResourceOwnership,
  optionalAuth,
  invalidateUserCache
};
