import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, User } from '../services/auth.service';
import { STORAGE_KEYS } from '../services/api.service';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, pass: string) => Promise<{ user: User; token: string }>;
  googleLogin: (idToken: string) => Promise<{ user: User; token: string }>;
  register: (payload: {
    firstName: string;
    lastName?: string;
    username: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<any>;
  logout: () => Promise<void>;
  editProfile: (payload: {
    firstName?: string;
    lastName?: string;
    username?: string;
    phone?: string;
    avatarUrl?: string;
  }) => Promise<User>;
  refreshProfile: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => ({ user: {} as any, token: '' }),
  googleLogin: async () => ({ user: {} as any, token: '' }),
  register: async () => {},
  logout: async () => {},
  editProfile: async () => ({} as User),
  refreshProfile: async () => null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);

      if (storedToken) {
        setToken(storedToken);
      }
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }

      // If token exists, refresh profile in background
      if (storedToken) {
        try {
          const freshUser = await authService.getProfile();
          setUser(freshUser);
        } catch {
          // Token might have expired or server offline
        }
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (identifier: string, pass: string) => {
    const res = await authService.login(identifier, pass);
    setUser(res.user);
    setToken(res.token);
    return res;
  };

  const googleLogin = async (idToken: string) => {
    const res = await authService.googleLogin(idToken);
    setUser(res.user);
    setToken(res.token);
    return res;
  };

  const register = async (payload: any) => {
    return authService.register(payload);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setToken(null);
  };

  const editProfile = async (payload: any) => {
    const updated = await authService.editProfile(payload);
    setUser(updated);
    return updated;
  };

  const refreshProfile = async () => {
    try {
      const fresh = await authService.getProfile();
      setUser(fresh);
      return fresh;
    } catch {
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        login,
        googleLogin,
        register,
        logout,
        editProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
