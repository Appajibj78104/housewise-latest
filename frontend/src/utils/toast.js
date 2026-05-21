/**
 * Premium toast notification helpers — wraps react-hot-toast with
 * consistent dark-theme styling that matches the HouseWise design system.
 *
 * Usage:
 *   import { showToast } from '../utils/toast';
 *   showToast.success('Booking confirmed!');
 *   showToast.error('Payment failed');
 *   showToast.info('Checking availability…');
 *   showToast.warning('Session expiring soon');
 *   showToast.promise(apiCall(), { loading: '…', success: '…', error: '…' });
 */
import toast from 'react-hot-toast';

/* ── shared base style ── */
const base = {
  background: '#181C24',
  color: '#F1F3F7',
  borderRadius: '12px',
  padding: '14px 20px',
  fontSize: '14px',
  fontFamily: 'Inter, system-ui, sans-serif',
  boxShadow: '0 8px 32px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.06)',
  maxWidth: '420px',
  lineHeight: 1.5,
};

const iconStyle = {
  width: 20,
  height: 20,
  flexShrink: 0,
};

export const showToast = {
  success: (message, opts = {}) =>
    toast.success(message, {
      style: { ...base, borderLeft: '4px solid #34D399' },
      iconTheme: { primary: '#34D399', secondary: '#181C24' },
      ...opts,
    }),

  error: (message, opts = {}) =>
    toast.error(message, {
      style: { ...base, borderLeft: '4px solid #F87171' },
      iconTheme: { primary: '#F87171', secondary: '#181C24' },
      duration: 5000,
      ...opts,
    }),

  info: (message, opts = {}) =>
    toast(message, {
      style: { ...base, borderLeft: '4px solid #60A5FA' },
      icon: 'ℹ️',
      ...opts,
    }),

  warning: (message, opts = {}) =>
    toast(message, {
      style: { ...base, borderLeft: '4px solid #FBBF24' },
      icon: '⚠️',
      duration: 5000,
      ...opts,
    }),

  promise: (promise, msgs, opts = {}) =>
    toast.promise(promise, msgs, {
      style: base,
      loading: { icon: '⏳' },
      success: {
        style: { ...base, borderLeft: '4px solid #34D399' },
        iconTheme: { primary: '#34D399', secondary: '#181C24' },
      },
      error: {
        style: { ...base, borderLeft: '4px solid #F87171' },
        iconTheme: { primary: '#F87171', secondary: '#181C24' },
      },
      ...opts,
    }),

  dismiss: () => toast.dismiss(),
};

export default showToast;
