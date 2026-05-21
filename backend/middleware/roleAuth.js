// Role-based authorization middleware
const roleAuth = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated (should be done by auth middleware first)
      if (!req.user) {
        return res.status(401).json({
          message: 'Access denied. No user found.'
        });
      }

      // Check if user role is in allowed roles
      if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
        });
      }

      next();
    } catch (error) {
      console.error('Role authorization error:', error);
      res.status(500).json({
        message: 'Server error during authorization'
      });
    }
  };
};

module.exports = roleAuth;
