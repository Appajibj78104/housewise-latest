import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

let socket = null;

export function getSocket() {
  return socket;
}

function connect() {
  const token = localStorage.getItem('token');
  if (!token) return;

  if (socket?.connected) return;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.debug('[Socket] Connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.debug('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.debug('[Socket] Connection error:', err.message);
  });
}

function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function useSocket() {
  return { socket, connect, disconnect };
}

export default useSocket;
