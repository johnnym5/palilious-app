'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';

// The shape of our "fake" user object
interface SimpleUser {
  isLoggedIn: boolean;
  displayName: string;
  username: string;
  email: string;
  uid: string;
  role: 'MD'; // Hardcode as MD for full access
  photoURL?: string;
}

// The shape of the context
interface SimpleAuthContextType {
  user: SimpleUser | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isUserLoading: boolean;
}

// The hardcoded credentials
const SUPER_ADMIN_USERNAME = 'Admin';
const SUPER_ADMIN_PASSWORD = 'setup';

// The fake user object to use on successful login
const adminUser: SimpleUser = {
  isLoggedIn: true,
  displayName: 'Super Admin',
  username: 'Admin',
  email: 'admin@internal.local',
  uid: 'super-admin-uid-001', // A predictable UID
  role: 'MD',
  photoURL: `https://picsum.photos/seed/admin/48/48`,
};


const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

export function SimpleAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(false);

  const login = (username, password) => {
    setIsUserLoading(true);
    // Simulate network delay
    setTimeout(() => {
      if (username === SUPER_ADMIN_USERNAME && password === SUPER_ADMIN_PASSWORD) {
        setUser(adminUser);
      }
      setIsUserLoading(false);
    }, 500);
    
    // Check credentials
    if (username === SUPER_ADMIN_USERNAME && password === SUPER_ADMIN_PASSWORD) {
        return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };
  
  const value = useMemo(() => ({
    user,
    login,
    logout,
    isUserLoading,
  }), [user, isUserLoading]);

  return (
    <SimpleAuthContext.Provider value={value}>
      {children}
    </SimpleAuthContext.Provider>
  );
}

export function useSimpleAuth() {
  const context = useContext(SimpleAuthContext);
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider');
  }
  return context;
}
