import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

/**
 * Hook for admin real-time WebSocket connection.
 * Listens for admin-specific events (new bookings, new users, metric updates).
 */
export function useAdminSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);
  const listenersRef = useRef({});

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // Admin-specific events
    socket.on('admin:booking_update', (data) => {
      setLiveEvents(prev => [{ type: 'booking', ...data, id: Date.now() }, ...prev].slice(0, 50));
      // Notify registered listeners
      listenersRef.current['booking_update']?.forEach(fn => fn(data));
    });

    socket.on('admin:new_user', (data) => {
      setLiveEvents(prev => [{ type: 'user', ...data, id: Date.now() }, ...prev].slice(0, 50));
      listenersRef.current['new_user']?.forEach(fn => fn(data));
    });

    socket.on('admin:metrics_update', (data) => {
      listenersRef.current['metrics_update']?.forEach(fn => fn(data));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const on = useCallback((event, handler) => {
    if (!listenersRef.current[event]) listenersRef.current[event] = [];
    listenersRef.current[event].push(handler);
    return () => {
      listenersRef.current[event] = listenersRef.current[event].filter(fn => fn !== handler);
    };
  }, []);

  return { connected, liveEvents, on };
}
