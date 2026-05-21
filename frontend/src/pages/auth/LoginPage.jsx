import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated (check both regular and admin tokens)
  useEffect(() => {
    // Prevent infinite loops by checking if we're already navigating
    if (isLoading) return;

    console.log('LoginPage: Checking authentication state...', { isAuthenticated, userRole: user?.role });

    // Check for admin authentication first
    const adminToken = localStorage.getItem('adminToken');
    const adminUser = localStorage.getItem('adminUser');

    if (adminToken && adminUser) {
      try {
        const adminUserData = JSON.parse(adminUser);
        if (adminUserData.role === 'admin') {
          console.log('LoginPage: Admin already authenticated, redirecting to admin dashboard');
          navigate('/admin/dashboard', { replace: true });
          return;
        }
      } catch (error) {
        console.error('LoginPage: Error parsing admin user data:', error);
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
      }
    }

    // Check for regular user authentication
    if (isAuthenticated && user) {
      console.log('LoginPage: User already authenticated, redirecting...', user.role);
      if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'housewife') {
        navigate('/provider/dashboard', { replace: true });
      } else if (user.role === 'customer') {
        navigate('/customer/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, isLoading]); // Add isLoading to dependencies

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-surface-border border-t-coral-500"></div>
      </div>
    );
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    console.log('LoginPage: Attempting login with:', data.email);
    const result = await login(data);
    console.log('LoginPage: Login result:', result);

    if (result.success) {
      console.log('LoginPage: Login successful, user role:', result.user?.role);

      // Show role-specific success message
      const userRole = result.user?.role;
      let roleDisplayName = userRole;
      if (userRole === 'housewife' || userRole === 'provider') {
        roleDisplayName = 'provider';
      }
      toast.success(`${roleDisplayName} login successful`);

      // Navigate immediately based on user role
      if (result.isAdmin) {
        console.log('LoginPage: Redirecting to admin dashboard');
        navigate('/admin/dashboard', { replace: true });
      } else if (result.user?.role === 'housewife' || result.user?.role === 'provider') {
        console.log('LoginPage: Redirecting to provider dashboard');
        navigate('/provider/dashboard', { replace: true });
      } else if (result.user?.role === 'customer') {
        console.log('LoginPage: Redirecting to customer dashboard');
        navigate('/customer/dashboard', { replace: true });
      } else {
        console.log('LoginPage: Fallback redirect to dashboard');
        navigate('/dashboard', { replace: true });
      }
    } else {
      // Show specific error message for login failure
      toast.error('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="inline-flex items-center text-detail text-content-muted hover:text-coral-400 mb-6 transition-colors">
          <ArrowLeft size={15} className="mr-1" />
          Back to Home
        </Link>

        <div className="text-center">
          <div className="mx-auto w-11 h-11 bg-gradient-to-br from-coral-500 to-coral-600 rounded-xl flex items-center justify-center mb-4 shadow-glow-coral">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-display text-content-primary">Welcome Back</h2>
          <p className="mt-2 text-detail text-content-muted">Sign in to your account to continue</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card p-8 sm:p-10">
          {error && (
            <div className="mb-4 bg-danger-muted border border-danger text-danger-text px-4 py-3 rounded-xl text-detail">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="email" className="block text-detail font-medium text-content-secondary mb-1.5">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-content-muted" />
                </div>
                <input
                  id="email" type="email" autoComplete="email"
                  className={`input pl-10 ${errors.email ? 'border-danger' : ''}`}
                  placeholder="Enter your email"
                  {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: 'Please enter a valid email address' } })}
                />
              </div>
              {errors.email && <p className="mt-1 text-caption text-danger-text">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-detail font-medium text-content-secondary mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-content-muted" />
                </div>
                <input
                  id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                  className={`input pl-10 pr-10 ${errors.password ? 'border-danger' : ''}`}
                  placeholder="Enter your password"
                  {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } })}
                />
                <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4 text-content-muted hover:text-content-secondary" /> : <Eye className="h-4 w-4 text-content-muted hover:text-content-secondary" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-caption text-danger-text">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-coral-600 focus:ring-coral-500 border-surface-border bg-surface-raised rounded" />
                <label htmlFor="remember-me" className="ml-2 block text-caption text-content-secondary">Remember me</label>
              </div>
              <Link to="/forgot-password" className="text-caption font-medium text-coral-400 hover:text-coral-300 transition-colors">Forgot your password?</Link>
            </div>

            <button type="submit" disabled={isLoading} className="btn btn-primary w-full">
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2"></div>
                  Signing in...
                </div>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-surface-border" /></div>
              <div className="relative flex justify-center text-caption"><span className="px-3 bg-surface-overlay text-content-muted">Don't have an account?</span></div>
            </div>
            <div className="mt-5">
              <Link to="/register" className="btn btn-secondary w-full text-center">Create New Account</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
