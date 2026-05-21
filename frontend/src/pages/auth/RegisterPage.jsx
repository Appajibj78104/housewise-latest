import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowLeft, Shield, Gift } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LocationPicker from '../../components/map/LocationPicker';
import toast from 'react-hot-toast';

const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('customer');
  const [locationData, setLocationData] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralValid, setReferralValid] = useState(null); // null = not checked, true/false
  const [referralMsg, setReferralMsg] = useState('');
  const { register: registerUser, isLoading, error, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('RegisterPage: User already authenticated, redirecting...');
      if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'housewife') {
        navigate('/provider/dashboard', { replace: true });
      } else if (user.role === 'customer') {
        navigate('/customer/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      role: 'customer'
    }
  });

  const watchedRole = watch('role');

  const onSubmit = async (data) => {
    // Validate location before submitting
    if (!locationData || !locationData.latitude || !locationData.longitude) {
      setLocationError('Please search and select a valid location before registering.');
      return;
    }
    setLocationError('');

    const result = await registerUser({ ...data, locationData, referralCode: referralCode.trim() || undefined });
    if (result.success) {
      // Show role-specific success message
      const userRole = result.user?.role;
      let roleDisplayName = userRole;
      if (userRole === 'housewife' || userRole === 'provider') {
        roleDisplayName = 'provider';
      }
      toast.success(`${roleDisplayName} registered successfully`);

      // Navigate to role-specific dashboard
      if (result.user?.role === 'housewife' || result.user?.role === 'provider') {
        navigate('/provider/dashboard', { replace: true });
      } else if (result.user?.role === 'customer') {
        navigate('/customer/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  };

  const roleOptions = [
    {
      value: 'customer',
      title: 'Customer',
      description: 'I want to book services from housewives',
      icon: '👤'
    },
    {
      value: 'housewife',
      title: 'Service Provider',
      description: 'I want to offer my services to customers',
      icon: '👩‍🍳'
    }
  ];

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
          <h2 className="text-display text-content-primary">Join Our Community</h2>
          <p className="mt-2 text-detail text-content-muted">Create your account to get started</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card p-8 sm:p-10">
          {error && (
            <div className="mb-4 bg-danger-muted border border-danger text-danger-text px-4 py-3 rounded-xl text-detail">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Role Selection */}
            <div>
              <label className="block text-detail font-medium text-content-secondary mb-3">
                I want to join as:
              </label>
              <div className="space-y-3">
                {roleOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`relative flex cursor-pointer rounded-xl border p-4 focus:outline-none transition-all ${
                      watchedRole === option.value
                        ? 'border-coral-500 ring-2 ring-coral-500/40 bg-coral-500/10'
                        : 'border-surface-border bg-surface-raised hover:bg-surface-hover'
                    }`}
                  >
                    <input
                      type="radio"
                      value={option.value}
                      className="sr-only"
                      {...register('role', { required: 'Please select a role' })}
                    />
                    <div className="flex items-center">
                      <div className="text-2xl mr-3">{option.icon}</div>
                      <div className="flex-1">
                        <div className={`font-medium ${
                          watchedRole === option.value ? 'text-coral-300' : 'text-content-secondary'
                        }`}>{option.title}</div>
                        <div className={`text-caption ${
                          watchedRole === option.value ? 'text-coral-400' : 'text-content-muted'
                        }`}>{option.description}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              {errors.role && (
                <p className="mt-1 text-caption text-danger-text">{errors.role.message}</p>
              )}
            </div>

            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-detail font-medium text-content-secondary">
                Full Name
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-content-muted" />
                </div>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  className={`input pl-10 ${
                    errors.name ? 'border-danger' : ''
                  }`}
                  placeholder="Enter your full name"
                  {...register('name', {
                    required: 'Name is required',
                    minLength: {
                      value: 2,
                      message: 'Name must be at least 2 characters',
                    },
                  })}
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-caption text-danger-text">{errors.name.message}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-detail font-medium text-content-secondary">
                Email Address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-content-muted" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={`input pl-10 ${
                    errors.email ? 'border-danger' : ''
                  }`}
                  placeholder="Enter your email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: 'Please enter a valid email address',
                    },
                  })}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-caption text-danger-text">{errors.email.message}</p>
              )}
            </div>

            {/* Phone Field */}
            <div>
              <label htmlFor="phone" className="block text-detail font-medium text-content-secondary">
                Phone Number
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-content-muted" />
                </div>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  className={`input pl-10 ${
                    errors.phone ? 'border-danger' : ''
                  }`}
                  placeholder="Enter your phone number"
                  {...register('phone', {
                    required: 'Phone number is required',
                    pattern: {
                      value: /^[0-9]{10}$/,
                      message: 'Please enter a valid 10-digit phone number',
                    },
                  })}
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-caption text-danger-text">{errors.phone.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-detail font-medium text-content-secondary">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-content-muted" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`input pl-10 pr-10 ${
                    errors.password ? 'border-danger' : ''
                  }`}
                  placeholder="Create a password"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-content-muted hover:text-content-secondary transition-colors" />
                  ) : (
                    <Eye className="h-4 w-4 text-content-muted hover:text-content-secondary transition-colors" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-caption text-danger-text">{errors.password.message}</p>
              )}
            </div>

            {/* Location Field */}
            <div>
              <label className="block text-detail font-medium text-content-secondary mb-2">
                Your Location
                <span className="text-danger-text ml-1">*</span>
              </label>
              <LocationPicker
                onLocationSelect={(data) => {
                  setLocationData(data);
                  if (data) setLocationError('');
                }}
                error={locationError}
              />
            </div>

            {/* Housewife specific fields */}
            {watchedRole === 'housewife' && (
              <>
                <div>
                  <label htmlFor="bio" className="block text-detail font-medium text-content-secondary">
                    Bio (Optional)
                  </label>
                  <textarea
                    id="bio"
                    rows={3}
                    className="textarea"
                    placeholder="Tell us about yourself and your skills..."
                    {...register('bio')}
                  />
                </div>

                <div>
                  <label htmlFor="experience" className="block text-detail font-medium text-content-secondary">
                    Years of Experience (Optional)
                  </label>
                  <input
                    id="experience"
                    type="number"
                    min="0"
                    max="50"
                    className="input"
                    placeholder="Enter years of experience"
                    {...register('experience', {
                      min: {
                        value: 0,
                        message: 'Experience cannot be negative',
                      },
                    })}
                  />
                  {errors.experience && (
                    <p className="mt-1 text-caption text-danger-text">{errors.experience.message}</p>
                  )}
                </div>
              </>
            )}

            {/* Referral Code (Optional) */}
            <div>
              <label htmlFor="referralCode" className="block text-detail font-medium text-content-secondary">
                Referral Code <span className="text-content-muted font-normal">(Optional)</span>
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Gift className="h-4 w-4 text-content-muted" />
                </div>
                <input
                  id="referralCode"
                  type="text"
                  className={`input pl-10 uppercase ${referralValid === true ? 'border-emerald-500' : referralValid === false ? 'border-danger' : ''}`}
                  placeholder="Enter referral code (if any)"
                  value={referralCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                    setReferralCode(val);
                    setReferralValid(null);
                    setReferralMsg('');
                  }}
                  onBlur={async () => {
                    if (!referralCode.trim()) { setReferralValid(null); setReferralMsg(''); return; }
                    try {
                      const { default: api } = await import('../../services/api');
                      const res = await api.post('/referrals/validate', { code: referralCode.trim() });
                      if (res.data?.valid) {
                        setReferralValid(true);
                        setReferralMsg(`Referred by ${res.data.referrerName}`);
                      } else {
                        setReferralValid(false);
                        setReferralMsg('Invalid referral code');
                      }
                    } catch {
                      setReferralValid(false);
                      setReferralMsg('Could not validate code');
                    }
                  }}
                />
              </div>
              {referralMsg && (
                <p className={`mt-1 text-caption ${referralValid ? 'text-emerald-500' : 'text-danger-text'}`}>{referralMsg}</p>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-center">
              <input
                id="terms"
                type="checkbox"
                className="h-4 w-4 text-coral-600 focus:ring-coral-500 border-surface-border bg-surface-raised rounded"
                {...register('terms', {
                  required: 'You must accept the terms and conditions',
                })}
              />
              <label htmlFor="terms" className="ml-2 block text-detail text-content-secondary">
                I agree to the{' '}
                <Link to="/terms" className="text-coral-400 hover:text-coral-300 transition-colors">
                  Terms and Conditions
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-coral-400 hover:text-coral-300 transition-colors">
                  Privacy Policy
                </Link>
              </label>
            </div>
            {errors.terms && (
              <p className="mt-1 text-caption text-danger-text">{errors.terms.message}</p>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary w-full"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating account...
                  </div>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </form>

          {/* Sign In Link */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-surface-border" />
              </div>
              <div className="relative flex justify-center text-detail">
                <span className="px-2 bg-surface-overlay text-content-muted">Already have an account?</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/login"
                className="btn btn-secondary w-full"
              >
                Sign In Instead
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
