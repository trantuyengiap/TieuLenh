import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

export function useSocket(events) {
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, { withCredentials: true });
    socketRef.current = socket;

    Object.entries(events || {}).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      Object.entries(events || {}).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
      socket.disconnect();
    };
  }, [events]);

  return socketRef;
}
