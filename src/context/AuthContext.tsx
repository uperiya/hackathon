import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { 
  getCurrentStoredUser, 
  loginWithEmail, 
  registerUser, 
  logoutUser, 
  updateUserDetails 
} from '../services/authService';
import { SEED_USERS } from '../lib/seedData';
import { getCollectionData } from '../lib/storage';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  loading: boolean;
  login: (email: string, pass: string) => Promise<UserProfile>;
  register: (name: string, email: string, pass: string, role?: UserRole) => Promise<UserProfile>;
  logout: () => Promise<void>;
  quickDemoLogin: (role: UserRole) => Promise<UserProfile>;
  updateName: (name: string) => Promise<void>;
  hasPermission: (requiredRole: 'Admin' | 'Inventory Manager' | 'Warehouse Staff') => boolean;
  canAccessRoute: (route: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => getCurrentStoredUser());
  const [loading, setLoading] = useState(false);

  const role: UserRole = user?.role || 'Warehouse Staff';

  const login = async (email: string, pass: string): Promise<UserProfile> => {
    setLoading(true);
    try {
      const loggedIn = await loginWithEmail(email, pass);
      setUser(loggedIn);
      return loggedIn;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, pass: string, assignedRole: UserRole = 'Warehouse Staff'): Promise<UserProfile> => {
    setLoading(true);
    try {
      const created = await registerUser(name, email, pass, assignedRole);
      setUser(created);
      return created;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      await logoutUser();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const quickDemoLogin = async (targetRole: UserRole): Promise<UserProfile> => {
    setLoading(true);
    try {
      const allUsers = await getCollectionData<UserProfile>('users');
      let target = allUsers.find(u => u.role === targetRole);
      if (!target) {
        target = SEED_USERS.find(u => u.role === targetRole) || SEED_USERS[0];
      }
      localStorage.removeItem('stocksense_logged_out');
      localStorage.setItem('stocksense_auth_user', JSON.stringify(target));
      setUser(target);
      return target;
    } finally {
      setLoading(false);
    }
  };

  const updateName = async (name: string) => {
    if (!user) return;
    const updated = await updateUserDetails(user.id, { name });
    setUser(updated);
  };

  const hasPermission = (requiredRole: 'Admin' | 'Inventory Manager' | 'Warehouse Staff'): boolean => {
    if (!user) return false;
    const currentRole = user.role as string;
    if (currentRole === 'Admin') return true;
    if (requiredRole === 'Warehouse Staff') return true;
    if (requiredRole === 'Inventory Manager' && currentRole === 'Inventory Manager') return true;
    return currentRole === requiredRole;
  };

  const canAccessRoute = (route: string): boolean => {
    if (!user) return false;
    if (user.role === 'Admin') return true;

    // Inventory Manager permissions
    if (user.role === 'Inventory Manager') {
      const forbidden = ['/settings/company']; // Only admin manages company settings
      return !forbidden.includes(route);
    }

    // Warehouse Staff permissions:
    // Dashboard, Receipts, Deliveries, Transfers, Stock counting (adjustments), Move History
    if (user.role === 'Warehouse Staff') {
      const allowedPrefixes = [
        '/dashboard',
        '/operations/receipts',
        '/operations/deliveries',
        '/operations/transfers',
        '/operations/adjustments',
        '/move-history',
        '/profile'
      ];
      return allowedPrefixes.some(prefix => route.startsWith(prefix));
    }

    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        login,
        register,
        logout,
        quickDemoLogin,
        updateName,
        hasPermission,
        canAccessRoute,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
