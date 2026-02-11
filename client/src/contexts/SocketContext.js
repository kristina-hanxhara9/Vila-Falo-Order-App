import React, { createContext, useState, useEffect, useContext } from 'react';
import io from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || (process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:5000');

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { token, isAuthenticated } = useContext(AuthContext);

  useEffect(() => {
    // Only connect when authenticated
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const socketInstance = io(SOCKET_URL, {
      auth: { token }
    });

    socketInstance.on('connect', () => {
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      if (err.message === 'Authentication required' || err.message === 'Invalid token') {
        setConnected(false);
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [isAuthenticated, token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
