import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationsAPI } from '../services/api';
import { getSocket } from './useSocket';

const POLL_INTERVAL = 120000; // 2min fallback (socket is primary now)

export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notificationsAPI.getAll({ limit: 20 });
      if (res?.success) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      // Silent fail — don't disrupt UI
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationsAPI.getUnreadCount();
      if (res?.success) {
        setUnreadCount(res.data.count);
      }
    } catch (err) {
      // Silent fail
    }
  }, []);

  const markRead = useCallback(async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      // Silent fail
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      // Silent fail
    }
  }, []);

  // Socket.io listener for real-time notifications
  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      const handler = (notification) => {
        setNotifications(prev => [notification, ...prev].slice(0, 20));
        setUnreadCount(prev => prev + 1);
      };
      socket.on('notification:new', handler);
      return () => socket.off('notification:new', handler);
    }
  }, []);

  // Initial fetch + fallback polling (longer interval since socket is primary)
  useEffect(() => {
    fetchNotifications();
    intervalRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    refresh: fetchNotifications
  };
}
