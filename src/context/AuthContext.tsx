import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, getStoredToken, setStoredToken, removeStoredToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<{ require2FA?: boolean; tempToken?: string }>;
  login2FA: (tempToken: string, code: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; timezone?: string }) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
  loginDemo: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      const stored = getStoredToken();
      if (stored) {
        try {
          const res = await api.getMe();
          if (res.data?.user) {
            setUser(res.data.user);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Session expired or invalid token, logging in demo account');
        }
      }

      // Auto-login demo user for immediate SaaS exploration
      const demoRes = await api.loginDemo();
      if (demoRes.data?.token && demoRes.data?.user) {
        setStoredToken(demoRes.data.token);
        setToken(demoRes.data.token);
        setUser(demoRes.data.user);
      }
    } catch (e) {
      console.warn('Could not auto-login demo user:', e);
      removeStoredToken();
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password });
      if ((res as any).require2FA) {
        setIsLoading(false);
        return { require2FA: true, tempToken: (res as any).data?.tempToken };
      }
      if (res.data?.token && res.data?.user) {
        setStoredToken(res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
      }
      return { require2FA: false };
    } finally {
      setIsLoading(false);
    }
  };

  const login2FA = async (tempToken: string, code: string) => {
    setIsLoading(true);
    try {
      const res = await api.login2FA(tempToken, code);
      if (res.data?.token && res.data?.user) {
        setStoredToken(res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: { name: string; email: string; password: string; timezone?: string }) => {
    setIsLoading(true);
    try {
      const res = await api.register(data);
      if (res.data?.token && res.data?.user) {
        setStoredToken(res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loginDemo = async () => {
    setIsLoading(true);
    try {
      const res = await api.loginDemo();
      if (res.data?.token && res.data?.user) {
        setStoredToken(res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    removeStoredToken();
    setToken(null);
    setUser(null);
  };

  const updateUser = (updated: User) => {
    setUser(updated);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        token,
        login,
        login2FA,
        register,
        logout,
        updateUser,
        refreshUser,
        loginDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
