import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '@/types';
import { sessionStorage, userStorage, activityLog, initializeDefaultData } from '@/lib/storage';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Mock passwords for demo
const MOCK_PASSWORDS: Record<string, string> = {
  'admin@autosdoserra.com.br': 'admin123',
  'carlos@autosdoserra.com.br': 'vendedor123',
  'maria@autosdoserra.com.br': 'vendedor123',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize default data
    initializeDefaultData();

    // Check for existing session
    const currentUser = sessionStorage.getCurrentUser();
    if (currentUser && sessionStorage.isSessionValid()) {
      setUser(currentUser);
    } else {
      sessionStorage.clearSession();
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const users = userStorage.getAll();
    const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!foundUser) {
      return { success: false, error: 'Usuário não encontrado' };
    }

    const expectedPassword = MOCK_PASSWORDS[foundUser.email];
    if (password !== expectedPassword) {
      return { success: false, error: 'Senha incorreta' };
    }

    sessionStorage.setCurrentUser(foundUser);
    setUser(foundUser);
    activityLog.add(foundUser.id, 'LOGIN', `${foundUser.name} entrou no sistema`);

    return { success: true };
  }, []);

  const logout = useCallback(() => {
    if (user) {
      activityLog.add(user.id, 'LOGOUT', `${user.name} saiu do sistema`);
    }
    sessionStorage.clearSession();
    setUser(null);
  }, [user]);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isAdmin }}>
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
