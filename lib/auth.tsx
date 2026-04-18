'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';

export interface AuthUser {
  id: string; studentId: string; firstname: string; surname: string; nickname: string;
  email: string; role: 'student' | 'staff' | 'admin'; profilePicture: string; bio: string;
  selectedClubs?: Record<number, string | null>;
  clubHistory?: any[];
  treasureAnswers?: Record<number, string>;
}

interface AuthContextType {
  user: AuthUser | null; loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async (id: string) => {
    const res = await fetch(`/api/users?id=${id}`);
    if (res.ok) { const data = await res.json(); setUser(data.user); }
    else { Cookies.remove('psc12_user'); setUser(null); }
  };

  useEffect(() => {
    const id = Cookies.get('psc12_user');
    if (id) fetchUser(id).finally(() => setLoading(false));
    else setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (res.ok) {
      Cookies.set('psc12_user', data.user.id, { expires: 30 });
      await fetchUser(data.user.id);
      return { success: true, message: 'Logged in' };
    }
    return { success: false, message: data.error ?? 'Login failed' };
  };

  const logout = () => { Cookies.remove('psc12_user'); setUser(null); };
  const refreshUser = async () => { if (user) await fetchUser(user.id); };

  return <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
