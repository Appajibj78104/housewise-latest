const jwt = require('jsonwebtoken');

// Hard-coded admin credentials
const ADMIN_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'ChangeMe123!',
  name: 'System Administrator',
  role: 'admin'
};

/**
 * Authenticate admin login
 */
const authenticateAdmin = (email, password) => {
  if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
    return {
      success: true,
      admin: {
        email: ADMIN_CREDENTIALS.email,
        name: ADMIN_CREDENTIALS.name,
        role: ADMIN_CREDENTIALS.role
      }
    };
  }
  return { success: false, message: 'Invalid admin credentials' };
};

/**
 * Generate admin JWT token
 */
const generateAdminToken = (adminData) => {
  return jwt.sign(
    {
      adminId: 'admin-001',
      email: adminData.email,
      role: 'admin',
      isAdmin: true
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' } // Admin sessions expire in 8 hours
  );
};

/**
 * Middleware to verify admin authentication
 */
const requireAdmin = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Admin token required.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.isAdmin || decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Admin session expired. Please login again.'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Invalid admin token.'
    });
  }
};

/**
 * Optional admin auth - doesn't fail if no token
 */
const optionalAdmin = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.isAdmin && decoded.role === 'admin') {
        req.admin = decoded;
      }
    }
    
    next();
  } catch (error) {
    // Continue without admin privileges
    next();
  }
};

/**
 * Change admin password (updates the hard-coded credential)
 * Note: In production, this should update a database record
 */
const changeAdminPassword = (currentPassword, newPassword) => {
  if (currentPassword !== ADMIN_CREDENTIALS.password) {
    return { success: false, message: 'Current password is incorrect' };
  }
  
  if (newPassword.length < 8) {
    return { success: false, message: 'New password must be at least 8 characters long' };
  }
  
  // In a real application, you would update the database here
  // For now, we'll just validate but not actually change the hard-coded password
  ADMIN_CREDENTIALS.password = newPassword;
  
  return { success: true, message: 'Admin password updated successfully' };
};

module.exports = {
  authenticateAdmin,
  generateAdminToken,
  requireAdmin,
  optionalAdmin,
  changeAdminPassword,
  ADMIN_CREDENTIALS
};
