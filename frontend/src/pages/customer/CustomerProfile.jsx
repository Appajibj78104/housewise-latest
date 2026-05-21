import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Camera,
  Save,
  AlertCircle,
  CheckCircle,
  Edit3,
  Calendar,
  Star
} from 'lucide-react';
import { customerAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LocationPicker from '../../components/map/LocationPicker';
import { Card, Button, FormInput, LoadingSpinner } from '../../components/shared';

const CustomerProfile = () => {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: {
      locationName: '',
      city: '',
      state: '',
      coordinates: {
        latitude: null,
        longitude: null
      }
    }
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await customerAPI.getProfile();
      const customerData = response.data.customer;
      setProfile(customerData);
      setImagePreview(customerData.profileImage || '');
      setFormData({
        name: customerData.name || '',
        phone: customerData.phone || '',
        address: {
          locationName: customerData.address?.locationName || customerData.address?.formattedAddress || '',
          city: customerData.address?.city || '',
          state: customerData.address?.state || '',
          coordinates: {
            latitude: customerData.address?.coordinates?.latitude || null,
            longitude: customerData.address?.coordinates?.longitude || null
          }
        }
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLocationSelect = (locationData) => {
    if (!locationData) return;
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        locationName: locationData.locationName,
        city: locationData.city || prev.address.city,
        state: locationData.state || prev.address.state,
        coordinates: {
          latitude: locationData.latitude,
          longitude: locationData.longitude
        }
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updateData = { ...formData };
      if (profileImage) {
        updateData.profileImage = profileImage;
      }

      const response = await customerAPI.updateProfile(updateData);
      updateUser(response.data.customer); // Update auth context
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      setProfileImage(null);
      fetchProfile(); // Refresh profile data
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    setSuccess('');
    // Reset form data to original profile data
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        address: {
          locationName: profile.address?.locationName || profile.address?.formattedAddress || '',
          city: profile.address?.city || '',
          state: profile.address?.state || '',
          coordinates: {
            latitude: profile.address?.coordinates?.latitude || null,
            longitude: profile.address?.coordinates?.longitude || null
          }
        }
      });
    }
  };

  if (loading) {
    return (
      <LoadingSpinner
        size="lg"
       
        text="Loading profile..."
        fullScreen={true}
      />
    );
  }

  if (!profile) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-screen">
        <Card className="text-center p-8">
          <AlertCircle className="w-12 h-12 text-danger-text mx-auto mb-4" />
          <p className="text-content-secondary mb-4">Failed to load profile</p>
          <Button
            onClick={fetchProfile}
           
            variant="primary"
          >
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="cp-page">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display text-content-primary">My Profile</h1>
            <p className="text-content-secondary">Manage your account information</p>
          </div>
          {!isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
             
              variant="primary"
              className="flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>
      {/* Success/Error Messages */}
      {success && (
        <Card className="mb-6 border-success">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-success-text mr-2" />
            <span className="text-success-text">{success}</span>
          </div>
        </Card>
      )}

      {error && (
        <Card className="mb-6 border-danger">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-danger-text mr-2" />
            <span className="text-danger-text">{error}</span>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <Card>
            <div className="text-center">
              <div className="relative inline-block">
                <img
                  src={imagePreview || profile.profileImage || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face'}
                  alt={profile.name}
                  className="w-24 h-24 rounded-full object-cover mx-auto"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face';
                  }}
                />
                {isEditing && (
                  <label className="absolute bottom-0 right-0 p-2 bg-coral-600 text-white rounded-full hover:bg-coral-700 transition-colors cursor-pointer">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <h2 className="mt-4 text-heading font-semibold text-content-primary">
                {profile.name || 'Customer'}
              </h2>
              <p className="text-content-secondary">{profile.email}</p>
              <div className="mt-4 flex items-center justify-center text-caption text-content-muted">
                <Calendar className="w-4 h-4 mr-1" />
                Member since {new Date(profile.createdAt).toLocaleDateString()}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-6 pt-6 border-t border-surface-border">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-coral-400">
                    {profile.bookingStats?.total || 0}
                  </p>
                  <p className="text-detail text-content-secondary">Total Bookings</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-coral-400">
                    {profile.reviewStats?.total || 0}
                  </p>
                  <p className="text-detail text-content-secondary">Reviews Given</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Profile Form */}
        <div className="lg:col-span-2">
          <Card>
            <div className="border-b border-surface-border pb-4 mb-6">
              <h3 className="text-heading font-semibold text-content-primary">
                Personal Information
              </h3>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div>
                  <label className="block text-detail font-medium text-content-secondary mb-2">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-content-muted w-4 h-4" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      required
                      className="pl-10 w-full px-3 py-2 bg-surface-raised border border-surface-border text-white placeholder-content-muted rounded-lg focus:border-coral-500 focus:ring-coral-500 focus:outline-none focus:ring-1 disabled:bg-surface-hover disabled:text-content-muted"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-detail font-medium text-content-secondary mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-content-muted w-4 h-4" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="pl-10 w-full px-3 py-2 bg-surface-raised border border-surface-border text-white placeholder-content-muted rounded-lg focus:border-coral-500 focus:ring-coral-500 focus:outline-none focus:ring-1 disabled:bg-surface-hover disabled:text-content-muted"
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>

                {/* Email (Read-only) */}
                <div className="md:col-span-2">
                  <label className="block text-detail font-medium text-content-secondary mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-content-muted w-4 h-4" />
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="pl-10 w-full px-3 py-2 bg-surface-overlay border border-surface-border text-content-muted rounded-lg"
                    />
                  </div>
                  <p className="mt-1 text-micro text-content-muted">
                    Email cannot be changed. Contact support if needed.
                  </p>
                </div>
              </div>

              {/* Address Section */}
              <div className="mt-8">
                <h4 className="text-md font-medium text-content-primary mb-4 flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  Address Information
                </h4>

                {isEditing ? (
                  <LocationPicker
                    initialValue={formData.address.locationName}
                    onLocationSelect={handleLocationSelect}
                  />
                ) : (
                  formData.address.locationName && (
                    <div className="flex items-center gap-2 p-3 bg-surface-raised border border-surface-border rounded-xl">
                      <MapPin className="h-4 w-4 text-accent-blue shrink-0" />
                      <div>
                        <p className="text-detail text-content-primary">{formData.address.locationName}</p>
                        {(formData.address.city || formData.address.state) && (
                          <p className="text-caption text-content-muted">
                            {[formData.address.city, formData.address.state].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div className="mt-8 flex items-center justify-end space-x-4">
                  <Button
                    type="button"
                    onClick={handleCancel}
                   
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                   
                    variant="primary"
                    className="flex items-center gap-2"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;
