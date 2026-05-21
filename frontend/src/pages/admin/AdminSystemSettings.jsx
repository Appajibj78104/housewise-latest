import React, { useState, useEffect } from 'react';
import {
  Settings, Save, RefreshCw, Shield, CreditCard, Bell, Sliders,
} from 'lucide-react';
import { adminAPIService } from '../../services/adminAPI';

const CATEGORY_ICONS = {
  platform: CreditCard,
  booking: Sliders,
  provider: Shield,
  notification: Bell,
  system: Settings,
};

const CATEGORY_LABELS = {
  platform: 'Platform & Fees',
  booking: 'Booking Rules',
  provider: 'Provider Settings',
  notification: 'Notifications',
  system: 'System',
};

const AdminSystemSettings = () => {
  const [settings, setSettings] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState({});
  const [message, setMessage] = useState(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await adminAPIService.getSystemSettings();
      if (response.success) {
        setSettings(response.data.settings);
        setGrouped(response.data.grouped);
      }
    } catch (err) {
      console.error('Fetch settings error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleChange = (key, value) => {
    setChanges(prev => ({ ...prev, [key]: value }));
  };

  const getValue = (setting) => {
    if (changes[setting.key] !== undefined) return changes[setting.key];
    return setting.value;
  };

  const handleSave = async () => {
    if (Object.keys(changes).length === 0) return;
    try {
      setSaving(true);
      setMessage(null);
      const settingsArray = Object.entries(changes).map(([key, value]) => ({ key, value }));
      const response = await adminAPIService.updateSystemSettings(settingsArray);
      if (response.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully' });
        setChanges({});
        fetchSettings();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse bg-surface-hover rounded-lg" />
        {[1,2,3].map(i => <div key={i} className="h-48 animate-pulse bg-surface-hover rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display text-content-primary">System Settings</h1>
          <p className="text-body text-content-muted mt-1">Configure platform rules and behavior</p>
        </div>
        <div className="flex items-center gap-3">
          {Object.keys(changes).length > 0 && (
            <span className="text-xs text-yellow-400">{Object.keys(changes).length} unsaved changes</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || Object.keys(changes).length === 0}
            className="btn btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Settings by Category */}
      {Object.entries(grouped).map(([category, items]) => {
        const Icon = CATEGORY_ICONS[category] || Settings;
        return (
          <div key={category} className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Icon className="w-4 h-4 text-accent-blue-light" />
              <h3 className="text-heading text-content-primary">{CATEGORY_LABELS[category] || category}</h3>
            </div>
            <div className="space-y-4">
              {items.map(setting => (
                <div key={setting.key} className="flex items-center justify-between py-2 border-b border-surface-border/50 last:border-0">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm font-medium text-content-primary">{setting.label || setting.key}</p>
                    <p className="text-xs text-content-muted">{setting.description}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {setting.type === 'boolean' ? (
                      <button
                        onClick={() => handleChange(setting.key, !getValue(setting))}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          getValue(setting) ? 'bg-green-500' : 'bg-surface-hover'
                        }`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                          getValue(setting) ? 'translate-x-[22px]' : 'translate-x-0.5'
                        }`} />
                      </button>
                    ) : (
                      <input
                        type="number"
                        value={getValue(setting)}
                        onChange={e => handleChange(setting.key, parseFloat(e.target.value) || 0)}
                        className="form-input w-24 text-right text-sm"
                        step={setting.key.includes('rating') ? 0.1 : 1}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminSystemSettings;
