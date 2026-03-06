/** @jest-environment jsdom */
// Validates: I18N-02

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock next-intl: useTranslations returns key-prefixed strings for assertion
jest.mock('next-intl', () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
  useLocale: () => 'es',
}));

// Mock locale-aware router from i18n/navigation
const mockPush = jest.fn();
jest.mock('@/src/i18n/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock next/navigation (used by PortalHeader in RED state)
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => '/es/portal',
  useSearchParams: () => ({ get: jest.fn() }),
}));

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ href, children }: { href: string; children: React.ReactNode }) {
    return React.createElement('a', { href }, children);
  };
});

// Mock auth hook — no user signed in
jest.mock('@/lib/auth/useAuth', () => ({
  useAuth: () => ({ user: null, signOut: jest.fn() }),
}));

// Mock AuthModal to avoid its dependency tree
jest.mock('../AuthModal', () => {
  return function MockAuthModal({ isOpen }: { isOpen: boolean }) {
    return isOpen ? React.createElement('div', { 'data-testid': 'auth-modal' }) : null;
  };
});

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      initial: _i,
      animate: _a,
      exit: _e,
      transition: _t,
      ...props
    }: {
      children: React.ReactNode;
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      transition?: unknown;
      [key: string]: unknown;
    }) => React.createElement('div', props as React.HTMLAttributes<HTMLDivElement>, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

// Mock useReducedMotion
jest.mock('@/lib/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

import PortalHeader from '../PortalHeader';

describe('I18N-02: PortalHeader nav translations', () => {
  beforeEach(() => {
    mockPush.mockClear();
    render(React.createElement(PortalHeader));
  });

  it('renders nav.search translation key when locale=es', () => {
    expect(screen.getByText('nav.search')).toBeInTheDocument();
  });

  it('renders nav.plans translation key when locale=es', () => {
    expect(screen.getByText('nav.plans')).toBeInTheDocument();
  });

  it('renders nav.sign_in translation key when no user is signed in', () => {
    expect(screen.getByText('nav.sign_in')).toBeInTheDocument();
  });

  it('does not render hardcoded English string "Search"', () => {
    expect(screen.queryByText('Search')).not.toBeInTheDocument();
  });

  it('does not render hardcoded English string "Plans"', () => {
    expect(screen.queryByText('Plans')).not.toBeInTheDocument();
  });
});
