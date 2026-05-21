import { Link } from 'react-router-dom';

/**
 * Reusable premium empty-state component with SVG illustrations.
 *
 * Props:
 *   type       — 'bookings' | 'services' | 'reviews' | 'earnings' | 'search' | 'generic'
 *   title      — Heading text
 *   description— Body text
 *   actionText — CTA button label  (optional)
 *   actionTo   — Link destination   (optional — renders <Link>)
 *   onAction   — Click handler       (optional — renders <button>)
 *   secondaryText / secondaryAction — optional secondary button
 */

/* ── SVG Illustrations by type ── */
const illustrations = {
  bookings: (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="14" width="60" height="72" rx="8" stroke="#1E2230" strokeWidth="2" />
      <rect x="20" y="14" width="60" height="20" rx="8" fill="#181C24" stroke="#1E2230" strokeWidth="2" />
      <circle cx="36" cy="24" r="3" fill="#FF6B4A" opacity="0.6" />
      <circle cx="50" cy="24" r="3" fill="#FF8C5A" opacity="0.4" />
      <circle cx="64" cy="24" r="3" fill="#FF6B4A" opacity="0.2" />
      <line x1="30" y1="46" x2="70" y2="46" stroke="#1E2230" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="30" y1="56" x2="60" y2="56" stroke="#1E2230" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="30" y1="66" x2="52" y2="66" stroke="#1E2230" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="75" cy="72" r="16" fill="#111318" stroke="#FF6B4A" strokeWidth="1.5" opacity="0.8" />
      <path d="M75 65V72H82" stroke="#FF6B4A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  services: (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="24" width="32" height="52" rx="6" stroke="#1E2230" strokeWidth="2" />
      <rect x="56" y="24" width="32" height="52" rx="6" stroke="#1E2230" strokeWidth="2" />
      <rect x="16" y="30" width="24" height="14" rx="3" fill="#181C24" />
      <rect x="60" y="30" width="24" height="14" rx="3" fill="#181C24" />
      <line x1="16" y1="52" x2="36" y2="52" stroke="#1E2230" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="60" x2="30" y2="60" stroke="#1E2230" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="60" y1="52" x2="80" y2="52" stroke="#1E2230" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="60" y1="60" x2="74" y2="60" stroke="#1E2230" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="50" cy="50" r="14" fill="#0E1117" stroke="#FF6B4A" strokeWidth="1.5" />
      <path d="M47 50L49.5 52.5L54 47" stroke="#FF6B4A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  reviews: (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 18L56.2 36.6H75.6L59.7 48.4L65.9 67L50 55.2L34.1 67L40.3 48.4L24.4 36.6H43.8L50 18Z" stroke="#1E2230" strokeWidth="2" fill="#111318" />
      <path d="M50 28L54.1 40.6H67.4L56.6 48.4L60.8 61L50 53.2L39.2 61L43.4 48.4L32.6 40.6H45.9L50 28Z" stroke="#FF6B4A" strokeWidth="1" opacity="0.4" />
      <rect x="22" y="74" width="56" height="8" rx="4" fill="#181C24" stroke="#1E2230" strokeWidth="1" />
      <rect x="24" y="76" width="28" height="4" rx="2" fill="#FF6B4A" opacity="0.3" />
    </svg>
  ),
  earnings: (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="70" width="14" height="20" rx="3" fill="#181C24" stroke="#1E2230" strokeWidth="1.5" />
      <rect x="34" y="54" width="14" height="36" rx="3" fill="#181C24" stroke="#1E2230" strokeWidth="1.5" />
      <rect x="54" y="40" width="14" height="50" rx="3" fill="#181C24" stroke="#1E2230" strokeWidth="1.5" />
      <rect x="74" y="26" width="14" height="64" rx="3" fill="#181C24" stroke="#FF6B4A" strokeWidth="1.5" opacity="0.7" />
      <path d="M18 62L38 46L58 32L78 18" stroke="#FF6B4A" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 3" />
      <circle cx="78" cy="18" r="4" fill="#FF6B4A" opacity="0.5" />
    </svg>
  ),
  search: (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="44" cy="44" r="24" stroke="#1E2230" strokeWidth="2" />
      <circle cx="44" cy="44" r="16" stroke="#FF6B4A" strokeWidth="1" opacity="0.3" />
      <line x1="62" y1="62" x2="82" y2="82" stroke="#1E2230" strokeWidth="3" strokeLinecap="round" />
      <path d="M38 44H50" stroke="#1E2230" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M44 38V50" stroke="#1E2230" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  generic: (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="18" y="18" width="64" height="64" rx="12" stroke="#1E2230" strokeWidth="2" />
      <circle cx="50" cy="42" r="10" stroke="#FF6B4A" strokeWidth="1.5" opacity="0.5" />
      <line x1="34" y1="64" x2="66" y2="64" stroke="#1E2230" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="40" y1="72" x2="60" y2="72" stroke="#1E2230" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

export default function EmptyState({
  type = 'generic',
  title = 'Nothing here yet',
  description = '',
  actionText,
  actionTo,
  onAction,
  secondaryText,
  secondaryAction,
}) {
  const illustration = illustrations[type] || illustrations.generic;

  return (
    <div className="es-container">
      <div className="es-illustration">
        <div className="es-glow" />
        {illustration}
      </div>

      <h3 className="es-title">{title}</h3>
      {description && <p className="es-description">{description}</p>}

      {actionText && actionTo && (
        <Link to={actionTo} className="es-action">{actionText}</Link>
      )}

      {actionText && onAction && !actionTo && (
        <button className="es-action" onClick={onAction}>{actionText}</button>
      )}

      {secondaryText && secondaryAction && (
        <button className="es-secondary-action" onClick={secondaryAction}>
          {secondaryText}
        </button>
      )}
    </div>
  );
}
