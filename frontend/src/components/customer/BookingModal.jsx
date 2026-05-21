import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Calendar, Clock, MapPin, User, AlertCircle, CheckCircle,
  Plus, Info, Tag, Home, Navigation, Repeat, ChevronDown,
  ChevronUp, Shield, Package, Sparkles, FileText
} from 'lucide-react';
import { customerAPI, quotesAPI } from '../../services/api';
import { CATEGORIES } from '../../constants/categories';

/* ── Helpers ── */
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const formatTime12 = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
};

const generateTimeSlots = (start, end) => {
  const opts = [];
  const [sh, sm] = (start || '06:00').split(':').map(Number);
  const [eh, em] = (end || '22:00').split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  for (let t = startMin; t <= endMin; t += 30) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const label = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
    opts.push({ value: val, label });
  }
  return opts;
};

/* ═══════════════════════════════════════════════════════
   BOOKING MODAL — Smart Multi-Step Booking
   ═══════════════════════════════════════════════════════ */
const BookingModal = ({ service, provider, initialPackage = null, onClose, onSuccess }) => {
  /* ── State ── */
  const [formData, setFormData] = useState({
    scheduledDate: '',
    scheduledTime: { start: '', end: '' },
    customerNotes: '',
    location: { type: 'customer_address', address: '', instructions: '' },
    selectedAddOns: [],
    selectedPackage: initialPackage,
    recurrence: { isRecurring: false, frequency: 'weekly', endDate: '' },
    quantity: 1,
    requestedBudget: '',
    requestedMessage: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dayWarning, setDayWarning] = useState('');
  const [step, setStep] = useState(1);
  const [showRequirements, setShowRequirements] = useState(false);

  const catConfig = useMemo(() => CATEGORIES[service.category] || CATEGORIES.other || { label: 'Other', emoji: '🔧', color: '#6B7280' }, [service.category]);
  const availableAddOns = useMemo(() => (service.addOns || []).filter(a => a.enabled !== false), [service.addOns]);
  const packages = useMemo(() => (service.packages || []).filter(p => p.name), [service.packages]);
  const availDays = useMemo(() => service.availability?.days || [], [service.availability]);
  const timeSlots = useMemo(() => {
    const ts = service.availability?.timeSlots;
    if (!ts) return [];
    return Array.isArray(ts) ? ts : [ts];
  }, [service.availability]);
  const hasRequirements = !!(service.requirements?.materials || service.requirements?.space || service.requirements?.other);
  const isHourly = service.pricing?.type === 'hourly';
  const isNegotiable = service.pricing?.type === 'negotiable';

  /* Derive location options from service.location.type */
  const locationOptions = useMemo(() => {
    const svcLoc = service.location?.type;
    if (svcLoc === 'home_visit') return [{ value: 'customer_address', label: 'My Address', icon: Home, desc: 'Provider comes to you' }];
    if (svcLoc === 'customer_place') return [{ value: 'provider_address', label: "Provider's Place", icon: Navigation, desc: 'Visit the provider' }];
    return [
      { value: 'customer_address', label: 'My Address', icon: Home, desc: 'Provider comes to you' },
      { value: 'provider_address', label: "Provider's Place", icon: Navigation, desc: 'Visit the provider' },
      { value: 'custom', label: 'Other Address', icon: MapPin, desc: 'Enter a different location' },
    ];
  }, [service.location]);

  /* Time options filtered by provider availability */
  const filteredTimeOptions = useMemo(() => {
    if (timeSlots.length === 0) return generateTimeSlots('06:00', '22:00');
    const allOpts = [];
    const seen = new Set();
    timeSlots.forEach(slot => {
      const opts = generateTimeSlots(slot.start, slot.end);
      opts.forEach(o => { if (!seen.has(o.value)) { seen.add(o.value); allOpts.push(o); } });
    });
    allOpts.sort((a, b) => a.value.localeCompare(b.value));
    return allOpts.length > 0 ? allOpts : generateTimeSlots('06:00', '22:00');
  }, [timeSlots]);

  /* Lock body scroll */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  /* Set default location from available options */
  useEffect(() => {
    if (locationOptions.length === 1) {
      setFormData(p => ({ ...p, location: { ...p.location, type: locationOptions[0].value } }));
    }
  }, [locationOptions]);

  /* Validate date against available days */
  useEffect(() => {
    if (formData.scheduledDate && availDays.length > 0) {
      const selectedDay = DAY_NAMES[new Date(formData.scheduledDate).getDay()];
      if (!availDays.includes(selectedDay)) {
        setDayWarning(`Not available on ${selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}s`);
      } else {
        setDayWarning('');
      }
    } else {
      setDayWarning('');
    }
  }, [formData.scheduledDate, availDays]);

  /* ── Handlers ── */
  const updateField = useCallback((name, value) => {
    setFormData(p => {
      if (name.includes('.')) {
        const [parent, child] = name.split('.');
        return { ...p, [parent]: { ...p[parent], [child]: value } };
      }
      return { ...p, [name]: value };
    });
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      updateField(name, checked);
    } else {
      updateField(name, value);
    }
  };

  const toggleAddOn = (addonId) => {
    setFormData(p => ({
      ...p,
      selectedAddOns: p.selectedAddOns.includes(addonId)
        ? p.selectedAddOns.filter(id => id !== addonId)
        : [...p.selectedAddOns, addonId]
    }));
  };

  const selectPackage = (index) => {
    setFormData(p => ({
      ...p,
      selectedPackage: p.selectedPackage === index ? null : index
    }));
  };

  /* ── Auto-end time ── */
  const selectedDuration = useMemo(() => {
    if (formData.selectedPackage !== null && packages[formData.selectedPackage]?.duration) {
      return packages[formData.selectedPackage].duration;
    }
    if (isHourly && formData.quantity > 0) {
      return formData.quantity * 60;
    }
    return service.duration?.estimated || 0;
  }, [formData.selectedPackage, formData.quantity, packages, service.duration, isHourly]);

  const autoEnd = useMemo(() => {
    if (!formData.scheduledTime.start || !selectedDuration) return '';
    const [h, m] = formData.scheduledTime.start.split(':').map(Number);
    const total = h * 60 + m + selectedDuration;
    if (total >= 1440) return '23:59';
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }, [formData.scheduledTime.start, selectedDuration]);

  /* ── Price calculation ── */
  const priceSummary = useMemo(() => {
    let base = service.pricing?.amount || 0;
    let addOnTotal = 0;
    let label = 'Service Fee';

    if (formData.selectedPackage !== null && packages[formData.selectedPackage]) {
      base = packages[formData.selectedPackage].price;
      label = packages[formData.selectedPackage].name;
    } else if (isHourly) {
      base = (service.pricing?.amount || 0) * formData.quantity;
      label = `${formData.quantity} hr × ₹${service.pricing?.amount || 0}`;
    }

    formData.selectedAddOns.forEach(addonId => {
      const addon = availableAddOns.find(a => a.id === addonId);
      if (addon) addOnTotal += addon.price;
    });

    return { base, addOnTotal, total: base + addOnTotal, label };
  }, [service, formData.selectedPackage, formData.selectedAddOns, formData.quantity, availableAddOns, packages, isHourly]);

  /* ── Validation ── */
  const canProceedToStep3 = !!(formData.scheduledDate && formData.scheduledTime.start && !dayWarning);
  const canSubmit = canProceedToStep3 && formData.location.type;

  /* ── Submit ── */
  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const endTime = formData.scheduledTime.end || autoEnd;
      const baseLocation = {
        type: formData.location.type,
        ...(formData.location.address && { address: formData.location.address }),
        ...(formData.location.instructions && { instructions: formData.location.instructions }),
      };

      if (isNegotiable) {
        // Quote / negotiation flow — creates a Booking with status=quote_pending
        const quotePayload = {
          serviceId: service._id,
          scheduledDate: formData.scheduledDate,
          scheduledTime: { start: formData.scheduledTime.start, end: endTime || undefined },
          customerNotes: formData.customerNotes,
          location: baseLocation,
          requestedBudget: formData.requestedBudget ? Number(formData.requestedBudget) : undefined,
          requestedMessage: formData.requestedMessage || formData.customerNotes,
        };
        const res = await quotesAPI.request(quotePayload);
        onSuccess(res?.data?.booking, { mode: 'quote' });
        return;
      }

      const payload = {
        serviceId: service._id,
        scheduledDate: formData.scheduledDate,
        scheduledTime: { start: formData.scheduledTime.start, end: endTime || undefined },
        customerNotes: formData.customerNotes,
        location: baseLocation,
        selectedAddOns: formData.selectedAddOns,
        ...(formData.selectedPackage !== null && { selectedPackage: formData.selectedPackage }),
        ...(formData.recurrence.isRecurring && {
          recurrence: {
            isRecurring: true,
            frequency: formData.recurrence.frequency,
            endDate: formData.recurrence.endDate || undefined,
          }
        }),
      };
      await customerAPI.createBooking(payload);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create booking');
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const getMinDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const totalSteps = 3;

  /* ══════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════ */
  return createPortal(
    <div className="bm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bm-modal">

        {/* ── Header ── */}
        <div className="bm-header">
          <div className="bm-header-left">
            {step > 1 && (
              <button className="bm-back" onClick={() => setStep(s => s - 1)} type="button">←</button>
            )}
            <div>
              <h2 className="bm-heading">
                {step === 1 ? 'Customize Booking' : step === 2 ? 'Schedule & Location' : 'Review & Confirm'}
              </h2>
              <div className="bm-step-indicator">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <span key={i} className={`bm-step-dot ${i + 1 <= step ? 'active' : ''}`}
                    style={i + 1 <= step ? { background: catConfig.color } : {}} />
                ))}
                <span className="bm-step-text">Step {step} of {totalSteps}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="bm-close" type="button" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* ── Service Summary (always visible) ── */}
        <div className="bm-summary">
          <div className="bm-summary-img" style={{
            background: service.images?.[0]?.url
              ? `url(${service.images[0].url}) center/cover`
              : `linear-gradient(135deg, ${catConfig.color}, ${catConfig.color}88)`
          }}>
            {!service.images?.[0]?.url && <span>{catConfig.emoji}</span>}
          </div>
          <div className="bm-summary-info">
            <h3>{service.title}</h3>
            <span className="bm-summary-provider"><User size={13} /> {provider?.name || 'Provider'}</span>
            <div className="bm-summary-meta">
              {selectedDuration > 0 && <span><Clock size={13} /> {selectedDuration} min</span>}
              <span className="bm-summary-price">
                {isNegotiable ? 'Negotiable' : `₹${priceSummary.total.toLocaleString('en-IN')}`}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bm-error"><AlertCircle size={16} /> {error}</div>
        )}

        {/* ════════════════════════════════════════════
            STEP 1 — Customize (Package, Add-ons, Qty)
            ════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="bm-form">

            {/* Negotiable: Quote request panel */}
            {isNegotiable && (
              <div className="bm-quote-banner">
                <div className="bm-quote-banner-head">
                  <Tag size={14} />
                  <strong>Request a Quote</strong>
                </div>
                <p className="bm-quote-banner-desc">
                  This service has negotiable pricing. Tell the provider your budget &amp; needs;
                  they'll respond with an offer you can accept, counter, or decline.
                </p>
                <div className="bm-field" style={{ marginTop: 12 }}>
                  <label className="bm-label">Your Budget (₹) — optional</label>
                  <div className="bm-input-wrap">
                    <Tag size={15} className="bm-input-icon" />
                    <input
                      type="number" min="0" step="50"
                      name="requestedBudget"
                      value={formData.requestedBudget}
                      onChange={handleInputChange}
                      placeholder="e.g. 1500"
                      className="bm-input"
                    />
                  </div>
                </div>
                <div className="bm-field">
                  <label className="bm-label">Brief to the provider</label>
                  <textarea
                    name="requestedMessage"
                    rows={2}
                    value={formData.requestedMessage}
                    onChange={handleInputChange}
                    className="bm-textarea"
                    placeholder="Describe what you need and any expectations…"
                  />
                </div>
              </div>
            )}

            {/* Packages */}
            {packages.length > 0 && (
              <div className="bm-field">
                <label className="bm-label"><Package size={14} /> Choose a Package</label>
                <div className="bm-packages">
                  <button type="button" onClick={() => selectPackage(null)}
                    className={`bm-package-card ${formData.selectedPackage === null ? 'bm-package-active' : ''}`}
                    style={formData.selectedPackage === null ? { borderColor: catConfig.color } : {}}>
                    <span className="bm-package-name">Base Service</span>
                    <span className="bm-package-price">
                      {isNegotiable ? 'Negotiable' : `₹${service.pricing?.amount || 0}`}
                    </span>
                    {service.duration?.estimated && <span className="bm-package-dur">{service.duration.estimated} min</span>}
                  </button>
                  {packages.map((pkg, i) => (
                    <button key={i} type="button" onClick={() => selectPackage(i)}
                      className={`bm-package-card ${formData.selectedPackage === i ? 'bm-package-active' : ''}`}
                      style={formData.selectedPackage === i ? { borderColor: catConfig.color } : {}}>
                      {i === 1 && packages.length >= 3 && <span className="bm-pkg-badge">Popular</span>}
                      <span className="bm-package-name">{pkg.name}</span>
                      <span className="bm-package-price">₹{pkg.price?.toLocaleString('en-IN')}</span>
                      {pkg.duration && <span className="bm-package-dur">{pkg.duration} min</span>}
                      {pkg.description && <p className="bm-package-desc">{pkg.description}</p>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Hourly quantity */}
            {isHourly && (
              <div className="bm-field">
                <label className="bm-label"><Clock size={14} /> How many hours?</label>
                <div className="bm-qty-row">
                  <button type="button" className="bm-qty-btn"
                    onClick={() => setFormData(p => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))}>−</button>
                  <span className="bm-qty-value">{formData.quantity}</span>
                  <button type="button" className="bm-qty-btn"
                    onClick={() => setFormData(p => ({ ...p, quantity: Math.min(12, p.quantity + 1) }))}>+</button>
                  <span className="bm-qty-label">
                    hr{formData.quantity > 1 ? 's' : ''} × ₹{service.pricing?.amount || 0}/hr
                  </span>
                </div>
              </div>
            )}

            {/* Add-Ons */}
            {availableAddOns.length > 0 && (
              <div className="bm-field">
                <label className="bm-label"><Sparkles size={14} /> Add-Ons</label>
                <div className="bm-addons">
                  {availableAddOns.map(addon => (
                    <label key={addon.id}
                      className={`bm-addon-item ${formData.selectedAddOns.includes(addon.id) ? 'bm-addon-active' : ''}`}
                      style={formData.selectedAddOns.includes(addon.id) ? { borderColor: catConfig.color } : {}}>
                      <input type="checkbox" checked={formData.selectedAddOns.includes(addon.id)}
                        onChange={() => toggleAddOn(addon.id)} className="sr-only" />
                      <div className="bm-addon-check-box" style={formData.selectedAddOns.includes(addon.id) ? { background: catConfig.color, borderColor: catConfig.color } : {}}>
                        {formData.selectedAddOns.includes(addon.id) && <CheckCircle size={12} />}
                      </div>
                      <div className="bm-addon-info">
                        <span className="bm-addon-label">{addon.label}</span>
                        {addon.description && <span className="bm-addon-desc">{addon.description}</span>}
                      </div>
                      <span className="bm-addon-price">
                        {addon.price > 0 ? `+₹${addon.price}` : 'Free'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Category-specific info */}
            {service.categoryFields && Object.keys(service.categoryFields).length > 0 && (
              <div className="bm-smart-info">
                <div className="bm-smart-title"><Info size={13} /> Service Specifics</div>
                {Object.entries(service.categoryFields).map(([key, value]) => {
                  const fieldConfig = catConfig.smartFields?.[key];
                  if (!fieldConfig || !value) return null;
                  const display = Array.isArray(value) ? value.join(', ') : String(value);
                  return (
                    <div key={key} className="bm-smart-row">
                      <span className="bm-smart-label">{fieldConfig.label}</span>
                      <span className="bm-smart-value">{display}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Requirements notice */}
            {hasRequirements && (
              <div className="bm-requirements-banner" onClick={() => setShowRequirements(v => !v)}>
                <div className="bm-req-header">
                  <AlertCircle size={14} />
                  <span>This service has requirements — please review</span>
                  {showRequirements ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
                {showRequirements && (
                  <div className="bm-req-body">
                    {service.requirements.materials && <p>🧰 <strong>Materials:</strong> {service.requirements.materials}</p>}
                    {service.requirements.space && <p>🏠 <strong>Space:</strong> {service.requirements.space}</p>}
                    {service.requirements.other && <p>📋 <strong>Other:</strong> {service.requirements.other}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Next button */}
            <div className="bm-actions">
              <button type="button" onClick={onClose} className="bm-btn-cancel">Cancel</button>
              <button type="button" className="bm-btn-next" style={{ background: catConfig.color }}
                onClick={() => setStep(2)}>
                Continue <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════
            STEP 2 — Schedule & Location
            ════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="bm-form">

            {/* Available days indicator */}
            {availDays.length > 0 && availDays.length < 7 && (
              <div className="bm-avail-strip">
                <span className="bm-avail-label">Available days</span>
                <div className="bm-avail-days">
                  {DAY_NAMES.map((day, i) => (
                    <span key={day} className={`bm-avail-day ${availDays.includes(day) ? 'on' : ''}`}
                      style={availDays.includes(day) ? { background: `${catConfig.color}20`, color: catConfig.color, borderColor: `${catConfig.color}40` } : {}}>
                      {DAY_SHORT[i]}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Provider time slots info */}
            {timeSlots.length > 0 && (
              <div className="bm-timeslot-info">
                <Clock size={13} />
                <span>Provider hours: {timeSlots.map((s, i) => (
                  <strong key={i}>{formatTime12(s.start)} – {formatTime12(s.end)}{i < timeSlots.length - 1 ? ', ' : ''}</strong>
                ))}</span>
              </div>
            )}

            {/* Date */}
            <div className="bm-field">
              <label className="bm-label"><Calendar size={14} /> Preferred Date *</label>
              <div className="bm-input-wrap">
                <Calendar size={15} className="bm-input-icon" />
                <input type="date" name="scheduledDate" value={formData.scheduledDate}
                  onChange={handleInputChange} min={getMinDate()} required className="bm-input" />
              </div>
              {dayWarning && (
                <div className="bm-day-warning"><AlertCircle size={14} /> {dayWarning}</div>
              )}
              <p className="bm-hint">Bookings must be at least 24 hours in advance</p>
            </div>

            {/* Time */}
            <div className="bm-row">
              <div className="bm-field" style={{ flex: 1 }}>
                <label className="bm-label"><Clock size={14} /> Start Time *</label>
                <div className="bm-input-wrap">
                  <Clock size={15} className="bm-input-icon" />
                  <select name="scheduledTime.start" value={formData.scheduledTime.start}
                    onChange={handleInputChange} required className="bm-select">
                    <option value="">Select time</option>
                    {filteredTimeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="bm-field" style={{ flex: 1 }}>
                <label className="bm-label">End Time</label>
                <div className="bm-input-wrap">
                  <Clock size={15} className="bm-input-icon" />
                  <select name="scheduledTime.end" value={formData.scheduledTime.end || autoEnd}
                    onChange={handleInputChange} className="bm-select">
                    <option value="">
                      {autoEnd ? `Auto: ${formatTime12(autoEnd)}` : 'Auto-calculated'}
                    </option>
                    {filteredTimeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bm-field">
              <label className="bm-label"><MapPin size={14} /> Service Location</label>
              {locationOptions.length === 1 ? (
                <div className="bm-loc-single">
                  {React.createElement(locationOptions[0].icon, { size: 16 })}
                  <div>
                    <strong>{locationOptions[0].label}</strong>
                    <span>{locationOptions[0].desc}</span>
                  </div>
                </div>
              ) : (
                <div className="bm-loc-options">
                  {locationOptions.map(opt => (
                    <label key={opt.value}
                      className={`bm-loc-card ${formData.location.type === opt.value ? 'active' : ''}`}
                      style={formData.location.type === opt.value ? { borderColor: catConfig.color } : {}}>
                      <input type="radio" name="location.type" value={opt.value}
                        checked={formData.location.type === opt.value} onChange={handleInputChange} className="sr-only" />
                      {React.createElement(opt.icon, { size: 18 })}
                      <div>
                        <strong>{opt.label}</strong>
                        <span>{opt.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {formData.location.type === 'custom' && (
                <div className="bm-input-wrap" style={{ marginTop: 10 }}>
                  <MapPin size={15} className="bm-input-icon" />
                  <input type="text" name="location.address" value={formData.location.address}
                    onChange={handleInputChange} placeholder="Enter full address" className="bm-input" required />
                </div>
              )}
              {formData.location.type === 'customer_address' && (
                <div style={{ marginTop: 10 }}>
                  <input type="text" name="location.instructions" value={formData.location.instructions}
                    onChange={handleInputChange}
                    placeholder="Landmark or directions (optional)" className="bm-input" style={{ paddingLeft: 14 }} />
                </div>
              )}
            </div>

            {/* Recurring */}
            <div className="bm-field">
              <label className="bm-recur-toggle">
                <input type="checkbox" name="recurrence.isRecurring"
                  checked={formData.recurrence.isRecurring} onChange={handleInputChange} className="sr-only" />
                <span className={`bm-toggle-switch ${formData.recurrence.isRecurring ? 'on' : ''}`}
                  style={formData.recurrence.isRecurring ? { background: catConfig.color } : {}} />
                <span><Repeat size={14} /> Make this a recurring booking</span>
              </label>
              {formData.recurrence.isRecurring && (
                <div className="bm-recur-options">
                  <div className="bm-radio-group">
                    {[
                      { value: 'weekly', label: 'Weekly' },
                      { value: 'biweekly', label: 'Every 2 weeks' },
                      { value: 'monthly', label: 'Monthly' },
                    ].map(opt => (
                      <label key={opt.value} className={`bm-radio-chip ${formData.recurrence.frequency === opt.value ? 'active' : ''}`}>
                        <input type="radio" name="recurrence.frequency" value={opt.value}
                          checked={formData.recurrence.frequency === opt.value} onChange={handleInputChange} className="sr-only" />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                  <div className="bm-input-wrap" style={{ marginTop: 8 }}>
                    <Calendar size={15} className="bm-input-icon" />
                    <input type="date" name="recurrence.endDate" value={formData.recurrence.endDate}
                      onChange={handleInputChange} min={formData.scheduledDate || getMinDate()}
                      placeholder="End date (optional)" className="bm-input" />
                  </div>
                  <p className="bm-hint">Leave end date empty for ongoing recurrence</p>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bm-field">
              <label className="bm-label"><FileText size={14} /> Special Instructions</label>
              <textarea name="customerNotes" value={formData.customerNotes}
                onChange={handleInputChange} rows={2} className="bm-textarea"
                placeholder="Any special requirements, allergies, preferences..." />
              <p className="bm-hint">{formData.customerNotes.length}/500</p>
            </div>

            {/* Next button */}
            <div className="bm-actions">
              <button type="button" onClick={() => setStep(1)} className="bm-btn-cancel">Back</button>
              <button type="button" className="bm-btn-next"
                style={{ background: canProceedToStep3 ? catConfig.color : '#3a3d4e' }}
                disabled={!canProceedToStep3}
                onClick={() => setStep(3)}>
                Review Booking <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════
            STEP 3 — Review & Confirm
            ════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="bm-form">
            <div className="bm-review-section">
              {/* Schedule summary */}
              <div className="bm-review-block">
                <h4><Calendar size={14} /> Schedule</h4>
                <div className="bm-review-row">
                  <span>Date</span>
                  <strong>{new Date(formData.scheduledDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                </div>
                <div className="bm-review-row">
                  <span>Time</span>
                  <strong>
                    {formatTime12(formData.scheduledTime.start)}
                    {(formData.scheduledTime.end || autoEnd) && ` – ${formatTime12(formData.scheduledTime.end || autoEnd)}`}
                  </strong>
                </div>
                {selectedDuration > 0 && (
                  <div className="bm-review-row">
                    <span>Duration</span>
                    <strong>{selectedDuration >= 60 ? `${(selectedDuration / 60).toFixed(1)} hr` : `${selectedDuration} min`}</strong>
                  </div>
                )}
                {formData.recurrence.isRecurring && (
                  <div className="bm-review-row">
                    <span>Recurring</span>
                    <strong style={{ color: catConfig.color }}>
                      {formData.recurrence.frequency === 'weekly' ? 'Every week' : formData.recurrence.frequency === 'biweekly' ? 'Every 2 weeks' : 'Monthly'}
                    </strong>
                  </div>
                )}
              </div>

              {/* Location summary */}
              <div className="bm-review-block">
                <h4><MapPin size={14} /> Location</h4>
                <div className="bm-review-row">
                  <span>Type</span>
                  <strong>{formData.location.type === 'customer_address' ? 'Your address' : formData.location.type === 'provider_address' ? "Provider's place" : 'Custom'}</strong>
                </div>
                {formData.location.address && (
                  <div className="bm-review-row">
                    <span>Address</span>
                    <strong>{formData.location.address}</strong>
                  </div>
                )}
                {formData.location.instructions && (
                  <div className="bm-review-row">
                    <span>Note</span>
                    <strong>{formData.location.instructions}</strong>
                  </div>
                )}
              </div>

              {/* Selected items */}
              {(formData.selectedPackage !== null || formData.selectedAddOns.length > 0) && (
                <div className="bm-review-block">
                  <h4><Package size={14} /> Selected Items</h4>
                  {formData.selectedPackage !== null && packages[formData.selectedPackage] && (
                    <div className="bm-review-row">
                      <span>Package</span>
                      <strong>{packages[formData.selectedPackage].name} — ₹{packages[formData.selectedPackage].price?.toLocaleString('en-IN')}</strong>
                    </div>
                  )}
                  {formData.selectedAddOns.map(addonId => {
                    const addon = availableAddOns.find(a => a.id === addonId);
                    return addon ? (
                      <div key={addonId} className="bm-review-row">
                        <span>Add-on</span>
                        <strong>{addon.label} {addon.price > 0 ? `+₹${addon.price}` : '(Free)'}</strong>
                      </div>
                    ) : null;
                  })}
                </div>
              )}

              {formData.customerNotes && (
                <div className="bm-review-block">
                  <h4><FileText size={14} /> Notes</h4>
                  <p className="bm-review-notes">{formData.customerNotes}</p>
                </div>
              )}
            </div>

            {/* Price breakdown */}
            <div className="bm-price-card" style={{ borderColor: `${catConfig.color}30` }}>
              <div className="bm-price-summary">
                <span>{priceSummary.label}</span>
                <span className="bm-price-val">
                  {isNegotiable ? 'Negotiable' : `₹${priceSummary.base.toLocaleString('en-IN')}`}
                </span>
              </div>
              {priceSummary.addOnTotal > 0 && (
                <div className="bm-price-summary bm-price-addon">
                  <span>Add-ons</span>
                  <span className="bm-price-val" style={{ color: '#10B981' }}>+₹{priceSummary.addOnTotal.toLocaleString('en-IN')}</span>
                </div>
              )}
              {!isNegotiable && (priceSummary.addOnTotal > 0 || formData.selectedPackage !== null || isHourly) && (
                <div className="bm-price-summary bm-price-total">
                  <span>Estimated Total</span>
                  <span className="bm-price-val bm-price-total-val">₹{priceSummary.total.toLocaleString('en-IN')}</span>
                </div>
              )}
              <p className="bm-hint" style={{ margin: '8px 0 0', textAlign: 'center' }}>
                {isNegotiable ? 'Final price to be agreed with provider' : 'Final amount may vary based on actual service'}
              </p>
            </div>

            {/* Trust line */}
            <div className="bm-trust-line">
              <Shield size={13} /> Secure booking · Free cancellation up to 2 hrs before
            </div>

            {/* Confirm */}
            <div className="bm-actions">
              <button type="button" onClick={() => setStep(2)} className="bm-btn-cancel">Back</button>
              <button type="button" disabled={loading || !canSubmit} className="bm-btn-submit"
                style={{ background: loading ? undefined : `linear-gradient(135deg, ${catConfig.color}, ${catConfig.color}cc)` }}
                onClick={handleSubmit}>
                {loading ? <span className="bm-spinner" /> : <CheckCircle size={16} />}
                {loading ? (isNegotiable ? 'Sending...' : 'Booking...') : (isNegotiable ? 'Request Quote' : 'Confirm Booking')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default BookingModal;
