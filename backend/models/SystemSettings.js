const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    enum: [
      'platform_fee_percent',
      'booking_auto_cancel_hours',
      'booking_advance_days_min',
      'booking_advance_days_max',
      'service_radius_km',
      'min_provider_rating',
      'max_services_per_provider',
      'refund_window_hours',
      'dispute_resolution_days',
      'maintenance_mode',
      'registration_enabled',
      'auto_approve_providers',
      'auto_approve_services',
      'notification_email_enabled',
      'notification_sms_enabled',
    ],
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  label: String,
  description: String,
  type: {
    type: String,
    enum: ['number', 'boolean', 'string', 'json'],
    default: 'string',
  },
  category: {
    type: String,
    enum: ['platform', 'booking', 'provider', 'notification', 'system'],
    default: 'system',
  },
  updatedBy: String,
}, { timestamps: true });

systemSettingsSchema.statics.get = async function(key, defaultValue = null) {
  const doc = await this.findOne({ key });
  return doc ? doc.value : defaultValue;
};

systemSettingsSchema.statics.set = async function(key, value, adminEmail) {
  return this.findOneAndUpdate(
    { key },
    { value, updatedBy: adminEmail },
    { upsert: true, new: true }
  );
};

systemSettingsSchema.statics.getAll = async function() {
  const settings = await this.find().sort('category key');
  const grouped = {};
  settings.forEach(s => {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  });
  return grouped;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
