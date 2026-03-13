import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { ApiAuthUser, ApiRequestError, createToken, getCurrentUser, revokeToken } from '@/services/authApi';
import { AUTH_TOKEN_STORAGE_KEY, AUTH_USER_STORAGE_KEY } from '@/services/authStorage';
import { clearCachedDashboardSummary } from '@/services/dashboardApi';

type AuthContextValue = {
  authLoading: boolean;
  isAuthenticated: boolean;
  authUser: ApiAuthUser | null;
  authToken: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authLoading, setAuthLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<ApiAuthUser | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [storedToken, storedUserRaw] = await Promise.all([
          AsyncStorage.getItem(AUTH_TOKEN_STORAGE_KEY),
          AsyncStorage.getItem(AUTH_USER_STORAGE_KEY),
        ]);
        if (!mounted) return;

        if (!storedToken) {
          setAuthLoading(false);
          return;
        }

        setAuthToken(storedToken);

        if (storedUserRaw) {
          try {
            setAuthUser(JSON.parse(storedUserRaw) as ApiAuthUser);
          } catch {
            setAuthUser(null);
          }
        }

        try {
          const user = await getCurrentUser(storedToken);
          if (!mounted) return;
          setAuthUser(user);
          await AsyncStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
        } catch (error) {
          if (!mounted) return;
          if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
            setAuthToken(null);
            setAuthUser(null);
            await AsyncStorage.multiRemove([AUTH_TOKEN_STORAGE_KEY, AUTH_USER_STORAGE_KEY]);
            await clearCachedDashboardSummary();
          }
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await createToken(username.trim(), password);
      setAuthToken(response.token);
      setAuthUser(response.user);
      await AsyncStorage.multiSet([
        [AUTH_TOKEN_STORAGE_KEY, response.token],
        [AUTH_USER_STORAGE_KEY, JSON.stringify(response.user)],
      ]);
      return true;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    const token = authToken;
    setAuthToken(null);
    setAuthUser(null);
    await AsyncStorage.multiRemove([AUTH_TOKEN_STORAGE_KEY, AUTH_USER_STORAGE_KEY]);
    await clearCachedDashboardSummary();

    if (!token) return;
    try {
      await revokeToken(token);
    } catch {
      // Local logout should always succeed even if remote revoke fails.
    }
  };

  const isAuthenticated = Boolean(authToken);
  const value = useMemo(
    () => ({ authLoading, isAuthenticated, authUser, authToken, login, logout }),
    [authLoading, isAuthenticated, authUser, authToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
