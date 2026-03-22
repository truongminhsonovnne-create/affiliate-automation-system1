/**
 * useAuth Hook with Role Support
 * 
 * Client-side hook for authentication state and role-based access.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { hasRole, hasPermission, permissions, roleLabels, Role } from './rbac';

interface AuthUser {
  id: string;
  role: Role;
}

interface UseAuthReturn {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  hasPermission: (permission: keyof typeof permissions) => boolean;
  hasRole: (minRole: Role) => boolean;
  roleLabel: string;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.user) {
          setUser(data.user as AuthUser);
        }
      }
    } catch {
      // Session check failed
    } finally {
      setLoading(false);
    }
  }

  const login = useCallback(async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUser(data.user as AuthUser);
        return { success: true };
      }
      
      return { success: false, error: data.error || 'Login failed' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  }, []);

  const hasPermissionFn = useCallback((permission: keyof typeof permissions) => {
    if (!user) return false;
    return hasPermission(user.role, permission);
  }, [user]);

  const hasRoleFn = useCallback((minRole: Role) => {
    if (!user) return false;
    return hasRole(user.role, minRole);
  }, [user]);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    hasPermission: hasPermissionFn,
    hasRole: hasRoleFn,
    roleLabel: user ? roleLabels[user.role] : '',
  };
}
