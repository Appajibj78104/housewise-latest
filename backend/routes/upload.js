const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const uploadMiddleware = require('../middleware/upload');
const { uploadToCloudinary, uploadProfileImage } = require('../middleware/upload');
const User = require('../models/User');
const Service = require('../models/Service');

// Upload profile image
router.post('/profile', authenticateToken, uploadMiddleware.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Upload to Cloudinary
    const result = await uploadProfileImage(req.file.buffer);

    // Update user profile with new image URL
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profileImage: result.secure_url },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: {
        imageUrl: result.secure_url,
        user: user
      }
    });
  } catch (error) {
    console.error('Profile image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile image',
      error: error.message
    });
  }
});

// Upload service images
router.post('/service/:serviceId', authenticateToken, uploadMiddleware.array('serviceImages', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided'
      });
    }

    const { serviceId } = req.params;

    // Check if service exists and belongs to user
    const service = await Service.findOne({
      _id: serviceId,
      provider: req.user.id
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found or unauthorized'
      });
    }

    // Upload all images to Cloudinary
    const uploadPromises = req.files.map(file => 
      uploadToCloudinary(file.buffer, 'housewife-services/services')
    );

    const uploadResults = await Promise.all(uploadPromises);

    // Create image objects with URLs
    const newImages = uploadResults.map((result, index) => ({
      url: result.secure_url,
      caption: req.body.captions ? req.body.captions[index] : ''
    }));

    // Update service with new images
    service.images = [...service.images, ...newImages];
    await service.save();

    res.json({
      success: true,
      message: 'Service images uploaded successfully',
      data: {
        images: newImages,
        service: service
      }
    });
  } catch (error) {
    console.error('Service image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload service images',
      error: error.message
    });
  }
});

// Delete service image
router.delete('/service/:serviceId/image/:imageIndex', authenticateToken, async (req, res) => {
  try {
    const { serviceId, imageIndex } = req.params;

    // Check if service exists and belongs to user
    const service = await Service.findOne({
      _id: serviceId,
      provider: req.user.id
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found or unauthorized'
      });
    }

    const index = parseInt(imageIndex);
    if (index < 0 || index >= service.images.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image index'
      });
    }

    // Remove image from array
    service.images.splice(index, 1);
    await service.save();

    res.json({
      success: true,
      message: 'Service image deleted successfully',
      data: {
        service: service
      }
    });
  } catch (error) {
    console.error('Service image delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete service image',
      error: error.message
    });
  }
});

// Get user profile with image
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: user,
        profileImage: user.profileImage || null
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
      error: error.message
    });
  }
});

module.exports = router;
