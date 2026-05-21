import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { io } from 'socket.io-client';

const AdminNotificationBell = () => {
  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const socketRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      socket.emit('join-admin');
    });

    socket.on('admin-alert', (data) => {
      setAlerts(prev => [{ ...data, id: Date.now(), time: new Date() }, ...prev].slice(0, 20));
      setUnread(prev => prev + 1);
    });

    // Listen for specific admin events
    socket.on('new-provider-signup', (data) => {
      setAlerts(prev => [{ type: 'provider', message: `New provider signup: ${data.name || 'Unknown'}`, id: Date.now(), time: new Date() }, ...prev].slice(0, 20));
      setUnread(prev => prev + 1);
    });

    socket.on('review-flagged', (data) => {
      setAlerts(prev => [{ type: 'review', message: `Review flagged: "${(data.comment || '').slice(0, 40)}..."`, id: Date.now(), time: new Date() }, ...prev].slice(0, 20));
      setUnread(prev => prev + 1);
    });

    socket.on('new-booking', (data) => {
      setAlerts(prev => [{ type: 'booking', message: `New booking: ${data.service || 'Service'}`, id: Date.now(), time: new Date() }, ...prev].slice(0, 20));
      setUnread(prev => prev + 1);
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, []);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen(!open);
    if (!open) setUnread(0);
  };

  const formatTime = (t) => {
    if (!t) return '';
    const d = new Date(t);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-hover transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface-overlay border border-surface-border rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
            <h4 className="text-sm font-medium text-content-primary">Notifications</h4>
            {alerts.length > 0 && (
              <button onClick={() => setAlerts([])} className="text-[10px] text-content-muted hover:text-content-primary">Clear all</button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-content-muted">No notifications yet</div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className="px-4 py-3 border-b border-surface-border/50 hover:bg-surface-hover/50 transition-colors">
                  <div className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      alert.type === 'provider' ? 'bg-blue-400' : alert.type === 'review' ? 'bg-yellow-400' : 'bg-green-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-content-primary leading-relaxed">{alert.message}</p>
                      <p className="text-[10px] text-content-muted mt-0.5">{formatTime(alert.time)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotificationBell;
