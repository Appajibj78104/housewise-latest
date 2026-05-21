import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Lock, 
  Save, 
  Eye, 
  EyeOff,
  AlertCircle,
  CheckCircle,
  Shield,
  User,
  Mail
} from 'lucide-react';

const AdminSettings = () => {
  const [adminData, setAdminData] = useState({
    name: '',
    email: '',
    role: 'admin'
  });
  
  const [emailData, setEmailData] = useState({
    newEmail: '',
    password: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
    emailPassword: false
  });
  
  const [loading, setLoading] = useState({
    email: false,
    password: false
  });

  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setAdminData({
        name: user.name || 'System Administrator',
        email: user.email || 'admin@example.com',
        role: user.role || 'admin'
      });
      setEmailData(prev => ({ ...prev, newEmail: user.email || 'admin@example.com' }));
    }
  }, []);

  const handleEmailChange = (field, value) => {
    setEmailData(prev => ({ ...prev, [field]: value }));
    setMessage({ type: '', text: '' });
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    setMessage({ type: '', text: '' });
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleEmailUpdate = async (e) => {
    e.preventDefault();
    
    if (!emailData.newEmail || !emailData.password) {
      setMessage({ type: 'error', text: 'Please fill in all email update fields' });
      return;
    }

    if (emailData.newEmail === adminData.email) {
      setMessage({ type: 'error', text: 'New email must be different from current email' });
      return;
    }

    try {
      setLoading(prev => ({ ...prev, email: true }));
      setMessage({ type: '', text: '' });

      setTimeout(() => {
        setMessage({ type: 'success', text: 'Email updated successfully' });
        setAdminData(prev => ({ ...prev, email: emailData.newEmail }));
        
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        storedUser.email = emailData.newEmail;
        localStorage.setItem('user', JSON.stringify(storedUser));
        
        setEmailData({ newEmail: emailData.newEmail, password: '' });
        setLoading(prev => ({ ...prev, email: false }));
      }, 1000);

    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update email' });
      setLoading(prev => ({ ...prev, email: false }));
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'All password fields are required' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
      return;
    }

    try {
      setLoading(prev => ({ ...prev, password: true }));
      setMessage({ type: '', text: '' });

      setTimeout(() => {
        setMessage({ type: 'success', text: 'Password updated successfully' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setLoading(prev => ({ ...prev, password: false }));
      }, 1000);

    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update password' });
      setLoading(prev => ({ ...prev, password: false }));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-display text-content-primary mb-2">Admin Settings</h1>
        <p className="text-body text-content-muted">Manage your admin account settings and preferences</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl border ${
          message.type === 'success' 
            ? 'bg-success-muted border-success text-success-text' 
            : 'bg-danger-muted border-danger text-danger-text'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-6 h-6 text-accent-blue" />
            <h2 className="text-heading font-semibold text-content-primary">Admin Profile</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-detail font-medium text-content-muted mb-1">Name</label>
              <p className="text-content-primary font-medium">{adminData.name}</p>
            </div>
            <div>
              <label className="block text-detail font-medium text-content-muted mb-1">Current Email</label>
              <p className="text-content-primary font-medium">{adminData.email}</p>
            </div>
            <div>
              <label className="block text-detail font-medium text-content-muted mb-1">Role</label>
              <span className="badge-danger flex items-center gap-1 w-fit">
                <Shield className="w-3 h-3" />
                Administrator
              </span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="w-6 h-6 text-success" />
            <h2 className="text-heading font-semibold text-content-primary">Update Email</h2>
          </div>
          
          <form onSubmit={handleEmailUpdate} className="space-y-4">
            <div>
              <label className="block text-detail font-medium text-content-muted mb-2">New Email</label>
              <input
                type="email"
                value={emailData.newEmail}
                onChange={(e) => handleEmailChange('newEmail', e.target.value)}
                className="input"
                placeholder="Enter new email address"
                required
              />
            </div>
            
            <div>
              <label className="block text-detail font-medium text-content-muted mb-2">Current Password</label>
              <div className="relative">
                <input
                  type={showPasswords.emailPassword ? 'text' : 'password'}
                  value={emailData.password}
                  onChange={(e) => handleEmailChange('password', e.target.value)}
                  className="input pr-10"
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('emailPassword')}
                  className="absolute right-3 top-2.5 text-content-muted hover:text-content-primary transition-colors"
                >
                  {showPasswords.emailPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading.email}
              className="btn btn-success w-full"
            >
              {loading.email ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              {loading.email ? 'Updating...' : 'Update Email'}
            </button>
          </form>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-6 h-6 text-warning" />
          <h2 className="text-heading font-semibold text-content-primary">Change Password</h2>
        </div>
        
        <form onSubmit={handlePasswordUpdate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-detail font-medium text-content-muted mb-2">Current Password</label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                className="input pr-10"
                placeholder="Enter current password"
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute right-3 top-2.5 text-content-muted hover:text-content-primary transition-colors"
              >
                {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-detail font-medium text-content-muted mb-2">New Password</label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                className="input pr-10"
                placeholder="Enter new password"
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute right-3 top-2.5 text-content-muted hover:text-content-primary transition-colors"
              >
                {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-detail font-medium text-content-muted mb-2">Confirm Password</label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                className="input pr-10"
                placeholder="Confirm new password"
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute right-3 top-2.5 text-content-muted hover:text-content-primary transition-colors"
              >
                {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={loading.password}
              className="btn btn-primary flex items-center gap-2"
            >
              {loading.password ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Lock className="w-4 h-4" />
              )}
              {loading.password ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-6 h-6 text-accent-purple" />
          <h2 className="text-heading font-semibold text-content-primary">System Information</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-detail font-medium text-content-muted mb-1">Environment</label>
            <p className="text-content-primary">Development</p>
          </div>
          <div>
            <label className="block text-detail font-medium text-content-muted mb-1">Database</label>
            <p className="text-content-primary">MongoDB</p>
          </div>
          <div>
            <label className="block text-detail font-medium text-content-muted mb-1">Server Status</label>
            <span className="badge-success">
              Online
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
