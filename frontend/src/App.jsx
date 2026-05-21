import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/shared/ErrorBoundary';
import PageTransition from './components/shared/PageTransition';

// Layout Components (always needed)
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Layout wrappers — eagerly imported so they share the main React instance.
// These are small; the heavy page-content is still lazy.
import ProviderLayout from './components/provider/ProviderLayout';
import CustomerLayout from './components/customer/CustomerLayout';
import AdminLayout from './components/admin/AdminLayout';

// Eager: auth pages (small, first-paint routes)
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';

// Lazy: HomePage — largest component (~2100 lines), code-split it
const HomePage = lazy(() => import('./pages/HomePage'));

// Lazy-loaded: role-specific pages (code-split per role)
const HousewifeProfilePage = lazy(() => import('./pages/profiles/HousewifeProfilePage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const BookingsPage = lazy(() => import('./pages/bookings/BookingsPage'));
const BookingDetailPage = lazy(() => import('./pages/bookings/BookingDetailPage'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));

// Admin
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminCustomers = lazy(() => import('./pages/admin/AdminCustomers'));
const AdminProviders = lazy(() => import('./pages/admin/AdminProviders'));
const AdminBookings = lazy(() => import('./pages/admin/AdminBookings'));
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminServices = lazy(() => import('./pages/admin/AdminServices'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminFinancial = lazy(() => import('./pages/admin/AdminFinancial'));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'));
const AdminSystemSettings = lazy(() => import('./pages/admin/AdminSystemSettings'));
const AdminContent = lazy(() => import('./pages/admin/AdminContent'));
const AdminSupport = lazy(() => import('./pages/admin/AdminSupport'));
const AdminProviderDetail = lazy(() => import('./pages/admin/AdminProviderDetail'));
const AdminHealth = lazy(() => import('./pages/admin/AdminHealth'));
const AdminReviewAutomation = lazy(() => import('./pages/admin/AdminReviewAutomation'));

// Provider
const ProviderDashboard = lazy(() => import('./pages/provider/ProviderDashboard'));
const ProviderProfile = lazy(() => import('./pages/provider/ProviderProfile'));
const ProviderServices = lazy(() => import('./pages/provider/ProviderServices'));
const ServiceForm = lazy(() => import('./pages/provider/ServiceForm'));
const ProviderBookings = lazy(() => import('./pages/provider/ProviderBookings'));
const ProviderEarnings = lazy(() => import('./pages/provider/ProviderEarnings'));
const ProviderReviews = lazy(() => import('./pages/provider/ProviderReviews'));

// Customer
const CustomerDashboard = lazy(() => import('./pages/customer/CustomerDashboard'));
const CustomerProfile = lazy(() => import('./pages/customer/CustomerProfile'));
const CustomerBookings = lazy(() => import('./pages/customer/CustomerBookings'));
const BookingDetail = lazy(() => import('./pages/customer/BookingDetail'));
const BrowseServices = lazy(() => import('./pages/customer/BrowseServices'));
const ServiceDetail = lazy(() => import('./pages/customer/ServiceDetail'));
const CustomerReviews = lazy(() => import('./pages/customer/CustomerReviews'));
const ReviewForm = lazy(() => import('./pages/customer/ReviewForm'));
const ServiceMapDiscovery = lazy(() => import('./pages/customer/ServiceMapDiscovery'));
const ReferralPage = lazy(() => import('./pages/customer/ReferralPage'));
const InvoicePage = lazy(() => import('./pages/customer/InvoicePage'));
const CustomerInvoices = lazy(() => import('./pages/customer/CustomerInvoices'));
const SavedProviders = lazy(() => import('./pages/customer/SavedProviders'));
const CustomerProviderProfile = lazy(() => import('./pages/customer/CustomerProviderProfile'));
const RecurringBookings = lazy(() => import('./pages/customer/RecurringBookings'));
const Disputes = lazy(() => import('./pages/customer/Disputes'));

// Provider extras
const KYCVerification = lazy(() => import('./pages/provider/KYCVerification'));

// Admin extras
const AdminKyc = lazy(() => import('./pages/admin/AdminKyc'));
const AdminDisputes = lazy(() => import('./pages/admin/AdminDisputes'));

// Helper function to normalize user roles for backward compatibility
const normalizeUserRole = (role) => {
  if (role === 'provider') return 'housewife'; // Normalize provider to housewife
  return role;
};

// Helper function to check if roles match (with normalization)
const rolesMatch = (userRole, requiredRole) => {
  const normalizedUserRole = normalizeUserRole(userRole);
  const normalizedRequiredRole = normalizeUserRole(requiredRole);
  return normalizedUserRole === normalizedRequiredRole;
};

// Route skeleton fallback (non-blocking)
const RouteSkeleton = () => (
  <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
    <div className="animate-pulse" style={{ width: '200px', height: '24px', background: '#1E2230', borderRadius: '8px' }} />
    <div className="animate-pulse" style={{ width: '100%', height: '120px', background: '#1E2230', borderRadius: '12px' }} />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '16px' }}>
      {[1,2,3].map(i => <div key={i} className="animate-pulse" style={{ height: '160px', background: '#1E2230', borderRadius: '12px' }} />)}
    </div>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, user, isLoading, logout } = useAuth();

  if (isLoading) {
    return <RouteSkeleton />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !rolesMatch(user?.role, requiredRole)) {
    const normalizedRole = normalizeUserRole(user?.role);
    if (normalizedRole === 'housewife') {
      return <Navigate to="/provider/dashboard" replace />;
    } else if (normalizedRole === 'customer') {
      return <Navigate to="/customer/dashboard" replace />;
    } else if (normalizedRole === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <RouteSkeleton />;
  }

  if (isAuthenticated && user) {
    const normalizedRole = normalizeUserRole(user?.role);
    if (normalizedRole === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (normalizedRole === 'housewife') {
      return <Navigate to="/provider/dashboard" replace />;
    } else if (normalizedRole === 'customer') {
      return <Navigate to="/customer/dashboard" replace />;
    } else {
      // Unknown role, stay on public route
    }
  }

  return children;
};

// Main App Layout
const AppLayout = ({ children, showNavbar = true, showFooter = true }) => {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {showNavbar && <Navbar />}
      <main className="flex-1">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
};

// Animated Routes — needs useLocation inside Router
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<RouteSkeleton />}>
      <Routes location={location} key={location.pathname}>
        {/* Public Routes */}
        <Route path="/" element={
          <AppLayout showFooter={false}>
            <PageTransition><HomePage /></PageTransition>
          </AppLayout>
        } />

        <Route path="/housewife/:id" element={
          <AppLayout>
            <PageTransition><HousewifeProfilePage /></PageTransition>
          </AppLayout>
        } />

        {/* Auth Routes */}
        <Route path="/login" element={
          <PublicRoute>
            <PageTransition><LoginPage /></PageTransition>
          </PublicRoute>
        } />

        <Route path="/register" element={
          <PublicRoute>
            <PageTransition><RegisterPage /></PageTransition>
          </PublicRoute>
        } />

        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition><DashboardPage /></PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/bookings" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition><BookingsPage /></PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/bookings/:id" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition><BookingDetailPage /></PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition><ProfilePage /></PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        {/* Provider Routes */}
        <Route path="/provider/dashboard" element={
          <ProtectedRoute requiredRole="provider">
            <ProviderLayout>
              <PageTransition><ProviderDashboard /></PageTransition>
            </ProviderLayout>
          </ProtectedRoute>
        } />

        <Route path="/provider/profile" element={
          <ProtectedRoute requiredRole="provider">
            <ProviderLayout>
              <PageTransition><ProviderProfile /></PageTransition>
            </ProviderLayout>
          </ProtectedRoute>
        } />

        <Route path="/provider/services" element={
          <ProtectedRoute requiredRole="provider">
            <ProviderLayout>
              <PageTransition><ProviderServices /></PageTransition>
            </ProviderLayout>
          </ProtectedRoute>
        } />

        <Route path="/provider/services/new" element={
          <ProtectedRoute requiredRole="provider">
            <ProviderLayout>
              <PageTransition><ServiceForm /></PageTransition>
            </ProviderLayout>
          </ProtectedRoute>
        } />

        <Route path="/provider/services/:id/edit" element={
          <ProtectedRoute requiredRole="provider">
            <ProviderLayout>
              <PageTransition><ServiceForm /></PageTransition>
            </ProviderLayout>
          </ProtectedRoute>
        } />

        <Route path="/provider/bookings" element={
          <ProtectedRoute requiredRole="provider">
            <ProviderLayout>
              <PageTransition><ProviderBookings /></PageTransition>
            </ProviderLayout>
          </ProtectedRoute>
        } />

        <Route path="/provider/earnings" element={
          <ProtectedRoute requiredRole="provider">
            <ProviderLayout>
              <PageTransition><ProviderEarnings /></PageTransition>
            </ProviderLayout>
          </ProtectedRoute>
        } />

        <Route path="/provider/reviews" element={
          <ProtectedRoute requiredRole="provider">
            <ProviderLayout>
              <PageTransition><ProviderReviews /></PageTransition>
            </ProviderLayout>
          </ProtectedRoute>
        } />

        {/* Customer Routes */}
        <Route path="/customer/dashboard" element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout>
              <PageTransition><CustomerDashboard /></PageTransition>
            </CustomerLayout>
          </ProtectedRoute>
        } />

        <Route path="/customer/profile" element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout>
              <PageTransition><CustomerProfile /></PageTransition>
            </CustomerLayout>
          </ProtectedRoute>
        } />

        <Route path="/customer/bookings" element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout>
              <PageTransition><CustomerBookings /></PageTransition>
            </CustomerLayout>
          </ProtectedRoute>
        } />

        <Route path="/customer/bookings/:id" element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout>
              <PageTransition><BookingDetail /></PageTransition>
            </CustomerLayout>
          </ProtectedRoute>
        } />

        <Route path="/customer/services" element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout>
              <PageTransition><BrowseServices /></PageTransition>
            </CustomerLayout>
          </ProtectedRoute>
        } />

        <Route path="/customer/services/:id" element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout>
              <PageTransition><ServiceDetail /></PageTransition>
            </CustomerLayout>
          </ProtectedRoute>
        } />

        <Route path="/customer/reviews" element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout>
              <PageTransition><CustomerReviews /></PageTransition>
            </CustomerLayout>
          </ProtectedRoute>
        } />

        <Route path="/customer/reviews/new" element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout>
              <PageTransition><ReviewForm /></PageTransition>
            </CustomerLayout>
          </ProtectedRoute>
        } />

        <Route path="/customer/map" element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout>
              <PageTransition><ServiceMapDiscovery /></PageTransition>
            </CustomerLayout>
          </ProtectedRoute>
        } />

        <Route path="/customer/referrals" element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout>
              <PageTransition><ReferralPage /></PageTransition>
            </CustomerLayout>
          </ProtectedRoute>
        } />

        <Route path="/customer/invoice/:bookingId" element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout>
              <PageTransition><InvoicePage /></PageTransition>
            </CustomerLayout>
          </ProtectedRoute>
        } />

        <Route path="/customer/invoices" element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout>
              <PageTransition><CustomerInvoices /></PageTransition>
            </CustomerLayout>
          </ProtectedRoute>
        } />

        <Route path="/customer/saved-providers" element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout>
              <PageTransition><SavedProviders /></PageTransition>
            </CustomerLayout>
          </ProtectedRoute>
        } />

        <Route path="/customer/providers/:id" element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout>
              <PageTransition><CustomerProviderProfile /></PageTransition>
            </CustomerLayout>
          </ProtectedRoute>
        } />

        <Route path="/customer/recurring" element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout>
              <PageTransition><RecurringBookings /></PageTransition>
            </CustomerLayout>
          </ProtectedRoute>
        } />

        <Route path="/customer/disputes" element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout>
              <PageTransition><Disputes /></PageTransition>
            </CustomerLayout>
          </ProtectedRoute>
        } />

        <Route path="/provider/kyc" element={
          <ProtectedRoute requiredRole="provider">
            <ProviderLayout>
              <PageTransition><KYCVerification /></PageTransition>
            </ProviderLayout>
          </ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <PageTransition><AdminDashboard /></PageTransition>
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/customers" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <PageTransition><AdminCustomers /></PageTransition>
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/providers" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <PageTransition><AdminProviders /></PageTransition>
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/bookings" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <PageTransition><AdminBookings /></PageTransition>
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/reviews" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <PageTransition><AdminReviews /></PageTransition>
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/settings" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <PageTransition><AdminSettings /></PageTransition>
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/services" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <PageTransition><AdminServices /></PageTransition>
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/categories" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <PageTransition><AdminCategories /></PageTransition>
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/financial" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <PageTransition><AdminFinancial /></PageTransition>
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/notifications" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <PageTransition><AdminNotifications /></PageTransition>
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/system-settings" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <PageTransition><AdminSystemSettings /></PageTransition>
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/content" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <PageTransition><AdminContent /></PageTransition>
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/support" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <PageTransition><AdminSupport /></PageTransition>
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/providers/:id" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <PageTransition><AdminProviderDetail /></PageTransition>
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/health" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <PageTransition><AdminHealth /></PageTransition>
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/review-automation" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <PageTransition><AdminReviewAutomation /></PageTransition>
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/kyc" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <PageTransition><AdminKyc /></PageTransition>
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/disputes" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <PageTransition><AdminDisputes /></PageTransition>
            </AdminLayout>
          </ProtectedRoute>
        } />

        {/* 404 Route */}
        <Route path="*" element={
          <AppLayout>
            <PageTransition><NotFoundPage /></PageTransition>
          </AppLayout>
        } />
      </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

// App Component
function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider>
    <AuthProvider>
      <Router>
        <div className="App">
          <Toaster
            position="top-right"
            gutter={10}
            containerStyle={{ top: 20, right: 20 }}
            toastOptions={{
              duration: 4000,
              style: {
                background: '#181C24',
                color: '#F1F3F7',
                borderRadius: '12px',
                padding: '14px 20px',
                fontSize: '14px',
                fontFamily: 'Inter, system-ui, sans-serif',
                boxShadow: '0 8px 32px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.06)',
                maxWidth: '420px',
              },
              success: {
                duration: 3000,
                iconTheme: { primary: '#34D399', secondary: '#181C24' },
                style: { borderLeft: '4px solid #34D399' },
              },
              error: {
                duration: 5000,
                iconTheme: { primary: '#F87171', secondary: '#181C24' },
                style: { borderLeft: '4px solid #F87171' },
              },
            }}
          />

          <AnimatedRoutes />
        </div>
      </Router>
    </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
