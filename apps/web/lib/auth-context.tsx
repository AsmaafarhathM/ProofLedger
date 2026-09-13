'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from './api-client';
import { User } from './types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  activeOrgId: string | null;
  setActiveOrgId: (id: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  const refreshUser = async () => {
    try {
      const storedToken = localStorage.getItem('proofledger_token');
      if (!storedToken) {
        setUser(null);
        setToken(null);
        setIsLoading(false);
        return;
      }
      setToken(storedToken);
      const data = await apiClient.get<{ user?: User; id?: string }>('/auth/me');
      if (data && data.user) {
        setUser(data.user);
      } else if (data && data.id) {
        setUser(data as User);
      }
    } catch (error) {
      console.warn('Session restoration failed:', error);
      localStorage.removeItem('proofledger_token');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const restore = async () => {
      try {
        const storedToken = localStorage.getItem('proofledger_token');
        if (!storedToken) {
          if (isMounted) {
            setUser(null);
            setToken(null);
            setIsLoading(false);
          }
          return;
        }
        if (isMounted) setToken(storedToken);
        const data = await apiClient.get<{ user?: User; id?: string }>('/auth/me');
        if (isMounted) {
          if (data && data.user) {
            setUser(data.user);
          } else if (data && data.id) {
            setUser(data as User);
          }
        }
      } catch {
        if (isMounted) {
          localStorage.removeItem('proofledger_token');
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    restore();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await apiClient.post<{ accessToken: string; user: User }>('/auth/login', {
        email,
        password,
      });
      const accessToken = data.accessToken;
      if (accessToken) {
        localStorage.setItem('proofledger_token', accessToken);
        setToken(accessToken);
        setUser(data.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => {
    setIsLoading(true);
    try {
      const data = await apiClient.post<{ accessToken: string; user: User }>('/auth/register', {
        email,
        password,
        firstName,
        lastName,
      });
      const accessToken = data.accessToken;
      if (accessToken) {
        localStorage.setItem('proofledger_token', accessToken);
        setToken(accessToken);
        setUser(data.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('proofledger_token');
    setUser(null);
    setToken(null);
    setActiveOrgId(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        activeOrgId,
        setActiveOrgId,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
