'use client';

import { useRouter } from 'next/navigation';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchApi, loginRequest } from '../../lib/api';
import {
  AuthUser,
  clearSession,
  getAccessToken,
  getStoredUser,
  persistSession,
  setUnauthorizedHandler,
} from '../../lib/auth-session';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback((expired = false) => {
    clearSession();
    setUser(null);
    router.replace(expired ? '/login?motivo=sessao' : '/login');
  }, [router]);

  useEffect(() => {
    setUnauthorizedHandler(() => logout(true));
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    const cached = getStoredUser();
    if (cached) setUser(cached);
    fetchApi<AuthUser>('/auth/me')
      .then((current) => {
        persistSession(token, current);
        setUser(current);
      })
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest(email, password);
    persistSession(result.accessToken, result.user);
    setUser(result.user);
    router.replace('/');
  }, [router]);

  const value = useMemo(() => ({ user, loading, login, logout: () => logout(false) }), [user, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}
