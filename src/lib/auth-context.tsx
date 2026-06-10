'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface AuthContextType {
  userId: string | null;
  userName: string | null;
  role: string | null;
  isAdmin: boolean;
  isManager: boolean;
  permissions: any | null;
  hasPermission: (module: string, level: 'VIEW' | 'EDIT' | 'FULL') => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  userId: null,
  userName: null,
  role: null,
  isAdmin: false,
  isManager: false,
  permissions: null,
  hasPermission: () => false,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.role) {
          setRole(data.role);
          setUserId(data.id || null);
          setUserName(data.name || null);
          setPermissions(data.permissions || null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hasPermission = (module: string, level: 'VIEW' | 'EDIT' | 'FULL'): boolean => {
    if (role === 'ADMIN') return true; // Admins have absolute power

    if (!role || (role !== 'ADMIN' && role !== 'MANAGER')) {
      return false; // Standard members do not get dashboard module access
    }

    // Default permissions logic for compatibility
    if (!permissions) {
      if (role === 'MANAGER') {
        if (module === 'settings') return false; // settings restricted to Admin by default
        return true; // managers default to having full access for others
      }
      return false;
    }

    const userPerm = permissions[module] || (module === 'settings' ? 'NONE' : 'FULL');
    const levels = { 'NONE': 0, 'VIEW': 1, 'EDIT': 2, 'FULL': 3 };
    const userLevel = levels[userPerm as 'NONE' | 'VIEW' | 'EDIT' | 'FULL'] || 0;
    const reqLevel = levels[level];

    return userLevel >= reqLevel;
  };

  return (
    <AuthContext.Provider value={{
      userId,
      userName,
      role,
      isAdmin: role === 'ADMIN',
      isManager: role === 'MANAGER',
      permissions,
      hasPermission,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
