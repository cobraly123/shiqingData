import React, { createContext, useState, useContext, useEffect } from 'react';
import { post, get, setAuthToken } from '../api/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored token and user on mount
    const token = localStorage.getItem('token');
    if (token) {
      setAuthToken(token);
      
      // Verify token and get user info
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await get('/api/auth/me');
      setUser(response.user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier, password, rememberMe) => {
    try {
      const response = await post('/api/auth/login', { identifier, password });
      const { token, user } = response;
      
      localStorage.setItem('token', token);
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }
      
      setAuthToken(token);
      setUser(user);
      return user;
    } catch (error) {
      throw error;
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await post('/api/auth/register', { username, email, password });
      const { token, user } = response;
      
      localStorage.setItem('token', token);
      
      setAuthToken(token);
      setUser(user);
      return user;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('rememberMe');
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
