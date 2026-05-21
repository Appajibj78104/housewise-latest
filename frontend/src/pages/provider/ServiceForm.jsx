import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { providerAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { CATEGORIES, CATEGORY_KEYS } from '../../constants/categories';
import {
  Save, ArrowLeft, ArrowRight, Upload, X, AlertCircle, Clock, DollarSign,
  Calendar, MapPin, Tag, Plus, Package, Lightbulb, ChevronDown, ChevronUp,
  Trash2, Eye, EyeOff, Check, Star, FileText, Image, Settings, CheckCircle
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   HELPER COMPONENTS
   ═══════════════════════════════════════════════════════════ */

const TagInput = ({ value = [], onChange, placeholder }) => {
  const [input, setInput] = useState('');
  const addTag = () => {
    const tag = input.trim();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setInput('');
  };
  return (
    <div className="sf-tag-input">
      <div className="sf-tag-list">
        {value.map((t, i) => (
          <span key={i} className="sf-tag">
            {t}
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="sf-tag-remove">×</button>
          </span>
        ))}
      </div>
      <div className="sf-tag-row">
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
          placeholder={value.length === 0 ? placeholder : 'Add more...'} className="sf-tag-field" />
        {input.trim() && (
          <button type="button" onClick={addTag} className="sf-tag-add-btn">
            <Plus className="h-3 w-3" /> Add
          </button>
        )}
      </div>
    </div>
  );
};

const MultiSelectChips = ({ options, selected = [], onChange, color }) => (
  <div className="sf-chips">
    {options.map(opt => (
      <button key={opt} type="button"
        onClick={() => onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt])}
        className={`sf-chip ${selected.includes(opt) ? 'sf-chip-active' : ''}`}
        style={selected.includes(opt) ? { borderColor: color, background: `${color}20`, color } : {}}>
        {opt}
      </button>
    ))}
  </div>
);

/* ═══════════════════════════════════════════════════════════
   WIZARD STEP DEFINITIONS
   ═══════════════════════════════════════════════════════════ */
const STEPS = [
  { id: 'basics', label: 'Basics', icon: FileText, desc: 'Category, title & description' },
  { id: 'details', label: 'Details', icon: Settings, desc: 'Category-specific fields' },
  { id: 'pricing', label: 'Pricing', icon: DollarSign, desc: 'Pricing, packages & add-ons' },
  { id: 'schedule', label: 'Schedule', icon: Calendar, desc: 'Availability & location' },
  { id: 'media', label: 'Media & Review', icon: Image, desc: 'Images, requirements & preview' },
];

/* ═══════════════════════════════════════════════════════════
   COMPLETENESS SCORE
   ═══════════════════════════════════════════════════════════ */
const calcCompleteness = (formData, catConfig, imagePreviews) => {
  const checks = [];

  // Basics (40 pts)
  checks.push({ label: 'Title', pts: 8, ok: formData.title.trim().length >= 5 });
  checks.push({ label: 'Description', pts: 10, ok: formData.description.trim().length >= 20 });
  checks.push({ label: 'Description 100+ chars', pts: 5, ok: formData.description.trim().length >= 100 });
  checks.push({ label: 'Category', pts: 5, ok: !!formData.category });
  checks.push({ label: 'Subcategory', pts: 4, ok: !!formData.subcategory });
  checks.push({ label: 'Tags added', pts: 4, ok: formData.tags.length >= 1 });
  checks.push({ label: '3+ tags', pts: 4, ok: formData.tags.length >= 3 });

  // Details (15 pts)
  const smartFields = Object.entries(catConfig.smartFields || {});
  const requiredFields = smartFields.filter(([, c]) => c.required);
  const filledRequired = requiredFields.filter(([k]) => {
    const v = formData.categoryFields[k];
    if (!v) return false;
    if (Array.isArray(v)) return v.length > 0;
    return String(v).trim().length > 0;
  });
  if (requiredFields.length > 0) {
    checks.push({ label: 'Category details filled', pts: 15, ok: filledRequired.length === requiredFields.length });
  } else {
    checks.push({ label: 'Category details (N/A)', pts: 15, ok: true });
  }

  // Pricing (15 pts)
  checks.push({ label: 'Pricing type set', pts: 5, ok: !!formData.pricing.type });
  checks.push({ label: 'Price amount', pts: 5, ok: formData.pricing.type === 'negotiable' || (formData.pricing.amount > 0) });
  checks.push({ label: 'Package added', pts: 5, ok: formData.packages.length >= 1 });

  // Schedule (15 pts)
  checks.push({ label: 'Duration set', pts: 5, ok: formData.duration.estimated >= 15 });
  checks.push({ label: 'Available days', pts: 5, ok: formData.availability.days.length >= 1 });
  checks.push({ label: 'Time slots', pts: 5, ok: formData.availability.timeSlots.length >= 1 });

  // Media (15 pts)
  checks.push({ label: 'At least 1 image', pts: 8, ok: imagePreviews.length >= 1 });
  checks.push({ label: '3+ images', pts: 7, ok: imagePreviews.length >= 3 });

  const earned = checks.filter(c => c.ok).reduce((s, c) => s + c.pts, 0);
  const total = checks.reduce((s, c) => s + c.pts, 0);
  const pct = Math.round((earned / total) * 100);

  return { pct, checks, earned, total };
};

/* ═══════════════════════════════════════════════════════════
   COMPLETENESS RING (SVG)
   ═══════════════════════════════════════════════════════════ */
const CompletenessRing = ({ pct }) => {
  const r = 32, circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <div className="sf-ring-wrap">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="5" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 40 40)" style={{ transition: 'stroke-dashoffset .6s ease' }} />
      </svg>
      <div className="sf-ring-text">
        <span className="sf-ring-pct" style={{ color }}>{pct}%</span>
        <span className="sf-ring-label">Complete</span>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   LIVE PREVIEW PANEL
   ═══════════════════════════════════════════════════════════ */
const ServicePreview = ({ formData, catConfig, imagePreviews, user }) => {
  const formatPrice = () => {
    if (formData.pricing.type === 'negotiable') return 'Negotiable';
    if (!formData.pricing.amount) return '₹ --';
    return `₹${formData.pricing.amount}${formData.pricing.type === 'hourly' ? '/hr' : ''}`;
  };
  return (
    <div className="sf-preview">
      <div className="sf-preview-label"><Eye className="h-3 w-3" /> Customer View</div>
      <div className="sf-preview-card">
        <div className="sf-preview-cover"
          style={{ background: imagePreviews[0] ? `url(${imagePreviews[0]}) center/cover` : `linear-gradient(135deg, ${catConfig.color}, ${catConfig.color}88)` }}>
          <span className="sf-preview-emoji">{catConfig.emoji}</span>
          {formData.subcategory && <span className="sf-preview-subcategory">{formData.subcategory}</span>}
        </div>
        <div className="sf-preview-body">
          <h4 className="sf-preview-title">{formData.title || 'Service Title'}</h4>
          <p className="sf-preview-provider">{user?.name || 'Provider Name'}</p>
          <div className="sf-preview-meta">
            <span><Clock className="h-3 w-3" /> {formData.duration.estimated || '--'} min</span>
            <span className="sf-preview-price">{formatPrice()}</span>
          </div>
          <p className="sf-preview-desc">
            {formData.description ? (formData.description.length > 120 ? formData.description.slice(0, 120) + '...' : formData.description) : 'Service description will appear here...'}
          </p>
          {formData.tags.length > 0 && (
            <div className="sf-preview-tags">
              {formData.tags.slice(0, 4).map((t, i) => <span key={i} className="sf-preview-tag">{t}</span>)}
              {formData.tags.length > 4 && <span className="sf-preview-tag">+{formData.tags.length - 4}</span>}
            </div>
          )}
          {formData.availability.days.length > 0 && (
            <div className="sf-preview-days">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => {
                const full = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][i];
                return <span key={d} className={`sf-preview-day ${formData.availability.days.includes(full) ? 'sf-preview-day-on' : ''}`}>{d}</span>;
              })}
            </div>
          )}
          {formData.packages.length > 0 && (
            <div className="sf-preview-packages">
              {formData.packages.filter(p => p.name).map((p, i) => (
                <div key={i} className="sf-preview-pkg">
                  <span>{p.name}</span>
                  <span>₹{p.price || '--'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   UNSAVED CHANGES MODAL
   ═══════════════════════════════════════════════════════════ */
const UnsavedModal = ({ onStay, onLeave, onSaveDraft }) => (
  <div className="sf-modal-overlay">
    <div className="sf-modal">
      <AlertCircle className="h-10 w-10 text-yellow-400 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-content-primary text-center mb-2">Unsaved Changes</h3>
      <p className="text-sm text-content-muted text-center mb-5">You have unsaved changes. Would you like to save as draft before leaving?</p>
      <div className="flex flex-col gap-2">
        <button onClick={onSaveDraft} className="sf-modal-btn sf-modal-btn-primary"><Save className="h-4 w-4 mr-2" /> Save as Draft & Leave</button>
        <button onClick={onLeave} className="sf-modal-btn sf-modal-btn-danger">Leave Without Saving</button>
        <button onClick={onStay} className="sf-modal-btn sf-modal-btn-ghost">Stay on This Page</button>
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   LOCAL STORAGE AUTOSAVE KEY
   ═══════════════════════════════════════════════════════════ */
const DRAFT_KEY = 'sf_draft_autosave';

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
const ServiceForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isEditing = !!id;

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState(null);
  const [draftId, setDraftId] = useState(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const formRef = useRef(null);
  const initialLoadDone = useRef(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'cooking',
    subcategory: '',
    tags: [],
    pricing: { type: 'fixed', amount: '' },
    duration: { estimated: 120 },
    location: { type: 'customer_place', serviceArea: { radius: 5 } },
    availability: {
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      timeSlots: [{ start: '09:00', end: '18:00' }]
    },
    requirements: { materials: '', space: '', other: '' },
    categoryFields: {},
    addOns: [],
    packages: []
  });

  const catConfig = useMemo(() => CATEGORIES[formData.category] || CATEGORIES.other, [formData.category]);
  const completeness = useMemo(() => calcCompleteness(formData, catConfig, imagePreviews), [formData, catConfig, imagePreviews]);

  const categories = useMemo(() => CATEGORY_KEYS.map(key => ({
    value: key, label: CATEGORIES[key].label, emoji: CATEGORIES[key].emoji
  })), []);

  const days = useMemo(() => [
    { value: 'monday', label: 'Monday' }, { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' }, { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' }, { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ], []);

  const TIME_OPTIONS = useMemo(() => {
    const opts = [];
    for (let h = 6; h <= 22; h++) {
      for (let m = 0; m < 60; m += 30) {
        if (h === 22 && m > 0) break;
        const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        opts.push({ value: val, label: `${h12}:${String(m).padStart(2, '0')} ${ampm}` });
      }
    }
    return opts;
  }, []);

  /* ── Mark dirty on any form change ── */
  const setFormDataDirty = useCallback((updater) => {
    setFormData(updater);
    if (initialLoadDone.current) setIsDirty(true);
  }, []);

  /* ── LOAD: editing existing service OR restore draft ── */
  useEffect(() => {
    if (isEditing) {
      fetchService();
    } else {
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.formData) {
            setFormData(parsed.formData);
            if (parsed.draftId) setDraftId(parsed.draftId);
            if (parsed.imagePreviews) setImagePreviews(parsed.imagePreviews);
            setLastAutoSave(parsed.savedAt ? new Date(parsed.savedAt) : null);
          }
        }
      } catch { /* ignore */ }
      initialLoadDone.current = true;
    }
  }, [id, isEditing]);

  /* ── Category change resets category-specific fields ── */
  useEffect(() => {
    if (!isEditing && initialLoadDone.current) {
      const cfg = CATEGORIES[formData.category] || CATEGORIES.other;
      setFormData(prev => ({
        ...prev,
        subcategory: '',
        categoryFields: {},
        addOns: (cfg.addOns || []).map(a => ({ ...a, enabled: false })),
        duration: { estimated: cfg.defaultDuration || 60 }
      }));
    }
  }, [formData.category]);

  /* ── AUTO-SAVE to localStorage every 15 seconds ── */
  useEffect(() => {
    if (isEditing || !isDirty) return;
    const timer = setInterval(() => {
      try {
        const payload = {
          formData,
          draftId,
          imagePreviews: imagePreviews.filter(p => typeof p === 'string' && p.startsWith('http')),
          savedAt: new Date().toISOString()
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
        setLastAutoSave(new Date());
      } catch { /* storage full, ignore */ }
    }, 15000);
    return () => clearInterval(timer);
  }, [formData, isDirty, isEditing, draftId, imagePreviews]);

  /* ── UNSAVED CHANGES: beforeunload guard ── */
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  /* ── UNSAVED CHANGES: browser back/forward guard ── */
  const pendingPathRef = useRef(null);

  useEffect(() => {
    if (!isDirty || success) return;
    const onPopState = () => {
      // Push state back to prevent navigation, then show modal
      window.history.pushState(null, '', window.location.href);
      pendingPathRef.current = '/provider/services';
      setPendingNavigation(true);
      setShowUnsavedModal(true);
    };
    // Push an extra entry so we can intercept back
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isDirty, success]);

  /** Try to navigate — if dirty, show modal instead */
  const guardedNavigate = useCallback((path) => {
    if (isDirty && !success) {
      pendingPathRef.current = path;
      setPendingNavigation(true);
      setShowUnsavedModal(true);
    } else {
      navigate(path);
    }
  }, [isDirty, success, navigate]);

  const handleStay = () => {
    setShowUnsavedModal(false);
    setPendingNavigation(null);
    pendingPathRef.current = null;
  };

  const handleLeave = () => {
    setShowUnsavedModal(false);
    localStorage.removeItem(DRAFT_KEY);
    setIsDirty(false);
    const dest = pendingPathRef.current || '/provider/services';
    pendingPathRef.current = null;
    setPendingNavigation(null);
    navigate(dest);
  };

  const handleSaveDraftAndLeave = async () => {
    await saveDraft();
    setShowUnsavedModal(false);
    setIsDirty(false);
    const dest = pendingPathRef.current || '/provider/services';
    pendingPathRef.current = null;
    setPendingNavigation(null);
    navigate(dest);
  };

  /* ── Fetch existing service for editing ── */
  const fetchService = async () => {
    try {
      setLoading(true);
      const response = await providerAPI.getMyServices();
      const service = response.data.services.find(s => s._id === id);
      if (service) {
        const cfg = CATEGORIES[service.category] || CATEGORIES.other;
        setFormData({
          title: service.title || '',
          description: service.description || '',
          category: service.category || 'cooking',
          subcategory: service.subcategory || '',
          tags: service.tags || [],
          pricing: service.pricing || { type: 'fixed', amount: '' },
          duration: service.duration || { estimated: cfg.defaultDuration || 60 },
          location: {
            type: service.location?.type || 'customer_place',
            serviceArea: { radius: service.location?.serviceArea?.radius || 5 }
          },
          availability: {
            days: service.availability?.days || [],
            timeSlots: service.availability?.timeSlots?.length
              ? service.availability.timeSlots
              : [{ start: '09:00', end: '18:00' }]
          },
          requirements: service.requirements || { materials: '', space: '', other: '' },
          categoryFields: service.categoryFields || {},
          addOns: service.addOns?.length
            ? service.addOns
            : (cfg.addOns || []).map(a => ({ ...a, enabled: false })),
          packages: service.packages || []
        });
        if (service.images) setImagePreviews(service.images.map(img => img.url));
        if (service.status === 'draft') setDraftId(service._id);
      } else {
        setError('Service not found');
      }
    } catch {
      setError('Failed to load service details');
    } finally {
      setLoading(false);
      initialLoadDone.current = true;
    }
  };

  /* ═══ HANDLERS ═══ */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormDataDirty(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: value } }));
    } else {
      setFormDataDirty(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCategoryFieldChange = (fieldKey, value) => {
    setFormDataDirty(prev => ({ ...prev, categoryFields: { ...prev.categoryFields, [fieldKey]: value } }));
  };

  const handleDayToggle = (day) => {
    setFormDataDirty(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        days: prev.availability.days.includes(day)
          ? prev.availability.days.filter(d => d !== day)
          : [...prev.availability.days, day]
      }
    }));
  };

  const handleTimeSlotChange = (index, field, value) => {
    setFormDataDirty(prev => {
      const slots = [...prev.availability.timeSlots];
      slots[index] = { ...slots[index], [field]: value };
      return { ...prev, availability: { ...prev.availability, timeSlots: slots } };
    });
  };

  const addTimeSlot = () => setFormDataDirty(prev => ({
    ...prev,
    availability: {
      ...prev.availability,
      timeSlots: [...prev.availability.timeSlots, { start: '09:00', end: '18:00' }]
    }
  }));

  const removeTimeSlot = (i) => setFormDataDirty(prev => ({
    ...prev,
    availability: {
      ...prev.availability,
      timeSlots: prev.availability.timeSlots.filter((_, j) => j !== i)
    }
  }));

  const toggleAddOn = (i) => setFormDataDirty(prev => {
    const addOns = [...prev.addOns];
    addOns[i] = { ...addOns[i], enabled: !addOns[i].enabled };
    return { ...prev, addOns };
  });

  const addPackage = () => setFormDataDirty(prev => ({
    ...prev,
    packages: [...prev.packages, { name: '', description: '', price: '', duration: '', includes: [] }]
  }));

  const updatePackage = (i, field, value) => setFormDataDirty(prev => {
    const packages = [...prev.packages];
    packages[i] = { ...packages[i], [field]: value };
    return { ...prev, packages };
  });

  const removePackage = (i) => setFormDataDirty(prev => ({
    ...prev, packages: prev.packages.filter((_, j) => j !== i)
  }));

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) {
      setError('Maximum 5 images allowed');
      return;
    }
    setImages(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreviews(prev => [...prev, reader.result]);
      reader.readAsDataURL(file);
    });
    setIsDirty(true);
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  /* ═══ SAVE AS DRAFT ═══ */
  const saveDraft = async () => {
    setDraftSaving(true);
    try {
      const draftData = { ...formData };
      if (draftId) draftData._draftId = draftId;
      const res = await providerAPI.saveDraft(draftData);
      const savedId = res.data?.service?._id;
      if (savedId) {
        setDraftId(savedId);
        try {
          const payload = { formData, draftId: savedId, imagePreviews: [], savedAt: new Date().toISOString() };
          localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
        } catch { /* ignore */ }
      }
      setLastAutoSave(new Date());
      setIsDirty(false);
    } catch {
      setError('Failed to save draft');
    } finally {
      setDraftSaving(false);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setDraftId(null);
    setLastAutoSave(null);
  };

  /* ═══ SUBMIT (PUBLISH) ═══ */
  const handleSubmit = async (e) => {
    e?.preventDefault();

    setLoading(true);
    setError('');
    setSuccess('');

    const errs = [];
    if (!formData.title || formData.title.trim().length < 5) errs.push('Title must be at least 5 characters');
    if (!formData.description || formData.description.trim().length < 20) errs.push('Description must be at least 20 characters');
    if (!formData.category) errs.push('Please select a category');
    if (formData.pricing.type !== 'negotiable' && (!formData.pricing.amount || formData.pricing.amount <= 0)) errs.push('Please enter a valid price');
    if (!formData.duration.estimated || formData.duration.estimated < 15) errs.push('Duration must be at least 15 minutes');
    if (formData.availability.days.length === 0) errs.push('Select at least one available day');
    if (errs.length > 0) { setError(errs.join('. ')); setLoading(false); return; }

    try {
      const submitData = {
        ...formData,
        status: 'active',
        addOns: formData.addOns.filter(a => a.enabled),
        packages: formData.packages.filter(p => p.name && p.price),
      };

      const lat = user?.address?.coordinates?.latitude;
      const lon = user?.address?.coordinates?.longitude;
      if (lat && lon) {
        submitData.location = {
          ...submitData.location,
          serviceArea: {
            ...submitData.location.serviceArea,
            coordinates: { latitude: lat, longitude: lon }
          }
        };
      }
      if (images.length > 0) submitData.images = images;

      if (isEditing || draftId) {
        const serviceId = id || draftId;
        await providerAPI.updateService(serviceId, submitData);
        setSuccess('Service published successfully!');
      } else {
        await providerAPI.createService(submitData);
        setSuccess('Service created successfully!');
      }

      clearDraft();
      setIsDirty(false);
      setTimeout(() => navigate('/provider/services'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save service');
    } finally {
      setLoading(false);
    }
  };

  /* ═══ STEP VALIDATION (per step) ═══ */
  const stepValid = useMemo(() => ({
    0: formData.title.trim().length >= 5 && formData.description.trim().length >= 20 && !!formData.category,
    1: true,
    2: !!formData.pricing.type && (formData.pricing.type === 'negotiable' || formData.pricing.amount > 0),
    3: formData.duration.estimated >= 15 && formData.availability.days.length >= 1,
    4: true,
  }), [formData]);

  const canProceed = stepValid[currentStep];

  const goNext = () => {
    if (currentStep < STEPS.length - 1 && canProceed) {
      setCurrentStep(s => s + 1);
      setError('');
    }
  };
  const goPrev = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
      setError('');
    }
  };
  const goToStep = (i) => {
    if (i <= currentStep || canProceed) {
      setCurrentStep(i);
      setError('');
    }
  };

  /* ═══ RENDER SMART FIELD ═══ */
  const renderSmartField = (key, config) => {
    const value = formData.categoryFields[key];
    switch (config.type) {
      case 'multi-select':
        return (
          <div key={key} className="sf-smart-field">
            <label className="sf-label">{config.label} {config.required && <span className="text-red-400">*</span>}</label>
            <MultiSelectChips options={config.options} selected={value || []} onChange={v => handleCategoryFieldChange(key, v)} color={catConfig.color} />
          </div>
        );
      case 'select':
        return (
          <div key={key} className="sf-smart-field">
            <label className="sf-label">{config.label} {config.required && <span className="text-red-400">*</span>}</label>
            <select value={value || ''} onChange={e => handleCategoryFieldChange(key, e.target.value)} className="sf-input">
              <option value="">Select...</option>
              {config.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        );
      case 'number':
        return (
          <div key={key} className="sf-smart-field">
            <label className="sf-label">{config.label} {config.required && <span className="text-red-400">*</span>}</label>
            <input type="number" value={value || ''} onChange={e => handleCategoryFieldChange(key, Number(e.target.value))}
              min={config.min} max={config.max} placeholder={config.placeholder} className="sf-input" />
          </div>
        );
      case 'text':
        return (
          <div key={key} className="sf-smart-field">
            <label className="sf-label">{config.label} {config.required && <span className="text-red-400">*</span>}</label>
            <input type="text" value={value || ''} onChange={e => handleCategoryFieldChange(key, e.target.value)}
              placeholder={config.placeholder} className="sf-input" />
          </div>
        );
      case 'tags':
        return (
          <div key={key} className="sf-smart-field">
            <label className="sf-label">{config.label} {config.required && <span className="text-red-400">*</span>}</label>
            <TagInput value={value || []} onChange={v => handleCategoryFieldChange(key, v)} placeholder={config.placeholder} />
          </div>
        );
      default:
        return null;
    }
  };

  /* ═══ RENDER STEPS ═══ */
  const renderStepContent = () => {
    switch (currentStep) {
      /* ── STEP 0: Basics ── */
      case 0:
        return (
          <div className="sf-step-content">
            <h3 className="sf-section-title"><span className="text-2xl mr-2">{catConfig.emoji}</span> Basic Information</h3>

            {/* Category Grid */}
            <div className="mb-6">
              <label className="sf-label">Category *</label>
              <div className="sf-category-grid">
                {categories.map(cat => (
                  <button key={cat.value} type="button"
                    onClick={() => setFormDataDirty(prev => ({ ...prev, category: cat.value }))}
                    className={`sf-category-card ${formData.category === cat.value ? 'sf-category-active' : ''}`}
                    style={formData.category === cat.value ? { borderColor: CATEGORIES[cat.value].color, boxShadow: `0 0 0 1px ${CATEGORIES[cat.value].color}` } : {}}>
                    <span className="text-xl">{cat.emoji}</span>
                    <span className="text-xs mt-1">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Subcategory */}
            {catConfig.subcategories.length > 0 && (
              <div className="mb-6">
                <label className="sf-label">Subcategory</label>
                <div className="sf-chips">
                  {catConfig.subcategories.map(sub => (
                    <button key={sub} type="button"
                      onClick={() => setFormDataDirty(prev => ({ ...prev, subcategory: prev.subcategory === sub ? '' : sub }))}
                      className={`sf-chip ${formData.subcategory === sub ? 'sf-chip-active' : ''}`}
                      style={formData.subcategory === sub ? { borderColor: catConfig.color, background: `${catConfig.color}20`, color: catConfig.color } : {}}>
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Title */}
            <div className="mb-5">
              <label className="sf-label">Service Title *</label>
              <input type="text" name="title" value={formData.title} onChange={handleInputChange}
                required minLength={5} maxLength={100} className="sf-input"
                placeholder="e.g., Home Cooking Service, Tailoring & Alterations" />
              <span className="sf-hint">{formData.title.length}/100 characters (min 5)</span>
            </div>

            {/* Description */}
            <div className="mb-5">
              <label className="sf-label">Description *</label>
              <textarea name="description" value={formData.description} onChange={handleInputChange}
                required minLength={20} maxLength={1000} rows={4} className="sf-input resize-none"
                placeholder="Describe what you offer, your experience, and what makes you special..." />
              <div className="flex justify-between">
                <span className="sf-hint">{formData.description.length}/1000 characters (min 20)</span>
                {formData.description.length >= 20 && formData.description.length < 100 && (
                  <span className="sf-hint text-yellow-400">Add more detail for better visibility</span>
                )}
                {formData.description.length >= 100 && (
                  <span className="sf-hint text-green-400">Great description!</span>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="mb-5">
              <label className="sf-label"><Tag className="inline h-4 w-4 mr-1" />Search Tags</label>
              <TagInput value={formData.tags} onChange={tags => setFormDataDirty(prev => ({ ...prev, tags }))}
                placeholder="Add tags for better discoverability, e.g., vegan, organic, bridal" />
              <span className="sf-hint">Tags help customers find your service</span>
            </div>

            {catConfig.tips && (
              <div className="sf-tip">
                <Lightbulb className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>{catConfig.tips}</span>
              </div>
            )}
          </div>
        );

      /* ── STEP 1: Category Details ── */
      case 1:
        return (
          <div className="sf-step-content">
            {Object.keys(catConfig.smartFields || {}).length > 0 ? (
              <>
                <h3 className="sf-section-title" style={{ color: catConfig.color }}>
                  <span className="text-2xl mr-2">{catConfig.emoji}</span> {catConfig.label} Details
                </h3>
                <div className="sf-smart-fields-grid">
                  {Object.entries(catConfig.smartFields).map(([key, config]) => renderSmartField(key, config))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <span className="text-4xl mb-4 block">{catConfig.emoji}</span>
                <h3 className="text-lg font-semibold text-content-primary mb-2">No Additional Details Needed</h3>
                <p className="text-content-muted">The &ldquo;{catConfig.label}&rdquo; category doesn&rsquo;t require extra fields. Proceed to the next step!</p>
              </div>
            )}
          </div>
        );

      /* ── STEP 2: Pricing & Packages ── */
      case 2:
        return (
          <div className="sf-step-content">
            <h3 className="sf-section-title"><DollarSign className="h-5 w-5 mr-2 text-accent-blue" /> Pricing</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="sf-label">Pricing Type *</label>
                <select name="pricing.type" value={formData.pricing.type} onChange={handleInputChange} className="sf-input">
                  <option value="fixed">Fixed Price</option>
                  <option value="hourly">Per Hour</option>
                  <option value="negotiable">Negotiable</option>
                </select>
              </div>
              {formData.pricing.type !== 'negotiable' && (
                <div>
                  <label className="sf-label">Amount (₹) *</label>
                  <input type="number" name="pricing.amount" value={formData.pricing.amount} onChange={handleInputChange}
                    required={formData.pricing.type !== 'negotiable'} min="1" max="50000" className="sf-input" placeholder="₹1 - ₹50,000" />
                </div>
              )}
            </div>

            {/* Packages */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <label className="sf-label mb-0">
                  <Package className="inline h-4 w-4 mr-1" /> Service Packages{' '}
                  <span className="text-content-muted text-xs">(Optional)</span>
                </label>
                <button type="button" onClick={addPackage} className="sf-btn-small">
                  <Plus className="h-3 w-3 mr-1" /> Add Package
                </button>
              </div>
              <p className="sf-hint mb-3">Offer different tiers like Basic, Standard, Premium</p>
              {formData.packages.map((pkg, i) => {
                const isFilled = pkg.name && pkg.price;
                const blockEnter = (e) => { if (e.key === 'Enter') e.preventDefault(); };
                return (
                  <div key={i} className={`sf-package-card ${isFilled ? 'sf-package-saved' : ''}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-content-muted uppercase">Package {i + 1}</span>
                        {isFilled && <span className="sf-package-badge"><Check className="h-3 w-3" /> Added</span>}
                      </div>
                      <button type="button" onClick={() => removePackage(i)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input type="text" value={pkg.name} onChange={e => updatePackage(i, 'name', e.target.value)}
                        onKeyDown={blockEnter} placeholder="Package name" className="sf-input" />
                      <input type="number" value={pkg.price} onChange={e => updatePackage(i, 'price', e.target.value)}
                        onKeyDown={blockEnter} placeholder="Price (₹)" min="0" className="sf-input" />
                      <input type="number" value={pkg.duration} onChange={e => updatePackage(i, 'duration', e.target.value)}
                        onKeyDown={blockEnter} placeholder="Duration (min)" min="15" className="sf-input" />
                    </div>
                    <textarea value={pkg.description} onChange={e => updatePackage(i, 'description', e.target.value)}
                      onKeyDown={blockEnter} placeholder="What's included in this package?" rows={2} className="sf-input mt-3 resize-none" />
                    {!isFilled && <p className="text-xs text-yellow-400 mt-2">Fill in name & price to save this package</p>}
                  </div>
                );
              })}
            </div>

            {/* Add-Ons */}
            {formData.addOns.length > 0 && (
              <div className="mt-8">
                <h3 className="sf-section-title">
                  <Plus className="h-5 w-5 mr-2 text-accent-blue" /> Add-Ons{' '}
                  <span className="text-sm font-normal text-content-muted">(Customers can select when booking)</span>
                </h3>
                <div className="sf-addons-grid">
                  {formData.addOns.map((addon, i) => (
                    <label key={addon.id} className={`sf-addon-card ${addon.enabled ? 'sf-addon-active' : ''}`}
                      style={addon.enabled ? { borderColor: catConfig.color } : {}}>
                      <input type="checkbox" checked={addon.enabled} onChange={() => toggleAddOn(i)} className="sr-only" />
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-sm text-content-primary">{addon.label}</span>
                        <span className="text-xs font-semibold" style={{
                          color: addon.price > 0 ? '#10B981' : addon.price < 0 ? '#EF4444' : '#6B7280'
                        }}>
                          {addon.price > 0 ? `+₹${addon.price}` : addon.price < 0 ? `-₹${Math.abs(addon.price)}` : 'Free'}
                        </span>
                      </div>
                      <p className="text-xs text-content-muted mt-1">{addon.description}</p>
                      <div className={`sf-addon-check ${addon.enabled ? 'sf-addon-check-on' : ''}`}>
                        {addon.enabled ? '✓' : ''}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      /* ── STEP 3: Schedule & Location ── */
      case 3:
        return (
          <div className="sf-step-content">
            <h3 className="sf-section-title"><Clock className="h-5 w-5 mr-2 text-accent-blue" /> Duration & Availability</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="sf-label">Estimated Duration (minutes)</label>
                <input type="number" name="duration.estimated" value={formData.duration.estimated} onChange={handleInputChange}
                  required min="15" max="1440" step="15" className="sf-input" placeholder="60" />
                {formData.duration.estimated >= 15 && (
                  <span className="sf-hint text-green-400">
                    ≈ {Math.floor(formData.duration.estimated / 60)}h {formData.duration.estimated % 60}m
                  </span>
                )}
              </div>
            </div>

            <div className="mb-6">
              <label className="sf-label"><Calendar className="inline h-4 w-4 mr-1" />Available Days</label>
              <div className="sf-days-grid">
                {days.map(day => (
                  <button key={day.value} type="button" onClick={() => handleDayToggle(day.value)}
                    className={`sf-day-btn ${formData.availability.days.includes(day.value) ? 'sf-day-active' : ''}`}>
                    {day.label.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <label className="sf-label mb-0"><Clock className="inline h-4 w-4 mr-1" />Time Slots</label>
                <button type="button" onClick={addTimeSlot} className="sf-btn-small">
                  <Plus className="h-3 w-3 mr-1" /> Add Slot
                </button>
              </div>
              {formData.availability.timeSlots.map((slot, i) => (
                <div key={i} className="sf-time-slot-row">
                  <select value={slot.start} onChange={e => handleTimeSlotChange(i, 'start', e.target.value)} className="sf-input flex-1">
                    {TIME_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <span className="text-content-muted text-sm">to</span>
                  <select value={slot.end} onChange={e => handleTimeSlotChange(i, 'end', e.target.value)} className="sf-input flex-1">
                    {TIME_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  {formData.availability.timeSlots.length > 1 && (
                    <button type="button" onClick={() => removeTimeSlot(i)} className="text-red-400 hover:text-red-300 p-1">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Location */}
            <h3 className="sf-section-title"><MapPin className="h-5 w-5 mr-2 text-accent-blue" /> Service Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="sf-label">Where do you provide this service?</label>
                <div className="sf-location-options">
                  {[
                    { value: 'home_visit', label: '🏠 I visit customer', desc: "You go to the customer's location" },
                    { value: 'customer_place', label: '📍 At my place', desc: 'Customer comes to you' },
                    { value: 'both', label: '🔄 Both options', desc: 'Flexible — either location works' },
                  ].map(opt => (
                    <label key={opt.value} className={`sf-location-card ${formData.location.type === opt.value ? 'sf-location-active' : ''}`}>
                      <input type="radio" name="location.type" value={opt.value}
                        checked={formData.location.type === opt.value} onChange={handleInputChange} className="sr-only" />
                      <span className="font-medium text-sm">{opt.label}</span>
                      <span className="text-xs text-content-muted">{opt.desc}</span>
                    </label>
                  ))}
                </div>
              </div>
              {(formData.location.type === 'home_visit' || formData.location.type === 'both') && (
                <div>
                  <label className="sf-label">Service Area Radius (km)</label>
                  <input type="range" min="1" max="50" value={formData.location.serviceArea.radius}
                    onChange={e => setFormDataDirty(prev => ({
                      ...prev,
                      location: {
                        ...prev.location,
                        serviceArea: { ...prev.location.serviceArea, radius: Number(e.target.value) }
                      }
                    }))} className="w-full accent-blue-500" />
                  <div className="flex justify-between text-xs text-content-muted mt-1">
                    <span>1 km</span>
                    <span className="font-semibold text-content-primary">{formData.location.serviceArea.radius} km</span>
                    <span>50 km</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      /* ── STEP 4: Media, Requirements & Review ── */
      case 4:
        return (
          <div className="sf-step-content">
            <h3 className="sf-section-title">Service Images (Optional)</h3>
            <div className="space-y-4 mb-8">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-surface-border border-dashed rounded-lg cursor-pointer bg-surface-raised hover:bg-surface-hover transition-colors">
                <Upload className="w-8 h-8 mb-2 text-content-muted" />
                <p className="text-detail text-content-secondary"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                <p className="text-micro text-content-muted">PNG, JPG or JPEG (MAX. 5 images)</p>
                <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded-lg border border-surface-border" />
                      {index === 0 && <span className="absolute top-1 left-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded">Cover</span>}
                      <button type="button" onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors opacity-0 group-hover:opacity-100">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Requirements */}
            <h3 className="sf-section-title">Requirements (Optional)</h3>
            <div className="space-y-4 mb-8">
              <div>
                <label className="sf-label">Materials/Ingredients</label>
                <textarea name="requirements.materials" value={formData.requirements.materials} onChange={handleInputChange}
                  rows={2} maxLength={500} className="sf-input resize-none" placeholder="What materials should the customer provide?" />
              </div>
              <div>
                <label className="sf-label">Space Requirements</label>
                <textarea name="requirements.space" value={formData.requirements.space} onChange={handleInputChange}
                  rows={2} maxLength={500} className="sf-input resize-none" placeholder="What kind of space do you need?" />
              </div>
              <div>
                <label className="sf-label">Other Requirements</label>
                <textarea name="requirements.other" value={formData.requirements.other} onChange={handleInputChange}
                  rows={2} maxLength={500} className="sf-input resize-none" placeholder="Any other special requirements?" />
              </div>
            </div>

            {/* Final Review Checklist */}
            <h3 className="sf-section-title"><CheckCircle className="h-5 w-5 mr-2 text-green-400" /> Review Checklist</h3>
            <div className="sf-checklist">
              {completeness.checks.map((c, i) => (
                <div key={i} className={`sf-checklist-item ${c.ok ? 'sf-checklist-ok' : 'sf-checklist-miss'}`}>
                  {c.ok
                    ? <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                    : <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0" />}
                  <span>{c.label}</span>
                  <span className="sf-checklist-pts">{c.ok ? c.pts : 0}/{c.pts} pts</span>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  /* ═══════════════════════════════════════════════════════════
     MAIN RENDER
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="sf-page">
      {/* Unsaved changes modal */}
      {showUnsavedModal && (
        <UnsavedModal onStay={handleStay} onLeave={handleLeave} onSaveDraft={handleSaveDraftAndLeave} />
      )}

      {/* ── Header ── */}
      <div className="sf-header">
        <div className="flex items-center">
          <button onClick={() => guardedNavigate('/provider/services')}
            className="mr-4 p-2 text-content-muted hover:text-content-secondary rounded-lg hover:bg-surface-overlay transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-display text-content-primary">{isEditing ? 'Edit Service' : 'Create New Service'}</h1>
            <p className="text-content-muted mt-0.5 text-sm">
              {isEditing ? 'Update your service details' : 'Step by step — create a professional listing'}
            </p>
          </div>
        </div>
        <div className="sf-header-actions">
          {/* Auto-save indicator */}
          {lastAutoSave && (
            <span className="sf-autosave-badge">
              <Check className="h-3 w-3" /> Saved {lastAutoSave.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {/* Draft button */}
          {!isEditing && (
            <button type="button" onClick={saveDraft} disabled={draftSaving} className="sf-btn-draft">
              {draftSaving ? <span className="sf-spinner-sm" /> : <Save className="h-4 w-4" />}
              <span className="hidden sm:inline">{draftSaving ? 'Saving...' : 'Save Draft'}</span>
            </button>
          )}
          {/* Preview toggle */}
          <button type="button" onClick={() => setShowPreview(p => !p)}
            className={`sf-btn-preview ${showPreview ? 'sf-btn-preview-on' : ''}`}>
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="hidden sm:inline">Preview</span>
          </button>
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <div className="sf-progress-bar">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === currentStep;
          const isCompleted = i < currentStep;
          const isClickable = i <= currentStep || canProceed;
          return (
            <React.Fragment key={step.id}>
              <button type="button" onClick={() => goToStep(i)} disabled={!isClickable}
                className={`sf-step-indicator ${isActive ? 'sf-step-active' : ''} ${isCompleted ? 'sf-step-done' : ''}`}>
                <div className="sf-step-circle">
                  {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className="sf-step-label">{step.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`sf-step-line ${isCompleted ? 'sf-step-line-done' : ''}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Messages ── */}
      {error && (
        <div className="mb-4 flex items-start p-4 bg-danger-muted border border-danger rounded-lg">
          <AlertCircle className="h-5 w-5 text-danger-text mr-3 mt-0.5 flex-shrink-0" />
          <span className="text-danger-text">{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-start p-4 bg-success-muted border border-success rounded-lg">
          <CheckCircle className="h-5 w-5 text-success-text mr-3 mt-0.5 flex-shrink-0" />
          <span className="text-success-text">{success}</span>
        </div>
      )}

      {/* ── Main Content Area ── */}
      <div className={`sf-main-layout ${showPreview ? 'sf-main-with-preview' : ''}`}>
        {/* Form Panel */}
        <div className="sf-form-panel">
          <div className="bg-surface-overlay border border-surface-border rounded-lg">
            <form ref={formRef} onSubmit={e => e.preventDefault()} className="p-6 sm:p-8">
              {/* Step Header */}
              <div className="sf-step-header">
                <div>
                  <span className="sf-step-number">Step {currentStep + 1} of {STEPS.length}</span>
                  <h2 className="sf-step-title">{STEPS[currentStep].desc}</h2>
                </div>
                <CompletenessRing pct={completeness.pct} />
              </div>

              {/* Step Content */}
              {renderStepContent()}

              {/* Navigation */}
              <div className="sf-nav">
                <button type="button" onClick={goPrev} disabled={currentStep === 0}
                  className="sf-nav-btn sf-nav-prev">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Previous
                </button>

                <div className="sf-nav-right">
                  {currentStep === STEPS.length - 1 ? (
                    <button type="button" onClick={handleSubmit} disabled={loading}
                      className="sf-nav-btn sf-nav-publish">
                      {loading ? (
                        <><span className="sf-spinner-sm" /> Publishing...</>
                      ) : (
                        <><CheckCircle className="h-4 w-4 mr-1" /> {isEditing ? 'Update Service' : 'Publish Service'}</>
                      )}
                    </button>
                  ) : (
                    <button type="button" onClick={goNext} disabled={!canProceed}
                      className="sf-nav-btn sf-nav-next">
                      Next <ArrowRight className="h-4 w-4 ml-1" />
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="sf-preview-panel">
            <ServicePreview formData={formData} catConfig={catConfig} imagePreviews={imagePreviews} user={user} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceForm;
