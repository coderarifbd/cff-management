'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface AuthContextType {
  role: string | null;
  isAdmin: boolean;
  isManager: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  role: null,
  isAdmin: false,
  isManager: false,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.role) setRole(data.role);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{
      role,
      isAdmin: role === 'ADMIN',
      isManager: role === 'MANAGER',
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
