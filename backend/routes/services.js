const express = require('express');
const Service = require('../models/Service');
const Category = require('../models/Category');
const User = require('../models/User');
const { authenticateToken, requireHousewife, optionalAuth } = require('../middleware/auth');
const { reverseGeocode, forwardGeocode } = require('../utils/geocoding');
const { 
  validateServiceCreation, 
  validateServiceUpdate, 
  validateObjectId, 
  validatePagination,
  validateLocationQuery 
} = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/services
// @desc    Get all services with filtering and pagination
// @access  Public
router.get('/', validatePagination, validateLocationQuery, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const { 
      category, 
      subcategory, 
      city, 
      search, 
      minPrice, 
      maxPrice, 
      rating,
      latitude,
      longitude,
      radius,
      sortBy 
    } = req.query;

    // Build query
    let query = { 
      isActive: true, 
      isApproved: true 
    };

    if (category) {
      query.category = category;
    }

    if (subcategory) {
      query.subcategory = new RegExp(subcategory, 'i');
    }

    if (city) {
      query['location.serviceArea.city'] = new RegExp(city, 'i');
    }

    if (minPrice || maxPrice) {
      query['pricing.amount'] = {};
      if (minPrice) query['pricing.amount'].$gte = parseFloat(minPrice);
      if (maxPrice) query['pricing.amount'].$lte = parseFloat(maxPrice);
    }

    if (rating) {
      query['rating.average'] = { $gte: parseFloat(rating) };
    }

    if (search) {
      query.$text = { $search: search };
    }

    // Location-based query
    if (latitude && longitude) {
      const maxDistance = (radius || 10) * 1000; // Convert km to meters
      query['location.serviceArea.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: maxDistance
        }
      };
    }

    // Build sort
    let sort = {};
    switch (sortBy) {
      case 'price_low':
        sort = { 'pricing.amount': 1 };
        break;
      case 'price_high':
        sort = { 'pricing.amount': -1 };
        break;
      case 'rating':
        sort = { 'rating.average': -1 };
        break;
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'popular':
        sort = { totalBookings: -1 };
        break;
      default:
        sort = { featured: -1, 'rating.average': -1 };
    }

    // Run find + count in parallel
    const [services, total] = await Promise.all([
      Service.find(query)
        .populate('provider', 'name rating profileImage address')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Service.countDocuments(query)
    ]);

    // Batch review ratings — single aggregation instead of N+1 queries
    const providerIds = [...new Set(services.filter(s => s.provider).map(s => s.provider._id))];
    const Review = require('../models/Review');
    const reviewAggs = providerIds.length > 0 ? await Review.aggregate([
      { $match: { provider: { $in: providerIds } } },
      { $group: { _id: '$provider', avg: { $avg: { $ifNull: ['$rating.overall', '$rating'] } }, cnt: { $sum: 1 } } }
    ]) : [];
    const ratingMap = Object.fromEntries(reviewAggs.map(r => [r._id.toString(), { averageRating: Math.round(r.avg * 10) / 10, totalReviews: r.cnt }]));

    for (const service of services) {
      if (service.provider) {
        service.provider.reviewRating = ratingMap[service.provider._id.toString()] || { averageRating: 0, totalReviews: 0 };
      }
    }

    res.json({
      success: true,
      data: {
        services,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get services',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/services/categories
// @desc    Get all service categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1, displayName: 1 });

    res.json({
      success: true,
      data: {
        categories
      }
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get categories',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/services/distance-analysis
// @desc    Analyze provider distance distribution and detect natural clusters
// @access  Public
router.get('/distance-analysis', async (req, res) => {
  try {
    const { lat, lng, category, maxKm = 200 } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat and lng are required' });
    }

    const latitude  = parseFloat(lat);
    const longitude = parseFloat(lng);
    const maxRadius = Math.min(parseFloat(maxKm), 500); // cap at 500 km

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates' });
    }

    // 1. Fetch all providers within maxRadius
    let providerQuery = {
      role: 'housewife',
      isActive: true,
      'address.location': {
        $near: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: maxRadius * 1000
        }
      }
    };

    const providers = await User.find(providerQuery)
      .select('name address')
      .limit(200)
      .lean();

    // 2. Compute distances
    const distances = providers
      .map(p => {
        const pLat = p.address?.coordinates?.latitude;
        const pLng = p.address?.coordinates?.longitude;
        if (!pLat || !pLng) return null;
        return calculateDistance(latitude, longitude, pLat, pLng);
      })
      .filter(d => d !== null)
      .sort((a, b) => a - b);

    if (distances.length === 0) {
      return res.json({
        success: true,
        data: {
          total: 0,
          clusters: [],
          recommendedRadius: maxRadius,
          distances: [],
          tiers: buildDefaultTiers()
        }
      });
    }

    // 3. Filter by category if specified — get provider IDs, match services
    let categoryDistances = distances;
    if (category) {
      const providerIds = providers.map(p => p._id);
      const svcProviders = await Service.distinct('provider', {
        provider: { $in: providerIds },
        isActive: true,
        isApproved: true,
        category
      });
      const svcProviderSet = new Set(svcProviders.map(id => id.toString()));
      categoryDistances = providers
        .filter(p => svcProviderSet.has(p._id.toString()))
        .map(p => {
          const pLat = p.address?.coordinates?.latitude;
          const pLng = p.address?.coordinates?.longitude;
          if (!pLat || !pLng) return null;
          return calculateDistance(latitude, longitude, pLat, pLng);
        })
        .filter(d => d !== null)
        .sort((a, b) => a - b);

      if (categoryDistances.length === 0) {
        // Fall back to all-category distances for tier suggestions
        categoryDistances = distances;
      }
    }

    // 4. Detect clusters using natural gap analysis
    const clusters = detectClusters(categoryDistances);

    // 5. Build smart distance tiers from clusters
    const tiers = buildSmartTiers(clusters, categoryDistances);

    res.json({
      success: true,
      data: {
        total: categoryDistances.length,
        min: categoryDistances[0],
        max: categoryDistances[categoryDistances.length - 1],
        median: categoryDistances[Math.floor(categoryDistances.length / 2)],
        clusters,
        tiers,
        recommendedRadius: tiers.length > 0 ? tiers[0].radius : 10
      }
    });

  } catch (error) {
    console.error('Distance analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze distance distribution',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Detect natural clusters in a sorted array of distances.
 *
 * Algorithm:
 * 1. Compute gaps between consecutive distances.
 * 2. Find the median gap.
 * 3. A "significant gap" is any gap > max(2× median, 3 km).
 *    This prevents tiny random fluctuations from splitting clusters.
 * 4. Each segment between significant gaps is a cluster.
 *
 * Returns an array of { from, to, count, density } objects.
 */
function detectClusters(sortedDistances) {
  if (sortedDistances.length === 0) return [];
  if (sortedDistances.length === 1) {
    return [{ from: 0, to: sortedDistances[0] + 2, count: 1, density: 1 }];
  }

  // Compute gaps
  const gaps = [];
  for (let i = 1; i < sortedDistances.length; i++) {
    gaps.push({
      index: i,
      gap: sortedDistances[i] - sortedDistances[i - 1]
    });
  }

  // Median gap
  const sortedGaps = gaps.map(g => g.gap).sort((a, b) => a - b);
  const medianGap = sortedGaps[Math.floor(sortedGaps.length / 2)];

  // Significant gap threshold: at least 2× median, minimum 3 km
  const gapThreshold = Math.max(medianGap * 2, 3);

  // Build clusters
  const clusters = [];
  let clusterStart = 0;

  for (let i = 0; i < gaps.length; i++) {
    if (gaps[i].gap > gapThreshold) {
      // End current cluster at gaps[i].index - 1
      const end = gaps[i].index - 1;
      const from = sortedDistances[clusterStart];
      const to = sortedDistances[end];
      const count = end - clusterStart + 1;
      const range = Math.max(to - from, 0.1);
      clusters.push({
        from: Math.max(0, from - 1),
        to: to + 1,
        count,
        density: count / range
      });
      clusterStart = gaps[i].index;
    }
  }

  // Final cluster
  const from = sortedDistances[clusterStart];
  const to = sortedDistances[sortedDistances.length - 1];
  const count = sortedDistances.length - clusterStart;
  const range = Math.max(to - from, 0.1);
  clusters.push({
    from: Math.max(0, from - 1),
    to: to + 1,
    count,
    density: count / range
  });

  return clusters;
}

/**
 * Build smart distance tier options from clusters.
 * Each tier covers one more cluster than the previous.
 * Always start with the nearest cluster.
 */
function buildSmartTiers(clusters, sortedDistances) {
  if (clusters.length === 0) return buildDefaultTiers();

  const tiers = [];
  let cumulativeCount = 0;

  for (let i = 0; i < clusters.length; i++) {
    cumulativeCount += clusters[i].count;
    // Round the radius to a clean number
    const rawRadius = clusters[i].to;
    const radius = smartRound(rawRadius);

    tiers.push({
      radius,
      count: cumulativeCount,
      label: formatTierLabel(radius),
      clusters: i + 1,
      isRecommended: i === 0 // First tier (nearest cluster) is recommended
    });
  }

  // Add a final "all" tier if the last cluster doesn't cover everything
  if (tiers.length > 0) {
    const lastTier = tiers[tiers.length - 1];
    if (lastTier.count < sortedDistances.length) {
      const maxDist = sortedDistances[sortedDistances.length - 1];
      tiers.push({
        radius: smartRound(maxDist + 5),
        count: sortedDistances.length,
        label: formatTierLabel(smartRound(maxDist + 5)),
        clusters: clusters.length,
        isRecommended: false
      });
    }
  }

  // Deduplicate tiers with same radius
  const unique = [];
  const seen = new Set();
  for (const t of tiers) {
    if (!seen.has(t.radius)) {
      seen.add(t.radius);
      unique.push(t);
    }
  }

  return unique;
}

function buildDefaultTiers() {
  return [
    { radius: 10, count: 0, label: '10 km', clusters: 0, isRecommended: true },
    { radius: 25, count: 0, label: '25 km', clusters: 0, isRecommended: false },
    { radius: 50, count: 0, label: '50 km', clusters: 0, isRecommended: false },
  ];
}

/** Round to nearest "clean" number for UX */
function smartRound(km) {
  if (km <= 2) return Math.ceil(km);
  if (km <= 10) return Math.ceil(km / 2) * 2;      // 2, 4, 6, 8, 10
  if (km <= 30) return Math.ceil(km / 5) * 5;      // 15, 20, 25, 30
  if (km <= 100) return Math.ceil(km / 10) * 10;   // 40, 50, ...
  return Math.ceil(km / 25) * 25;                   // 125, 150, ...
}

function formatTierLabel(km) {
  if (km < 1) return `${(km * 1000).toFixed(0)}m`;
  return `${km} km`;
}

// @route   GET /api/services/nearby-providers
// @desc    Get nearby service providers with progressive/hierarchical filtering
// @access  Public
router.get('/nearby-providers', async (req, res) => {
  try {
    const {
      lat, lng,
      radiusKm,
      city, state, country = 'India',
      category,
      limit = 50,
      scope = 'radius' // 'radius', 'city', 'state', 'country'
    } = req.query;

    let providerQuery = {
      role: 'housewife',
      isActive: true
    };

    let searchCenter = null;
    let searchScope = scope;
    let actualRadius = null;

    // Build query based on scope
    if (scope === 'radius' && lat && lng && radiusKm) {
      // Radius-based search
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const radius = parseFloat(radiusKm);

      if (isNaN(latitude) || isNaN(longitude) || isNaN(radius)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinates or radius for radius search'
        });
      }

      providerQuery['address.location'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      };

      searchCenter = { latitude, longitude };
      actualRadius = radius;

    } else if (scope === 'city' && city) {
      // City-based search
      providerQuery['address.city'] = new RegExp(city, 'i');
      searchScope = 'city';

    } else if (scope === 'state' && state) {
      // State-based search
      providerQuery['address.state'] = new RegExp(state, 'i');
      searchScope = 'state';

    } else if (scope === 'country') {
      // Country-based search
      providerQuery['address.country'] = new RegExp(country, 'i');
      searchScope = 'country';

    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid search parameters. Provide either (lat, lng, radiusKm) or city or state for the specified scope.'
      });
    }

    // Get providers based on query
    const providers = await User.find(providerQuery)
      .select('name email profileImage bio experience rating address')
      .limit(parseInt(limit))
      .lean();

    // Batch: get all services for all providers in ONE query instead of N queries
    const providerIds = providers.map(p => p._id);
    let batchServiceQuery = { provider: { $in: providerIds }, isActive: true, isApproved: true };
    if (category) batchServiceQuery.category = category;
    const allServices = await Service.find(batchServiceQuery)
      .select('title category subcategory pricing rating images provider')
      .lean();

    // Group services by provider
    const servicesByProvider = {};
    for (const svc of allServices) {
      const pid = svc.provider.toString();
      if (!servicesByProvider[pid]) servicesByProvider[pid] = [];
      servicesByProvider[pid].push(svc);
    }

    // Build provider results
    const providersWithServices = providers.map(provider => {
      const pid = provider._id.toString();
      const services = servicesByProvider[pid] || [];

      // Skip providers with no services in the requested category
      if (category && services.length === 0) return null;

      // Calculate distance if we have search center
      let distance = null;
      if (searchCenter) {
        distance = calculateDistance(
          searchCenter.latitude, searchCenter.longitude,
          provider.address.coordinates.latitude,
          provider.address.coordinates.longitude
        );
      }

      const primaryCategory = services.length > 0 ? services[0].category : null;

      return {
        ...provider,
        services,
        distance,
        primaryCategory,
        serviceCount: services.length
      };
    });

    // Filter out null results
    let validProviders = providersWithServices.filter(provider => provider !== null);

    // Sort by distance if available, otherwise by rating
    if (searchCenter) {
      validProviders.sort((a, b) => a.distance - b.distance);
    } else {
      validProviders.sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));
    }

    res.json({
      success: true,
      data: {
        providers: validProviders,
        searchCenter,
        radius: actualRadius,
        scope: searchScope,
        searchParams: {
          city: scope === 'city' ? city : null,
          state: scope === 'state' ? state : null,
          country: scope === 'country' ? country : null
        },
        category: category || 'all',
        total: validProviders.length
      }
    });

  } catch (error) {
    console.error('Get nearby providers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get nearby providers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

// @route   GET /api/services/reverse-geocode
// @desc    Reverse geocode coordinates to get administrative information
// @access  Public
router.get('/reverse-geocode', async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    const result = await reverseGeocode(latitude, longitude);

    res.json({
      success: true,
      data: result.data,
      geocodingSuccess: result.success,
      source: result.success ? 'nominatim' : 'fallback'
    });

  } catch (error) {
    console.error('Reverse geocoding error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reverse geocode coordinates',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/services/forward-geocode
// @desc    Forward geocode address to get coordinates and administrative information
// @access  Public
router.get('/forward-geocode', async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Address is required'
      });
    }

    const result = await forwardGeocode(address);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('Forward geocoding error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to geocode address',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/services/featured
// @desc    Get featured services
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;

    const services = await Service.find({
      isActive: true,
      isApproved: true,
      featured: true
    })
    .populate('provider', 'name rating profileImage')
    .sort({ 'rating.average': -1 })
    .limit(limit);

    res.json({
      success: true,
      data: {
        services
      }
    });

  } catch (error) {
    console.error('Get featured services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get featured services',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/services/by-provider/:providerId
// @desc    Get services by provider
// @access  Public
router.get('/by-provider/:providerId', validateObjectId('providerId'), validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const services = await Service.find({
      provider: req.params.providerId,
      isActive: true,
      isApproved: true
    })
    .sort({ featured: -1, 'rating.average': -1 })
    .skip(skip)
    .limit(limit);

    const total = await Service.countDocuments({
      provider: req.params.providerId,
      isActive: true,
      isApproved: true
    });

    res.json({
      success: true,
      data: {
        services,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get provider services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get provider services',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/services/my-services
// @desc    Get current user's services
// @access  Private (Housewife only)
router.get('/my-services', authenticateToken, requireHousewife, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const services = await Service.find({ provider: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Service.countDocuments({ provider: req.user._id });

    // Get stats
    const stats = await Service.aggregate([
      { $match: { provider: req.user._id } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          approved: { $sum: { $cond: ['$isApproved', 1, 0] } },
          totalViews: { $sum: '$views' },
          totalBookings: { $sum: '$totalBookings' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        services,
        stats: stats[0] || {
          total: 0,
          active: 0,
          approved: 0,
          totalViews: 0,
          totalBookings: 0
        },
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get my services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get your services',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/services/matched
// @desc    Get services with provider matching scores
// @access  Public (optional auth for personalization)
router.get('/matched', optionalAuth, async (req, res) => {
  try {
    const { category, limit: qLimit } = req.query;
    const limit = Math.min(parseInt(qLimit) || 20, 50);

    let matchPipeline = [
      { $match: { isActive: true, isApproved: true } },
    ];

    if (category) {
      matchPipeline[0].$match.category = category;
    }

    matchPipeline.push(
      { $lookup: { from: 'users', localField: 'provider', foreignField: '_id', as: 'providerData' } },
      { $unwind: '$providerData' },
      { $match: { 'providerData.isActive': true, 'providerData.isApproved': true } }
    );

    matchPipeline.push({
      $addFields: {
        ratingScore: { $multiply: [{ $ifNull: ['$rating.average', 0] }, 8] },
        completionScore: { $min: [{ $multiply: [{ $ifNull: ['$totalBookings', 0] }, 0.4] }, 20] },
        priceScore: {
          $cond: {
            if: { $gt: [{ $ifNull: ['$pricing.amount', 0] }, 0] },
            then: { $min: [{ $divide: [500, { $add: [{ $ifNull: ['$pricing.amount', 500] }, 1] }] }, 20] },
            else: 10
          }
        },
        responseScore: {
          $cond: {
            if: { $gt: [{ $ifNull: ['$providerData.avgResponseTime', 0] }, 0] },
            then: { $min: [{ $divide: [120, { $add: [{ $ifNull: ['$providerData.avgResponseTime', 60] }, 1] }] }, 20] },
            else: 10
          }
        },
      }
    });

    matchPipeline.push({
      $addFields: {
        matchScore: { $add: ['$ratingScore', '$completionScore', '$priceScore', '$responseScore'] }
      }
    });

    matchPipeline.push(
      { $sort: { matchScore: -1 } },
      { $limit: limit },
      { $project: {
        title: 1, description: 1, category: 1, pricing: 1, rating: 1,
        images: 1, totalBookings: 1, matchScore: 1,
        'providerData.name': 1, 'providerData.profileImage': 1,
        'providerData.rating': 1, 'providerData._id': 1,
        'location.serviceArea': 1,
      }}
    );

    const services = await Service.aggregate(matchPipeline);
    res.json({ success: true, data: { services } });
  } catch (error) {
    console.error('Matched services error:', error);
    res.status(500).json({ success: false, message: 'Failed to get matched services' });
  }
});

// @route   GET /api/services/:id
// @desc    Get single service by ID
// @access  Public
router.get('/:id', validateObjectId('id'), optionalAuth, async (req, res) => {
  try {
    const service = await Service.findOne({
      _id: req.params.id,
      isActive: true,
      isApproved: true
    }).populate('provider', 'name rating profileImage address phone bio experience').lean();

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Atomic view increment (no full save) — non-fatal
    if (!req.user || req.user._id.toString() !== service.provider._id.toString()) {
      Service.updateOne({ _id: service._id }, { $inc: { views: 1 } }).catch(() => {});
    }

    // Parallel: review rating + related services
    const Review = require('../models/Review');
    const [reviewAgg, relatedServices] = await Promise.all([
      Review.aggregate([
        { $match: { provider: service.provider._id } },
        { $group: { _id: null, avg: { $avg: { $ifNull: ['$rating.overall', '$rating'] } }, cnt: { $sum: 1 } } }
      ]),
      Service.find({
        category: service.category,
        _id: { $ne: service._id },
        isActive: true,
        isApproved: true
      })
      .populate('provider', 'name rating profileImage')
      .select('title category pricing rating images provider')
      .limit(4)
      .lean()
    ]);

    service.provider.reviewRating = reviewAgg[0]
      ? { averageRating: Math.round(reviewAgg[0].avg * 10) / 10, totalReviews: reviewAgg[0].cnt }
      : { averageRating: 0, totalReviews: 0 };

    res.json({
      success: true,
      data: {
        service,
        relatedServices
      }
    });

  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get service',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/services
// @desc    Create a new service
// @access  Private (Housewife only)
router.post('/', authenticateToken, requireHousewife, validateServiceCreation, async (req, res) => {
  try {
    const serviceData = {
      ...req.body,
      provider: req.user._id
    };

    const service = new Service(serviceData);
    await service.save();

    const populatedService = await Service.findById(service._id)
      .populate('provider', 'name rating profileImage');

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: {
        service: populatedService
      }
    });

  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create service',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   PUT /api/services/:id
// @desc    Update a service
// @access  Private (Owner only)
router.put('/:id', authenticateToken, validateObjectId('id'), validateServiceUpdate, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Check ownership
    if (service.provider.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own services'
      });
    }

    const allowedUpdates = [
      'title', 'description', 'subcategory', 'pricing', 'duration',
      'location', 'availability', 'images', 'requirements', 'tags'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // If significant changes, require re-approval
    const significantFields = ['title', 'description', 'category', 'pricing'];
    const hasSignificantChanges = significantFields.some(field => 
      req.body[field] !== undefined
    );

    if (hasSignificantChanges && service.isApproved) {
      updates.isApproved = false;
      updates.approvedBy = null;
      updates.approvedAt = null;
    }

    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('provider', 'name rating profileImage');

    res.json({
      success: true,
      message: 'Service updated successfully',
      data: {
        service: updatedService
      }
    });

  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   DELETE /api/services/:id
// @desc    Delete a service
// @access  Private (Owner only)
router.delete('/:id', authenticateToken, validateObjectId('id'), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Check ownership
    if (service.provider.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own services'
      });
    }

    // Soft delete - just mark as inactive
    await Service.findByIdAndUpdate(req.params.id, { isActive: false });

    res.json({
      success: true,
      message: 'Service deleted successfully'
    });

  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete service',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
