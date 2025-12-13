/**
 * Portal Layout
 * Includes TranslationProvider and AuthProvider
 */

'use client';

import { TranslationProvider } from '@/lib/i18n/useTranslation';
import { AuthProvider } from '@/lib/auth/useAuth';
import LanguageSelector from '@/components/portal/LanguageSelector';
import PortalHeader from '@/components/portal/PortalHeader';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TranslationProvider>
      <AuthProvider>
        <div className="relative min-h-screen">
          <PortalHeader />
          {/* Language Selector - Fixed top right */}
          <div className="fixed top-20 right-4 z-50">
            <LanguageSelector />
          </div>
          <main className="pt-16">
            {children}
          </main>
        </div>
      </AuthProvider>
    </TranslationProvider>
  );
}

