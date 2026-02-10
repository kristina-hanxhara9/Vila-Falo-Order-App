import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const setAuthToken = (token) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.defaults.headers.common['x-auth-token'] = token;
    } else {
      delete axios.defaults.headers.common['Authorization'];
      delete axios.defaults.headers.common['x-auth-token'];
    }
  };

  useEffect(() => {
    if (token) {
      setAuthToken(token);
    }
  }, [token]);

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          setAuthToken(token);
          const res = await axios.get(`${API_URL}/auth/user`);
          setUser(res.data);
          setIsAuthenticated(true);
          setLoading(false);
        } catch (err) {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
          setError('Sesioni juaj ka skaduar. Ju lutem hyni perseri.');
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  const login = async (username, pin) => {
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { username, pin });

      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      setIsAuthenticated(true);
      setError('');

      return res.data.user;
    } catch (err) {
      setError(err.response?.data?.message || 'Gabim gjate hyrjes');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const getRoleName = (role) => {
    switch (role) {
      case 'waiter':
        return 'Kamarier';
      case 'kitchen':
        return 'Kuzhina';
      case 'manager':
        return 'Manaxher';
      default:
        return role;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated,
        loading,
        user,
        error,
        login,
        logout,
        getRoleName
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
