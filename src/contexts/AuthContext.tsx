import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '@/types';
import { sessionStorage, userStorage, activityLog, initializeDefaultData } from '@/lib/storage';
import { verifyPassword, hashPassword } from '@/lib/passwordUtils';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      // Initialize default data
      await initializeDefaultData();

      // Check for existing session
      const currentUser = sessionStorage.getCurrentUser();
      if (currentUser && sessionStorage.isSessionValid()) {
        // Refresh user data from storage
        const freshUser = userStorage.getById(currentUser.id);
        if (freshUser && freshUser.status === 'ativo') {
          setUser(freshUser);
        } else {
          sessionStorage.clearSession();
        }
      } else {
        sessionStorage.clearSession();
      }
      setIsLoading(false);
    };
    
    init();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const foundUser = userStorage.getByEmail(email);

      if (!foundUser) {
        return { success: false, error: 'Usuário não encontrado' };
      }

      if (foundUser.status === 'inativo') {
        return { success: false, error: 'Usuário inativo. Contate o administrador.' };
      }

      // Verify password
      if (foundUser.passwordHash) {
        const isValid = await verifyPassword(password, foundUser.passwordHash);
        if (!isValid) {
          return { success: false, error: 'Senha incorreta' };
        }
      } else {
        // Legacy user without hash - use default passwords for migration
        const legacyPasswords: Record<string, string> = {
          'admin@autosdoserra.com.br': 'admin123',
        };
        const expectedPassword = legacyPasswords[foundUser.email] || 'vendedor123';
        
        if (password !== expectedPassword) {
          return { success: false, error: 'Senha incorreta' };
        }
        
        // Migrate: create hash for legacy user
        const newHash = await hashPassword(password);
        foundUser.passwordHash = newHash;
        userStorage.save(foundUser);
      }

      sessionStorage.setCurrentUser(foundUser);
      setUser(foundUser);
      activityLog.add(foundUser.id, 'LOGIN', `${foundUser.name} entrou no sistema`);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Erro ao fazer login' };
    }
  }, []);

  const logout = useCallback(() => {
    if (user) {
      activityLog.add(user.id, 'LOGOUT', `${user.name} saiu do sistema`);
    }
    sessionStorage.clearSession();
    setUser(null);
  }, [user]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!user) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    // Verify current password
    if (user.passwordHash) {
      const isValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValid) {
        return { success: false, error: 'Senha atual incorreta' };
      }
    }

    // Update password
    const success = await userStorage.updatePassword(user.id, newPassword);
    if (success) {
      activityLog.add(user.id, 'PASSWORD_CHANGE', `${user.name} alterou sua senha`);
      return { success: true };
    }

    return { success: false, error: 'Erro ao alterar senha' };
  }, [user]);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, changePassword, isAdmin }}>
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
