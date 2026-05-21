import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, Clock, Calendar, Star, ShieldCheck, ShieldX, X, Sparkles } from 'lucide-react';

const ICON_MAP = {
  booking_new: Calendar,
  booking_confirmed: Check,
  booking_declined: X,
  booking_completed: CheckCheck,
  booking_cancelled: X,
  review_new: Star,
  service_new: Sparkles,
  provider_approved: ShieldCheck,
  provider_rejected: ShieldX,
};

function timeAgo(dateStr) {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return 'recently';
  }
}

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleBellClick = () => {
    setOpen(prev => !prev);
  };

  const handleNotificationClick = (notif) => {
    if (!notif.read) {
      setNotifications(prev =>
        prev.map(n => n._id === notif._id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <div className="ntf-wrapper" ref={dropdownRef}>
      <button className="ntf-bell-btn" onClick={handleBellClick} aria-label="Notifications">
        <Bell style={{ width: 18, height: 18 }} />
        {unreadCount > 0 && (
          <span className="ntf-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="ntf-dropdown">
          <div className="ntf-header">
            <span className="ntf-header-title">Notifications</span>
            {unreadCount > 0 && (
              <button className="ntf-mark-all" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="ntf-list">
            {notifications.length === 0 ? (
              <div className="ntf-empty">
                <Bell style={{ width: 24, height: 24, opacity: 0.3 }} />
                <span>No notifications yet</span>
              </div>
            ) : (
              notifications.map(notif => {
                const Icon = ICON_MAP[notif.type] || Clock;
                return (
                  <button
                    key={notif._id}
                    className={`ntf-item ${notif.read ? '' : 'ntf-unread'}`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className={`ntf-icon ntf-icon-${notif.type?.split('_')[0]}`}>
                      <Icon style={{ width: 14, height: 14 }} />
                    </div>
                    <div className="ntf-content">
                      <span className="ntf-item-title">{notif.title}</span>
                      <span className="ntf-item-msg">{notif.message}</span>
                      <span className="ntf-item-time">{timeAgo(notif.createdAt)}</span>
                    </div>
                    {!notif.read && <span className="ntf-unread-dot" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
