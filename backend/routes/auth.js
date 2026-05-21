const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const AdminActivityLog = require('../models/AdminActivityLog');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../config/logger');
const { sendEmail, templates } = require('../config/email');

const router = express.Router();

// Strict rate limiter for login — 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for registration — 5 accounts per hour per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many accounts created from this IP. Please try again after an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for password operations — 5 attempts per 15 minutes
const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Generate access token (short-lived in production, longer in dev)
const generateAccessToken = (userId) => {
  const expiresIn = process.env.NODE_ENV === 'production' ? '15m' : (process.env.JWT_EXPIRE || '7d');
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn });
};

// Generate refresh token
const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

// @route   POST /api/auth/register
router.post('/register', registerLimiter, async (req, res, next) => {
  try {
    const { name, email, password, phone, role, address, locationData, bio, experience, referralCode } = req.body;

    if (!locationData || !locationData.latitude || !locationData.longitude || !locationData.locationName) {
      return res.status(400).json({
        success: false,
        message: 'Location is required. Please search and select a valid location on the map.'
      });
    }

    const lat = parseFloat(locationData.latitude);
    const lon = parseFloat(locationData.longitude);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid location coordinates. Please select a valid location from the map.'
      });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email
          ? 'User with this email already exists'
          : 'User with this phone number already exists'
      });
    }

    const addressData = {
      ...(address || {}),
      city: locationData.city || address?.city,
      state: locationData.state || address?.state,
      locationName: locationData.locationName,
      formattedAddress: locationData.locationName,
      coordinates: { latitude: lat, longitude: lon }
    };

    const userData = { name, email, password, phone, role, address: addressData };

    if (role === 'housewife') {
      userData.bio = bio;
      userData.experience = experience || 0;
    }

    // Email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    userData.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    userData.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;

    const user = new User(userData);
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken();

    user.refreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    user.refreshTokenExpires = Date.now() + 30 * 24 * 60 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    // Apply referral code if provided
    if (referralCode && typeof referralCode === 'string' && referralCode.trim()) {
      try {
        const Referral = require('../models/Referral');
        const referral = await Referral.findOne({ referralCode: referralCode.trim().toUpperCase(), isActive: true });
        if (referral && referral.referrer.toString() !== user._id.toString()) {
          const alreadyReferred = referral.referredUsers.find(r => r.user.toString() === user._id.toString());
          if (!alreadyReferred) {
            referral.referredUsers.push({ user: user._id, status: 'registered' });
            referral.totalReferrals += 1;
            await referral.save();
            // Notify referrer
            const { createNotification } = require('../utils/notifications');
            await createNotification({
              recipient: referral.referrer,
              type: 'referral',
              title: 'New Referral!',
              message: `${name} joined using your referral code!`,
              data: { referredUserId: user._id }
            }).catch(() => {});
          }
        }
      } catch (refErr) {
        logger.error('Referral apply on register failed', { error: refErr.message });
      }
    }

    // Send verification email (non-blocking)
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${verificationToken}`;
    sendEmail({
      to: email,
      ...templates.verification(name, verificationUrl),
    }).catch(err => logger.error('Verification email failed', { error: err.message }));

    const userResponse = user.getPublicProfile();
    logger.info(`New user registered: ${email} (${role})`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.',
      data: { user: userResponse, token: accessToken, refreshToken }
    });

  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `User with this ${field} already exists`
      });
    }
    next(error);
  }
});

// @route   POST /api/auth/login
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check env-based admin credentials
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const adminToken = jwt.sign(
        { adminId: 'admin-001', email: ADMIN_EMAIL, role: 'admin', isAdmin: true },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );
      logger.info(`Admin login from IP: ${req.ip}`);

      // Log admin login activity (non-blocking)
      AdminActivityLog.create({
        action: 'login',
        adminEmail: ADMIN_EMAIL,
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || '',
        details: 'Admin login successful',
      }).catch(err => logger.error('Activity log error:', err.message));

      return res.json({
        success: true,
        message: 'Admin login successful',
        data: {
          user: { email: ADMIN_EMAIL, name: 'System Administrator', role: 'admin', isAdmin: true },
          token: adminToken,
          isAdmin: true
        }
      });
    }

    // Check DB-based admin
    const adminUser = await User.findOne({ email, role: 'admin' }).select('+password');
    if (adminUser) {
      const isValid = await adminUser.comparePassword(password);
      if (isValid) {
        const adminToken = jwt.sign(
          { userId: adminUser._id, email: adminUser.email, role: 'admin', isAdmin: true },
          process.env.JWT_SECRET,
          { expiresIn: '8h' }
        );
        logger.info(`DB admin login: ${email}`);
        return res.json({
          success: true,
          message: 'Admin login successful',
          data: { user: adminUser.getPublicProfile(), token: adminToken, isAdmin: true }
        });
      }
    }

    // Regular user login
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated. Please contact support.' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken();

    user.refreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    user.refreshTokenExpires = Date.now() + 30 * 24 * 60 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const userResponse = user.getPublicProfile();

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: userResponse, token: accessToken, refreshToken, isAdmin: false }
    });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/auth/me
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: { user: user.getPublicProfile() } });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token using refresh token (rotation)
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const user = await User.findOne({
      refreshToken: hashedToken,
      refreshTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token. Please login again.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated.' });
    }

    // Rotate: issue new pair, invalidate old
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken();

    user.refreshToken = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    user.refreshTokenExpires = Date.now() + 30 * 24 * 60 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: { token: newAccessToken, refreshToken: newRefreshToken }
    });

  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/logout
router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      refreshToken: undefined,
      refreshTokenExpires: undefined,
    });
    res.json({ success: true, message: 'Logout successful' });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/forgot-password
router.post('/forgot-password', passwordLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }

    const user = await User.findOne({ email });

    // Always return success (don't reveal if email exists)
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
    const emailResult = await sendEmail({
      to: email,
      ...templates.forgotPassword(user.name, resetUrl),
    });

    if (!emailResult.success) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      logger.error('Password reset email failed', { email });
      return res.status(500).json({ success: false, message: 'Failed to send reset email. Please try again later.' });
    }

    logger.info(`Password reset requested for: ${email}`);
    res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });

  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/reset-password/:token
router.post('/reset-password/:token', async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token. Please request a new password reset.' });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = undefined;
    user.refreshTokenExpires = undefined;
    await user.save();

    sendEmail({
      to: user.email,
      ...templates.passwordChanged(user.name),
    }).catch(err => logger.error('Password changed email failed', { error: err.message }));

    logger.info(`Password reset completed for: ${user.email}`);
    res.json({ success: true, message: 'Password has been reset successfully. Please login with your new password.' });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/auth/verify-email/:token
router.get('/verify-email/:token', async (req, res, next) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token.' });
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    logger.info(`Email verified for: ${user.email}`);
    res.json({ success: true, message: 'Email verified successfully!' });

  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/resend-verification
router.post('/resend-verification', authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ success: false, message: 'Email is already verified' });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${verificationToken}`;
    await sendEmail({ to: user.email, ...templates.verification(user.name, verificationUrl) });

    res.json({ success: true, message: 'Verification email sent. Please check your inbox.' });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/change-password
router.post('/change-password', passwordLimiter, authenticateToken, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    sendEmail({
      to: user.email,
      ...templates.passwordChanged(user.name),
    }).catch(err => logger.error('Password changed email failed', { error: err.message }));

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
