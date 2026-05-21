const axios = require('axios');

/**
 * Reverse geocoding utility to get administrative information from coordinates
 * Uses OpenStreetMap Nominatim API (free) as primary, with fallback options
 */

// Rate limiting for Nominatim (max 1 request per second)
let lastRequestTime = 0;
const RATE_LIMIT_DELAY = 1100; // 1.1 seconds to be safe

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Reverse geocode coordinates to get administrative information
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<Object>} Administrative information
 */
async function reverseGeocode(latitude, longitude) {
  try {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
      await delay(RATE_LIMIT_DELAY - timeSinceLastRequest);
    }
    lastRequestTime = Date.now();

    // Use Nominatim for reverse geocoding
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        format: 'json',
        lat: latitude,
        lon: longitude,
        zoom: 10,
        addressdetails: 1,
        extratags: 1
      },
      headers: {
        'User-Agent': 'HouseWise-Platform/1.0 (contact@housewise.com)'
      },
      timeout: 10000
    });

    const data = response.data;
    
    if (!data || !data.address) {
      throw new Error('No address data found');
    }

    // Extract administrative information
    const address = data.address;
    
    // Determine city (try multiple fields in order of preference)
    const city = address.city || 
                 address.town || 
                 address.village || 
                 address.municipality || 
                 address.suburb ||
                 address.district ||
                 'Unknown City';

    // Determine state (try multiple fields)
    const state = address.state || 
                  address.province || 
                  address.region ||
                  'Unknown State';

    // Country
    const country = address.country || 'India';

    // Additional useful information
    const district = address.state_district || address.district || null;
    const pincode = address.postcode || null;
    const formattedAddress = data.display_name || null;

    return {
      success: true,
      data: {
        city: city,
        state: state,
        country: country,
        district: district,
        pincode: pincode,
        formattedAddress: formattedAddress,
        coordinates: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        },
        raw: data // Store raw response for debugging
      }
    };

  } catch (error) {
    console.error('Reverse geocoding error:', error.message);
    
    // Fallback: try to determine location based on coordinates (rough approximation for India)
    const fallbackLocation = getFallbackLocation(latitude, longitude);
    
    return {
      success: false,
      error: error.message,
      fallback: fallbackLocation,
      data: {
        city: fallbackLocation.city,
        state: fallbackLocation.state,
        country: 'India',
        district: null,
        pincode: null,
        formattedAddress: `${fallbackLocation.city}, ${fallbackLocation.state}, India`,
        coordinates: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        }
      }
    };
  }
}

/**
 * Fallback location determination for Indian coordinates
 * @param {number} lat 
 * @param {number} lng 
 * @returns {Object} Approximate location
 */
function getFallbackLocation(lat, lng) {
  // Rough coordinate ranges for major Indian cities/states
  const locations = [
    // Delhi NCR
    { minLat: 28.4, maxLat: 28.9, minLng: 76.8, maxLng: 77.5, city: 'Delhi', state: 'Delhi' },
    
    // Mumbai
    { minLat: 18.9, maxLat: 19.3, minLng: 72.7, maxLng: 73.1, city: 'Mumbai', state: 'Maharashtra' },
    
    // Bangalore
    { minLat: 12.8, maxLat: 13.2, minLng: 77.4, maxLng: 77.8, city: 'Bengaluru', state: 'Karnataka' },
    
    // Chennai
    { minLat: 12.8, maxLat: 13.3, minLng: 80.1, maxLng: 80.4, city: 'Chennai', state: 'Tamil Nadu' },
    
    // Hyderabad
    { minLat: 17.2, maxLat: 17.6, minLng: 78.2, maxLng: 78.7, city: 'Hyderabad', state: 'Telangana' },
    
    // Pune
    { minLat: 18.4, maxLat: 18.7, minLng: 73.7, maxLng: 74.0, city: 'Pune', state: 'Maharashtra' },
    
    // Kolkata
    { minLat: 22.4, maxLat: 22.7, minLng: 88.2, maxLng: 88.5, city: 'Kolkata', state: 'West Bengal' },
    
    // Ahmedabad
    { minLat: 22.9, maxLat: 23.2, minLng: 72.4, maxLng: 72.8, city: 'Ahmedabad', state: 'Gujarat' }
  ];

  // Check if coordinates fall within any known city
  for (const location of locations) {
    if (lat >= location.minLat && lat <= location.maxLat && 
        lng >= location.minLng && lng <= location.maxLng) {
      return { city: location.city, state: location.state };
    }
  }

  // Rough state-level fallback based on coordinate ranges
  if (lat >= 28.0 && lat <= 30.5 && lng >= 76.0 && lng <= 78.5) {
    return { city: 'Unknown City', state: 'Delhi' };
  } else if (lat >= 18.0 && lat <= 20.5 && lng >= 72.0 && lng <= 75.0) {
    return { city: 'Unknown City', state: 'Maharashtra' };
  } else if (lat >= 12.0 && lat <= 16.0 && lng >= 77.0 && lng <= 79.0) {
    return { city: 'Unknown City', state: 'Karnataka' };
  } else if (lat >= 10.0 && lat <= 14.0 && lng >= 79.0 && lng <= 81.0) {
    return { city: 'Unknown City', state: 'Tamil Nadu' };
  } else if (lat >= 22.0 && lat <= 25.0 && lng >= 87.0 && lng <= 89.0) {
    return { city: 'Unknown City', state: 'West Bengal' };
  }

  // Default fallback
  return { city: 'Unknown City', state: 'Unknown State' };
}

/**
 * Forward geocoding - convert address to coordinates
 * @param {string} address 
 * @returns {Promise<Object>} Coordinates and location info
 */
async function forwardGeocode(address) {
  try {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
      await delay(RATE_LIMIT_DELAY - timeSinceLastRequest);
    }
    lastRequestTime = Date.now();

    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        format: 'json',
        q: address,
        limit: 1,
        addressdetails: 1,
        countrycodes: 'in' // Limit to India
      },
      headers: {
        'User-Agent': 'HouseWise-Platform/1.0 (contact@housewise.com)'
      },
      timeout: 10000
    });

    const data = response.data;
    
    if (!data || data.length === 0) {
      throw new Error('Address not found');
    }

    const result = data[0];
    const latitude = parseFloat(result.lat);
    const longitude = parseFloat(result.lon);

    // Get administrative info
    const adminInfo = await reverseGeocode(latitude, longitude);

    return {
      success: true,
      data: {
        coordinates: { latitude, longitude },
        ...adminInfo.data,
        confidence: result.importance || 0.5
      }
    };

  } catch (error) {
    console.error('Forward geocoding error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  reverseGeocode,
  forwardGeocode,
  getFallbackLocation
};
