/**
 * Portal Header Component
 * Navigation with auth status and subscription access
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut, CreditCard } from 'lucide-react';
import { useAuth } from '@/lib/auth/useAuth';
import AuthModal from './AuthModal';

export default function PortalHeader() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/portal');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <>
      <header className="bg-white dark:bg-gray-900 border-b-2 border-gray-200 dark:border-gray-700 sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <button
              onClick={() => router.push('/portal')}
              className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
            >
              SuplementAI
            </button>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <button
                onClick={() => router.push('/portal')}
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
              >
                Search
              </button>
              <button
                onClick={() => router.push('/portal/subscription')}
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
              >
                Plans
              </button>
            </nav>

            {/* Auth Section */}
            <div className="flex items-center gap-4">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-800 transition-colors"
                  >
                    <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user.email}</span>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700 py-2">
                      <button
                        onClick={() => {
                          router.push('/portal/subscription');
                          setShowUserMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <CreditCard className="h-4 w-4" />
                        Subscription
                      </button>
                      <button
                        onClick={() => {
                          handleSignOut();
                          setShowUserMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signin"
      />
    </>
  );
}

