import { useMemo, useState, useRef } from 'react';
import {
  PlayCircle, CheckCircle, Camera, Image as ImageIcon, Edit3,
  Clock, MapPin, Truck, AlertTriangle, Tag, MessageSquare, X,
  Loader2, Plus
} from 'lucide-react';
import { bookingsAPI } from '../../services/api';

/**
 * JobTimeline (`tl-*` namespace)
 * Vertical visual timeline of every status checkpoint, photo, and note.
 * Provider can compose new entries (notes / before-after photos) inline.
 */

const TYPE_META = {
  created:           { icon: Plus,        color: '#6b7385', label: 'Booking created' },
  quote_request:     { icon: Tag,         color: '#f59e0b', label: 'Quote requested' },
  quote_offer:       { icon: Tag,         color: '#f59e0b', label: 'Quote offer' },
  quote_accepted:    { icon: CheckCircle, color: '#10b981', label: 'Quote accepted' },
  quote_rejected:    { icon: X,           color: '#ef4444', label: 'Quote rejected' },
  confirmed:         { icon: CheckCircle, color: '#10b981', label: 'Confirmed' },
  declined:          { icon: X,           color: '#ef4444', label: 'Declined' },
  eta_set:           { icon: Clock,       color: '#6366f1', label: 'ETA set' },
  on_the_way:        { icon: Truck,       color: '#6366f1', label: 'On the way' },
  arrived:           { icon: MapPin,      color: '#06b6d4', label: 'Arrived' },
  started:           { icon: PlayCircle,  color: '#8b5cf6', label: 'Job started' },
  note:              { icon: MessageSquare, color: '#6b7385', label: 'Note' },
  before_photos:     { icon: Camera,      color: '#8b5cf6', label: 'Before photos' },
  after_photos:      { icon: Camera,      color: '#10b981', label: 'After photos' },
  progress:          { icon: ImageIcon,   color: '#06b6d4', label: 'Progress update' },
  completed:         { icon: CheckCircle, color: '#06b6d4', label: 'Completed' },
  cancelled:         { icon: X,           color: '#ef4444', label: 'Cancelled' },
  tip_added:         { icon: Tag,         color: '#10b981', label: 'Tip received' },
  dispute_raised:    { icon: AlertTriangle, color: '#ef4444', label: 'Dispute raised' },
  dispute_resolved:  { icon: CheckCircle, color: '#10b981', label: 'Dispute resolved' },
};

const fmtTime = (d) => {
  if (!d) return '';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch (err) {
    console.warn('Date formatting error:', err);
    return '';
  }
};

export default function JobTimeline({ booking, role = 'customer', onChange }) {
  const events = useMemo(() => booking?.timeline || [], [booking]);
  const isProvider = role === 'housewife' || role === 'provider';
  const canCompose = isProvider && ['confirmed', 'in_progress'].includes(booking?.status);

  return (
    <div className="tl-card">
      <div className="tl-head">
        <h3 className="tl-title">Job Timeline</h3>
        <span className="tl-count">{events.length} {events.length === 1 ? 'event' : 'events'}</span>
      </div>

      <div className="tl-list">
        {events.length === 0 && (
          <div className="tl-empty">No activity yet — updates will appear here.</div>
        )}
        {events.map((e, i) => {
          const meta = TYPE_META[e.type] || { icon: MessageSquare, color: '#6b7385', label: e.type };
          const Icon = meta.icon;
          return (
            <div key={i} className="tl-item">
              <div className="tl-dot-col">
                <div className="tl-dot" style={{ background: meta.color }}>
                  <Icon size={12} />
                </div>
                {i !== events.length - 1 && <div className="tl-line" />}
              </div>
              <div className="tl-body">
                <div className="tl-row">
                  <span className="tl-label" style={{ color: meta.color }}>{meta.label}</span>
                  <span className="tl-when">{fmtTime(e.at)}</span>
                </div>
                {e.message && <p className="tl-msg">{e.message}</p>}
                {e.photos?.length > 0 && (
                  <div className="tl-photos">
                    {e.photos.map((p, j) => (
                      <a key={j} href={p} target="_blank" rel="noreferrer" className="tl-photo-link">
                        <img src={p} alt={`${meta.label} ${j + 1}`} className="tl-photo" />
                      </a>
                    ))}
                  </div>
                )}
                {e.byRole && <span className="tl-by">by {e.byRole}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {canCompose && <TimelineComposer booking={booking} onChange={onChange} />}
    </div>
  );
}

function TimelineComposer({ booking, onChange }) {
  const [type, setType] = useState('progress');
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const inputRef = useRef(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!message && files.length === 0) {
      setErr('Add a message or at least one photo');
      return;
    }
    try {
      setBusy(true);
      await bookingsAPI.addTimelineEvent(booking._id, { type, message, photos: files });
      setMessage('');
      setFiles([]);
      if (inputRef.current) inputRef.current.value = '';
      onChange?.();
    } catch (e2) {
      setErr(e2.response?.data?.message || e2.message || 'Failed to post update');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="tl-composer" onSubmit={submit}>
      <div className="tl-composer-head">
        <Edit3 size={14} />
        <strong>Post an update</strong>
      </div>
      <div className="tl-composer-types">
        {[
          { v: 'progress', l: 'Progress' },
          { v: 'before_photos', l: 'Before' },
          { v: 'after_photos', l: 'After' },
          { v: 'note', l: 'Note' },
        ].map(opt => (
          <button
            type="button"
            key={opt.v}
            className={`tl-type-chip ${type === opt.v ? 'on' : ''}`}
            onClick={() => setType(opt.v)}
          >{opt.l}</button>
        ))}
      </div>
      <textarea
        rows={2}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Describe what's happening (optional)"
        className="tl-textarea"
        maxLength={1000}
      />
      <div className="tl-composer-actions">
        <label className="tl-photo-pick">
          <Camera size={14} /> {files.length ? `${files.length} photo${files.length > 1 ? 's' : ''}` : 'Add photos'}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))}
          />
        </label>
        <button type="submit" className="tl-post-btn" disabled={busy}>
          {busy ? <Loader2 size={14} className="tl-spin" /> : null}
          {busy ? 'Posting…' : 'Post update'}
        </button>
      </div>
      {err && <div className="tl-err">{err}</div>}
    </form>
  );
}
