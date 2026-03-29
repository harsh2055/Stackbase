// frontend/context/AuthContext.js
// Global authentication state — wraps the entire app.
// Reads JWT from localStorage, provides login/logout helpers,
// and exposes the current user to all components.

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const TOKEN_KEY = 'stackbase_token';
const USER_KEY  = 'stackbase_user';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(null);
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false); // true once we've read from localStorage

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser  = localStorage.getItem(USER_KEY);
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (_) {}
    setReady(true);
  }, []);

  /**
   * Log in — store token and user in state + localStorage.
   */
  const login = useCallback((tokenVal, userVal) => {
    setToken(tokenVal);
    setUser(userVal);
    localStorage.setItem(TOKEN_KEY, tokenVal);
    localStorage.setItem(USER_KEY, JSON.stringify(userVal));
  }, []);

  /**
   * Log out — clear state and localStorage.
   */
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  /**
   * Authenticated fetch — automatically adds Authorization header.
   */
  const authFetch = useCallback(async (path, options = {}) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) logout(); // Auto-logout on auth failure
      throw new Error(data.error || 'Request failed');
    }
    return data;
  }, [token, logout]);

  return (
    <AuthContext.Provider value={{ user, token, ready, login, logout, authFetch, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
