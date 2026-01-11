/**
 * Authentication Hook
 * Manages user authentication state
 */

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  signIn as cognitoSignIn,
  signUp as cognitoSignUp,
  signOut as cognitoSignOut,
  getCurrentSession,
  getCurrentUserId,
  getCurrentUserEmail,
  type SignInParams,
  type SignUpParams,
} from './cognito';
import { CognitoUserSession } from 'amazon-cognito-identity-js';

interface AuthContextType {
  user: {
    id: string | null;
    email: string | null;
    isAuthenticated: boolean;
  } | null;
  isLoading: boolean;
  signIn: (params: SignInParams) => Promise<void>;
  signUp: (params: SignUpParams) => Promise<{ success: boolean; message: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string | null; email: string | null; isAuthenticated: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    // Only run in browser
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    try {
      // Demo mode: Skip Cognito if not configured
      const hasCognitoConfig = 
        (process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID && process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID !== '') &&
        (process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID && process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID !== '');
      
      if (!hasCognitoConfig) {
        // Demo mode - no auth required
        setUser(null);
        setIsLoading(false);
        return;
      }

      const session = await getCurrentSession();
      if (session && session.isValid()) {
        const id = await getCurrentUserId();
        const email = await getCurrentUserEmail();
        setUser({
          id,
          email,
          isAuthenticated: true,
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const signIn = async (params: SignInParams) => {
    try {
      await cognitoSignIn(params);
      await refreshUser();
    } catch (error: any) {
      throw new Error(error.message || 'Sign in failed');
    }
  };

  const signUp = async (params: SignUpParams) => {
    return await cognitoSignUp(params);
  };

  const signOut = async () => {
    try {
      cognitoSignOut();
      setUser(null);
    } catch (error: any) {
      throw new Error(error.message || 'Sign out failed');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

