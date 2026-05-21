import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { providerAPI } from '../../services/api';
import { Camera, MapPin, Clock, Save, AlertCircle } from 'lucide-react';
import LocationPicker from '../../components/map/LocationPicker';

const ProviderProfile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(user?.profileImage || '');

  // Clear messages when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      setError('');
      setSuccess('');
    };
  }, []);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    address: {
      locationName: user?.address?.locationName || user?.address?.formattedAddress || '',
      city: user?.address?.city || '',
      state: user?.address?.state || '',
      pincode: user?.address?.pincode || '',
      coordinates: {
        latitude: user?.address?.coordinates?.latitude || null,
        longitude: user?.address?.coordinates?.longitude || null
      }
    },
    workingHours: user?.workingHours || [
      { day: 'monday', start: '09:00', end: '17:00', isAvailable: true },
      { day: 'tuesday', start: '09:00', end: '17:00', isAvailable: true },
      { day: 'wednesday', start: '09:00', end: '17:00', isAvailable: true },
      { day: 'thursday', start: '09:00', end: '17:00', isAvailable: true },
      { day: 'friday', start: '09:00', end: '17:00', isAvailable: true },
      { day: 'saturday', start: '09:00', end: '17:00', isAvailable: true },
      { day: 'sunday', start: '09:00', end: '17:00', isAvailable: false }
    ]
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleWorkingHoursChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      workingHours: prev.workingHours.map((hour, i) => 
        i === index ? { ...hour, [field]: value } : hour
      )
    }));
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

  const handleLocationSelect = useCallback((locationData) => {
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
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const updateData = { ...formData };
      if (profileImage) {
        updateData.profileImage = profileImage;
      }

      const response = await providerAPI.updateProfile(updateData);
      updateUser(response.data.user);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const dayNames = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  };

  return (
    <div className="pp-page">
        <div className="card">
          <div className="px-6 py-4 border-b border-surface-border">
            <h1 className="text-display text-content-primary">Profile Settings</h1>
            <p className="text-body text-content-muted">Manage your profile information and availability</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Profile Image */}
          <div className="flex items-center space-x-6">
            <div className="relative">
              <img
                className="h-24 w-24 rounded-full object-cover border-2 border-surface-border"
                src={imagePreview && imagePreview.trim() ? imagePreview : user?.profileImage && user.profileImage.trim() ? user.profileImage : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face'}
                alt="Profile"
                onError={(e) => {
                  if (e.target.src !== 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face') {
                    e.target.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face';
                  }
                }}
              />
              <label className="absolute bottom-0 right-0 bg-accent-blue rounded-full p-2 cursor-pointer hover:bg-accent-blue/80 transition-colors">
                <Camera className="h-4 w-4 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
            <div>
              <h3 className="text-heading font-medium text-content-primary">Profile Photo</h3>
              <p className="text-detail text-content-muted">Upload a professional photo to build trust with customers</p>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-detail font-medium text-content-secondary mb-2">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="input"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-detail font-medium text-content-secondary mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled
                className="input opacity-50 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-detail font-medium text-content-secondary mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                className="input"
                placeholder="Enter your phone number"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-detail font-medium text-content-secondary mb-2">
              About Me
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows={4}
              className="textarea"
              placeholder="Tell customers about yourself, your experience, and what makes you special..."
            />
            <p className="text-caption text-content-muted mt-1">
              {formData.bio.length}/500 characters
            </p>
          </div>

          {/* Location */}
          <div>
            <h3 className="text-heading font-medium text-content-primary mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-accent-blue" />
              Service Location
            </h3>
            <p className="text-caption text-content-muted mb-4">
              Search your service area so customers can find you nearby.
            </p>
            <LocationPicker
              initialValue={formData.address.locationName}
              onLocationSelect={handleLocationSelect}
            />
          </div>

          {/* Working Hours */}
          <div>
            <h3 className="text-heading font-medium text-content-primary mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-accent-blue" />
              Working Hours
            </h3>
            <div className="space-y-4">
              {formData.workingHours.map((hour, index) => (
                <div key={hour.day} className="flex items-center space-x-4 p-4 bg-surface-raised rounded-xl">
                  <div className="w-24">
                    <span className="text-detail font-medium text-content-primary">
                      {dayNames[hour.day]}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={hour.isAvailable}
                      onChange={(e) => handleWorkingHoursChange(index, 'isAvailable', e.target.checked)}
                      className="rounded border-surface-border text-accent-blue focus:ring-accent-blue bg-surface"
                    />
                    <span className="text-detail text-content-secondary">Available</span>
                  </div>

                  {hour.isAvailable && (
                    <>
                      <div>
                        <input
                          type="time"
                          value={hour.start}
                          onChange={(e) => handleWorkingHoursChange(index, 'start', e.target.value)}
                          className="input py-1 px-2 text-detail"
                        />
                      </div>
                      <span className="text-content-muted">to</span>
                      <div>
                        <input
                          type="time"
                          value={hour.end}
                          onChange={(e) => handleWorkingHoursChange(index, 'end', e.target.value)}
                          className="input py-1 px-2 text-detail"
                        />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="flex items-center p-4 bg-danger-muted border border-danger rounded-xl">
              <AlertCircle className="h-5 w-5 text-danger-text mr-2" />
              <span className="text-danger-text">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center p-4 bg-success-muted border border-success rounded-xl">
              <span className="text-success-text">{success}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex items-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default React.memo(ProviderProfile);
