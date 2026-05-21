import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 15000, // 15 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor with refresh token logic
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    // Silently reject aborted/cancelled requests (AbortController)
    if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
      return Promise.reject(error);
    }

    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      const reqHadToken = originalRequest?.headers?.Authorization;
      
      // Skip refresh for auth endpoints (login/register/refresh itself)
      const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || 
                            originalRequest.url?.includes('/auth/register') ||
                            originalRequest.url?.includes('/auth/refresh');
      
      if (reqHadToken && !isAuthEndpoint) {
        if (isRefreshing) {
          // Queue this request until token is refreshed
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          }).catch(err => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = localStorage.getItem('refreshToken');
        
        if (refreshToken) {
          try {
            const response = await axios.post(
              `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh`,
              { refreshToken }
            );

            const { token: newToken, refreshToken: newRefreshToken } = response.data.data;
            
            localStorage.setItem('token', newToken);
            localStorage.setItem('refreshToken', newRefreshToken);
            
            api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            
            processQueue(null, newToken);
            return api(originalRequest);
          } catch (refreshError) {
            processQueue(refreshError, null);
            // Refresh failed — clear auth and redirect
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
              window.location.replace('/login');
            }
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        } else {
          // No refresh token available — clear and redirect
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/login') {
            window.location.replace('/login');
          }
        }
      }
    }
    
    return Promise.reject(error.response?.data || error.message);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/me'),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  logout: () => api.post('/auth/logout'),
  changePassword: (passwordData) => api.post('/auth/change-password', passwordData),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password }),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
  resendVerification: () => api.post('/auth/resend-verification'),
};

// Users API
export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (userData) => api.put('/users/profile', userData),
  getHousewives: (params) => api.get('/users/housewives', { params }),
  getHousewifeById: (id) => api.get(`/users/housewives/${id}`),
  getDashboard: () => api.get('/users/dashboard'),
  deactivateAccount: () => api.post('/users/deactivate'),
};

// Services API
export const servicesAPI = {
  getServices: (params, opts) => api.get('/services', { params, ...opts }),
  getServiceById: (id, opts) => api.get(`/services/${id}`, opts),
  createService: (serviceData) => api.post('/services', serviceData),
  updateService: (id, serviceData) => api.put(`/services/${id}`, serviceData),
  deleteService: (id) => api.delete(`/services/${id}`),
  getMyServices: (params, opts) => api.get('/services/my-services', { params, ...opts }),
  getServicesByProvider: (providerId, params, opts) => api.get(`/services/by-provider/${providerId}`, { params, ...opts }),
  getCategories: () => api.get('/services/categories'),
  getFeaturedServices: (params) => api.get('/services/featured', { params }),
  getMatchedServices: (params) => api.get('/services/matched', { params }),
};

// Bookings API (incl. premium lifecycle endpoints)
export const bookingsAPI = {
  createBooking: (bookingData) => api.post('/bookings', bookingData),
  getBookings: (params) => api.get('/bookings', { params }),
  getBookingById: (id) => api.get(`/bookings/${id}`),
  updateBookingStatus: (id, statusData) => api.put(`/bookings/${id}/status`, statusData),
  getTransitions: (id) => api.get(`/bookings/${id}/transitions`),

  // Premium lifecycle
  setEta: (id, payload) => api.put(`/bookings/${id}/eta`, payload), // { etaMinutes } or { etaAt }
  markArrived: (id) => api.put(`/bookings/${id}/arrived`),
  startJob: (id) => api.put(`/bookings/${id}/start`),
  addTimelineEvent: (id, { type = 'progress', message, photos = [] }) => {
    const fd = new FormData();
    fd.append('type', type);
    if (message) fd.append('message', message);
    (photos || []).forEach((p) => { if (p instanceof File) fd.append('photos', p); });
    return api.post(`/bookings/${id}/timeline`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  setChecklist: (id, items) => api.put(`/bookings/${id}/checklist`, { items }),
  toggleChecklistItem: (id, idx) => api.put(`/bookings/${id}/checklist/${idx}`),
  addTip: (id, payload) => api.post(`/bookings/${id}/tip`, payload), // { amount, note }
  rateCustomer: (id, payload) => api.post(`/bookings/${id}/customer-rating`, payload),
  raiseDispute: (id, { reason, photos = [] }) => {
    const fd = new FormData();
    fd.append('reason', reason);
    (photos || []).forEach((p) => { if (p instanceof File) fd.append('photos', p); });
    return api.post(`/bookings/${id}/dispute`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  rebook: (id, payload) => api.post(`/bookings/${id}/rebook`, payload), // { scheduledDate, scheduledTime }
};

// Chat API (per-booking thread)
export const chatAPI = {
  listThreads: () => api.get('/chat/threads'),
  getMessages: (bookingId, params) => api.get(`/chat/${bookingId}`, { params }),
  sendMessage: (bookingId, { message, image }) => {
    const fd = new FormData();
    if (message) fd.append('message', message);
    if (image instanceof File) fd.append('image', image);
    return api.post(`/chat/${bookingId}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  markRead: (bookingId) => api.post(`/chat/${bookingId}/read`),
};

// Quote / Negotiation API
export const quotesAPI = {
  request: (payload) => api.post('/quotes/request', payload),
  get: (bookingId) => api.get(`/quotes/${bookingId}`),
  addOffer: (bookingId, payload) => api.post(`/quotes/${bookingId}/offer`, payload),
  accept: (bookingId) => api.post(`/quotes/${bookingId}/accept`),
  reject: (bookingId, reason) => api.post(`/quotes/${bookingId}/reject`, { reason }),
};

// KYC API
export const kycAPI = {
  getMine: () => api.get('/users/profile/kyc'),
  submit: ({ aadhaar, pan, selfie }) => {
    const fd = new FormData();
    if (aadhaar instanceof File) fd.append('aadhaar', aadhaar);
    if (pan instanceof File) fd.append('pan', pan);
    if (selfie instanceof File) fd.append('selfie', selfie);
    return api.post('/users/profile/kyc', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

// Reviews API
export const reviewsAPI = {
  createReview: (reviewData) => api.post('/reviews', reviewData),
  getServiceReviews: (serviceId, params, opts) => api.get(`/reviews/service/${serviceId}`, { params, ...opts }),
  getProviderReviews: (providerId, params, opts) => api.get(`/reviews/provider/${providerId}`, { params, ...opts }),
  markReviewHelpful: (reviewId) => api.post(`/reviews/${reviewId}/helpful`),
  removeHelpfulVote: (reviewId) => api.delete(`/reviews/${reviewId}/helpful`),
  addProviderResponse: (reviewId, responseData) => api.post(`/reviews/${reviewId}/response`, responseData),
};

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUserStatus: (userId, statusData) => api.put(`/admin/users/${userId}/status`, statusData),
  getServices: (params) => api.get('/admin/services', { params }),
  approveService: (serviceId, approvalData) => api.put(`/admin/services/${serviceId}/approve`, approvalData),
  getBookings: (params) => api.get('/admin/bookings', { params }),
};

// Provider API endpoints
export const providerAPI = {
  // Profile management
  getProfile: () => api.get('/provider/profile'),
  updateProfile: (profileData) => {
    const formData = new FormData();

    // Handle file upload
    if (profileData.profileImage && profileData.profileImage instanceof File) {
      formData.append('profileImage', profileData.profileImage);
      delete profileData.profileImage;
    }

    // Append other data
    Object.keys(profileData).forEach(key => {
      if (profileData[key] !== null && profileData[key] !== undefined) {
        if (typeof profileData[key] === 'object') {
          formData.append(key, JSON.stringify(profileData[key]));
        } else {
          formData.append(key, profileData[key]);
        }
      }
    });

    return api.put('/provider/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Service management
  createService: (serviceData) => {
    const formData = new FormData();

    // Handle multiple image uploads
    if (serviceData.images && serviceData.images.length > 0) {
      serviceData.images.forEach(image => {
        if (image instanceof File) {
          formData.append('images', image);
        }
      });
      delete serviceData.images;
    }

    // Append other data
    Object.keys(serviceData).forEach(key => {
      if (serviceData[key] !== null && serviceData[key] !== undefined) {
        if (typeof serviceData[key] === 'object') {
          formData.append(key, JSON.stringify(serviceData[key]));
        } else {
          formData.append(key, serviceData[key]);
        }
      }
    });

    return api.post('/provider/services', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  getMyServices: (params = {}, opts) => api.get('/provider/services', { params, ...opts }),

  saveDraft: (draftData) => {
    const formData = new FormData();
    if (draftData.images && draftData.images.length > 0) {
      draftData.images.forEach(image => {
        if (image instanceof File) {
          formData.append('images', image);
        }
      });
      delete draftData.images;
    }
    Object.keys(draftData).forEach(key => {
      if (draftData[key] !== null && draftData[key] !== undefined) {
        if (typeof draftData[key] === 'object') {
          formData.append(key, JSON.stringify(draftData[key]));
        } else {
          formData.append(key, draftData[key]);
        }
      }
    });
    return api.post('/provider/services/draft', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  updateService: (serviceId, serviceData) => {
    const formData = new FormData();

    // Handle multiple image uploads
    if (serviceData.images && serviceData.images.length > 0) {
      serviceData.images.forEach(image => {
        if (image instanceof File) {
          formData.append('images', image);
        }
      });
      delete serviceData.images;
    }

    // Append other data
    Object.keys(serviceData).forEach(key => {
      if (serviceData[key] !== null && serviceData[key] !== undefined) {
        if (typeof serviceData[key] === 'object') {
          formData.append(key, JSON.stringify(serviceData[key]));
        } else {
          formData.append(key, serviceData[key]);
        }
      }
    });

    return api.put(`/provider/services/${serviceId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  deleteService: (serviceId) => api.delete(`/provider/services/${serviceId}`),

  // Booking management
  getMyBookings: (params = {}, opts) => api.get('/provider/bookings', { params, ...opts }),
  updateBookingStatus: (bookingId, statusData) =>
    api.put(`/provider/bookings/${bookingId}/status`, statusData),
  updatePaymentInfo: (bookingId, paymentData) =>
    api.put(`/provider/bookings/${bookingId}/payment`, paymentData),

  // Dashboard
  getDashboard: (opts) => api.get('/provider/dashboard', opts),

  // Earnings
  getEarnings: (opts) => api.get('/provider/earnings', opts),

  // Availability
  toggleAvailability: (isAvailable) =>
    api.put('/provider/availability', { isAvailable }),

  // KYC self-service
  getMyKyc: () => api.get('/users/profile/kyc'),
  submitKyc: ({ aadhaar, pan, selfie }) => {
    const fd = new FormData();
    if (aadhaar instanceof File) fd.append('aadhaar', aadhaar);
    if (pan instanceof File) fd.append('pan', pan);
    if (selfie instanceof File) fd.append('selfie', selfie);
    return api.post('/users/profile/kyc', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

// Customer API endpoints
export const customerAPI = {
  // Dashboard
  getDashboard: (opts) => api.get('/customer/dashboard', opts),

  // Profile management
  getProfile: (opts) => api.get('/customer/profile', opts),
  updateProfile: (profileData) => {
    const formData = new FormData();

    // Handle file upload
    if (profileData.profileImage && profileData.profileImage instanceof File) {
      formData.append('profileImage', profileData.profileImage);
    }

    // Handle other profile data
    Object.keys(profileData).forEach(key => {
      if (key !== 'profileImage') {
        if (typeof profileData[key] === 'object' && profileData[key] !== null) {
          formData.append(key, JSON.stringify(profileData[key]));
        } else {
          formData.append(key, profileData[key]);
        }
      }
    });

    return api.put('/customer/profile', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Booking management
  getBookings: (params, opts) => api.get('/customer/bookings', { params, ...opts }),
  getBookingById: (bookingId, opts) => api.get(`/customer/bookings/${bookingId}`, opts),
  createBooking: (bookingData) => api.post('/customer/bookings', bookingData),
  cancelBooking: (bookingId, reason) =>
    api.put(`/customer/bookings/${bookingId}/cancel`, { reason }),

  // Provider details
  getProviderDetails: (providerId, opts) => api.get(`/customer/providers/${providerId}`, opts),

  // Reviews (with optional photos: pass File[] in `images`)
  createReview: (reviewData) => {
    if (reviewData?.images?.length) {
      const fd = new FormData();
      Object.keys(reviewData).forEach((key) => {
        if (key === 'images') {
          reviewData.images.forEach((img) => {
            if (img instanceof File) fd.append('images', img);
          });
        } else if (typeof reviewData[key] === 'object' && reviewData[key] !== null) {
          fd.append(key, JSON.stringify(reviewData[key]));
        } else if (reviewData[key] !== undefined && reviewData[key] !== null) {
          fd.append(key, reviewData[key]);
        }
      });
      return api.post('/customer/reviews', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.post('/customer/reviews', reviewData);
  },
  getMyReviews: (params = {}) => api.get('/customer/reviews', { params }),
  getPendingReviews: () => api.get('/customer/reviews/pending'),

  // Favorites/Wishlist
  getFavorites: () => api.get('/customer/favorites'),
  toggleFavorite: (serviceId) => api.post(`/customer/favorites/${serviceId}`),

  // Saved providers (distinct from favorites)
  getSavedProviders: () => api.get('/customer/saved-providers'),

  // Recurring booking series management
  getRecurringSeries: () => api.get('/customer/recurring'),
  pauseRecurring: (id) => api.put(`/customer/recurring/${id}/pause`),
  resumeRecurring: (id) => api.put(`/customer/recurring/${id}/resume`),
  skipNextRecurring: (id) => api.put(`/customer/recurring/${id}/skip-next`),
  cancelRecurring: (id) => api.put(`/customer/recurring/${id}/cancel`),

  // Disputes
  getMyDisputes: () => api.get('/customer/disputes'),
};

export const referralsAPI = {
  getMyCode: () => api.get('/referrals/my-code'),
  getStats: () => api.get('/referrals/stats'),
  apply: (code) => api.post('/referrals/apply', { code }),
  validate: (code) => api.post('/referrals/validate', { code }),
};

export const gamificationAPI = {
  getBadges: (providerId) => api.get(`/gamification/badges/${providerId}`),
  getLevel: (providerId) => api.get(`/gamification/level/${providerId}`),
  getProfile: (providerId) => api.get(`/gamification/profile/${providerId}`),
  getLeaderboard: (limit = 10) => api.get('/gamification/leaderboard', { params: { limit } }),
  checkBadges: (providerId) => api.post('/gamification/check-badges', { providerId }),
};

export const recommendationsAPI = {
  getPersonalized: (limit = 10) => api.get('/recommendations', { params: { limit } }),
  getSimilar: (serviceId) => api.get(`/recommendations/similar/${serviceId}`),
  getTrending: () => api.get('/recommendations/trending'),
};

export const invoicesAPI = {
  getInvoice: (bookingId) => api.get(`/invoices/${bookingId}`),
  getHistory: () => api.get('/invoices/history/my'),
  downloadPDF: (bookingId) => api.get(`/invoices/${bookingId}/download`, { responseType: 'blob' }),
};

export const reviewAutomationAPI = {
  analyze: (reviewId) => api.post('/review-automation/analyze', { reviewId }),
  batchAnalyze: () => api.post('/review-automation/batch-analyze'),
  getInsights: () => api.get('/review-automation/insights'),
};

export const notificationsAPI = {
  getAll: (params = {}) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all')
};

// Utility functions
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    return error.response.data?.message || 'An error occurred';
  } else if (error.request) {
    // Request was made but no response received
    return 'Network error. Please check your connection.';
  } else {
    // Something else happened
    return error.message || 'An unexpected error occurred';
  }
};

export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return !!token;
};

export const getStoredUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const setAuthData = (token, user, refreshToken = null) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
};

export const clearAuthData = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('refreshToken');
};

// Clear all browser cache and storage
export const clearBrowserCache = () => {
  // Clear specific auth-related items first
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');

  // Clear all localStorage
  localStorage.clear();

  // Clear sessionStorage
  sessionStorage.clear();

  // Clear cookies (if any)
  try {
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  } catch (error) {
    console.error('Error clearing cookies:', error);
  }

  // Clear browser cache if supported
  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach(name => {
        caches.delete(name);
      });
    }).catch(error => {
      console.error('Error clearing cache:', error);
    });
  }
};

export default api;
