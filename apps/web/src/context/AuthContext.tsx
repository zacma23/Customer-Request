import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, setAccessToken, getAccessToken } from '../api/client';
import { User, Role } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isClient: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  signup: (payload: any) => Promise<{ user: User; devOtpCode?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      setUser(response.data.data.user);
    } catch {
      setUser(null);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (identifier: string, password: string): Promise<User> => {
    const response = await api.post('/auth/login', { identifier, password });
    const { user: loggedInUser, tokens } = response.data.data;
    setAccessToken(tokens.accessToken);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const signup = async (payload: any): Promise<{ user: User; devOtpCode?: string }> => {
    const response = await api.post('/auth/signup', payload);
    const { user: registeredUser, tokens, devOtpCode } = response.data.data;
    setAccessToken(tokens.accessToken);
    setUser(registeredUser);
    return { user: registeredUser, devOtpCode };
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    setAccessToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  const role: Role | undefined = user?.role;
  const isClient = role === 'CLIENT';
  const isStaff = role === 'STAFF';
  const isAdmin = role === 'ADMIN';
  const isSuperAdmin = role === 'SUPER_ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isClient,
        isStaff,
        isAdmin,
        isSuperAdmin,
        login,
        signup,
        logout,
        refreshUser,
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
