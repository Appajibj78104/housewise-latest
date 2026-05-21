import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance for admin API
const adminAPI = axios.create({
  baseURL: `${API_BASE_URL}/admin`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
adminAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
adminAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const adminAPIService = {
  // Authentication - Admin login goes through normal auth endpoint
  login: async (credentials) => {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);
    if (response.data.success && response.data.data.isAdmin) {
      localStorage.setItem('adminToken', response.data.data.token);
      localStorage.setItem('adminUser', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  logout: async () => {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
    } finally {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
    }
  },

  // Dashboard
  getOverview: async () => {
    const response = await adminAPI.get('/overview');
    return response.data;
  },

  // Customers
  getCustomers: async (params = {}) => {
    const response = await adminAPI.get('/customers', { params });
    return response.data;
  },

  toggleCustomerStatus: async (customerId) => {
    const response = await adminAPI.put(`/customers/${customerId}/toggle`);
    return response.data;
  },

  // Providers
  getPendingProviders: async (params = {}) => {
    const response = await adminAPI.get('/providers/pending', { params });
    return response.data;
  },

  getApprovedProviders: async (params = {}) => {
    const response = await adminAPI.get('/providers/approved', { params });
    return response.data;
  },

  approveProvider: async (providerId) => {
    const response = await adminAPI.put(`/providers/${providerId}/approve`);
    return response.data;
  },

  rejectProvider: async (providerId) => {
    const response = await adminAPI.put(`/providers/${providerId}/reject`);
    return response.data;
  },

  toggleProviderStatus: async (providerId) => {
    const response = await adminAPI.put(`/providers/${providerId}/toggle`);
    return response.data;
  },

  // Bookings
  getBookings: async (params = {}) => {
    const response = await adminAPI.get('/bookings', { params });
    return response.data;
  },

  updateBookingStatus: async (bookingId, status) => {
    const response = await adminAPI.put(`/bookings/${bookingId}/status`, { status });
    return response.data;
  },

  // Reviews
  getReviews: async (params = {}) => {
    const response = await adminAPI.get('/reviews', { params });
    return response.data;
  },

  flagReview: async (reviewId, flagged) => {
    const response = await adminAPI.put(`/reviews/${reviewId}/flag`, { flagged });
    return response.data;
  },

  deleteReview: async (reviewId) => {
    const response = await adminAPI.delete(`/reviews/${reviewId}`);
    return response.data;
  },

  // Settings
  changePassword: async (passwordData) => {
    const response = await adminAPI.post('/settings/password', passwordData);
    return response.data;
  },

  // Analytics
  getAnalytics: async (params = {}) => {
    const response = await adminAPI.get('/analytics', { params });
    return response.data;
  },

  // Activity Log / Audit Trail
  getActivityLogs: async (params = {}) => {
    const response = await adminAPI.get('/activity', { params });
    return response.data;
  },

  logActivity: async (data) => {
    const response = await adminAPI.post('/activity', data);
    return response.data;
  },

  // Export
  exportData: async (params = {}) => {
    const response = await adminAPI.get('/export', { params, responseType: 'blob' });
    return response;
  },

  // ═══════════════════════════════════════
  // EXTENDED ADMIN APIs
  // ═══════════════════════════════════════

  // Provider Detail & Management
  getProviderDetail: async (providerId) => {
    const response = await adminAPI.get(`/providers/${providerId}`);
    return response.data;
  },

  bulkProviderAction: async (data) => {
    const response = await adminAPI.post('/providers/bulk-action', data);
    return response.data;
  },

  getProviderRankings: async (params = {}) => {
    const response = await adminAPI.get('/providers/rankings', { params });
    return response.data;
  },

  notifyProviders: async (data) => {
    const response = await adminAPI.post('/providers/notify', data);
    return response.data;
  },

  // Booking Search & Management
  searchBookings: async (params = {}) => {
    const response = await adminAPI.get('/bookings/search', { params });
    return response.data;
  },

  getBookingDetail: async (bookingId) => {
    const response = await adminAPI.get(`/bookings/${bookingId}`);
    return response.data;
  },

  processRefund: async (bookingId, data) => {
    const response = await adminAPI.post(`/bookings/${bookingId}/refund`, data);
    return response.data;
  },

  bulkBookingStatus: async (data) => {
    const response = await adminAPI.post('/bookings/bulk-status', data);
    return response.data;
  },

  // Dispute resolution
  listDisputes: async (params = {}) => {
    const response = await adminAPI.get('/disputes', { params });
    return response.data;
  },

  resolveDispute: async (bookingId, data) => {
    const response = await adminAPI.post(`/bookings/${bookingId}/dispute/resolve`, data);
    return response.data;
  },

  // KYC moderation
  listPendingKyc: async () => {
    const response = await adminAPI.get('/kyc/pending');
    return response.data;
  },

  approveKyc: async (userId) => {
    const response = await adminAPI.post(`/kyc/${userId}/approve`);
    return response.data;
  },

  rejectKyc: async (userId, data) => {
    const response = await adminAPI.post(`/kyc/${userId}/reject`, data);
    return response.data;
  },

  // Review Enhanced
  autoFlagReviews: async () => {
    const response = await adminAPI.post('/reviews/auto-flag');
    return response.data;
  },

  respondToReview: async (reviewId, data) => {
    const response = await adminAPI.post(`/reviews/${reviewId}/respond`, data);
    return response.data;
  },

  getReviewTrends: async (params = {}) => {
    const response = await adminAPI.get('/reviews/trends', { params });
    return response.data;
  },

  // Services Management
  getServices: async (params = {}) => {
    const response = await adminAPI.get('/services', { params });
    return response.data;
  },

  toggleService: async (serviceId, field) => {
    const response = await adminAPI.put(`/services/${serviceId}/toggle`, { field });
    return response.data;
  },

  // Categories Management
  getCategories: async () => {
    const response = await adminAPI.get('/categories');
    return response.data;
  },

  createCategory: async (data) => {
    const response = await adminAPI.post('/categories', data);
    return response.data;
  },

  updateCategory: async (categoryId, data) => {
    const response = await adminAPI.put(`/categories/${categoryId}`, data);
    return response.data;
  },

  deleteCategory: async (categoryId) => {
    const response = await adminAPI.delete(`/categories/${categoryId}`);
    return response.data;
  },

  // Financial Reports
  getFinancialOverview: async (params = {}) => {
    const response = await adminAPI.get('/financial', { params });
    return response.data;
  },

  // Notifications Management
  broadcastNotification: async (data) => {
    const response = await adminAPI.post('/notifications/broadcast', data);
    return response.data;
  },

  getNotificationHistory: async (params = {}) => {
    const response = await adminAPI.get('/notifications/history', { params });
    return response.data;
  },

  // System Settings
  getSystemSettings: async () => {
    const response = await adminAPI.get('/settings/system');
    return response.data;
  },

  updateSystemSettings: async (settings) => {
    const response = await adminAPI.put('/settings/system', { settings });
    return response.data;
  },

  // Content Management
  getContentPages: async (params = {}) => {
    const response = await adminAPI.get('/content', { params });
    return response.data;
  },

  upsertContentPage: async (slug, data) => {
    const response = await adminAPI.put(`/content/${slug}`, data);
    return response.data;
  },

  deleteContentPage: async (slug) => {
    const response = await adminAPI.delete(`/content/${slug}`);
    return response.data;
  },

  // Support Tickets
  getSupportTickets: async (params = {}) => {
    const response = await adminAPI.get('/support', { params });
    return response.data;
  },

  getTicketDetail: async (ticketId) => {
    const response = await adminAPI.get(`/support/${ticketId}`);
    return response.data;
  },

  respondToTicket: async (ticketId, data) => {
    const response = await adminAPI.post(`/support/${ticketId}/respond`, data);
    return response.data;
  },

  updateTicketStatus: async (ticketId, data) => {
    const response = await adminAPI.put(`/support/${ticketId}/status`, data);
    return response.data;
  },
};

// Admin auth utilities
export const adminAuth = {
  isAuthenticated: () => {
    const token = localStorage.getItem('adminToken');
    const user = localStorage.getItem('adminUser');
    return !!(token && user);
  },

  getUser: () => {
    const user = localStorage.getItem('adminUser');
    return user ? JSON.parse(user) : null;
  },

  getToken: () => {
    return localStorage.getItem('adminToken');
  },

  logout: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
  },

  // Health check
  getHealthCheck: async () => {
    const response = await adminAPI.get('/health');
    return response.data;
  },
};

export default adminAPIService;
