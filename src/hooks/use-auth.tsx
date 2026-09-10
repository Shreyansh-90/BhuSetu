'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { UserCapabilities } from '@/app/actions/auth';

const AuthContext = createContext<UserCapabilities | undefined>(undefined);

export function AuthProvider({
  children,
  capabilities,
}: {
  children: ReactNode;
  capabilities: UserCapabilities;
}) {
  return (
    <AuthContext.Provider value={capabilities}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
