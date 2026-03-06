/** @jest-environment jsdom */
// Validates: I18N-03, I18N-04

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock locale-aware router from i18n/navigation (used after fix)
const mockPush = jest.fn();
jest.mock('@/src/i18n/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock next-intl (used after fix)
jest.mock('next-intl', () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
  useLocale: () => 'es',
}));

beforeEach(() => {
  mockPush.mockClear();
});

import { ErrorState } from '../ErrorState';

const baseProps = {
  supplementName: 'TestSupplement',
  onRetry: jest.fn(),
};

describe('I18N-04: ErrorState does not render English-language search tips', () => {
  it('does not contain "términos en inglés" in insufficient_scientific_data error', () => {
    render(
      React.createElement(ErrorState, {
        ...baseProps,
        error: { type: 'insufficient_scientific_data', message: 'No studies found' },
      })
    );
    expect(screen.queryByText(/términos en inglés/i)).not.toBeInTheDocument();
  });

  it('does not contain "términos en inglés" in system_error', () => {
    render(
      React.createElement(ErrorState, {
        ...baseProps,
        error: { type: 'system_error', message: 'Server error' },
      })
    );
    expect(screen.queryByText(/términos en inglés/i)).not.toBeInTheDocument();
  });
});

describe('I18N-03: ErrorState suggestion buttons use locale-aware navigation', () => {
  const errorWithSuggestion = {
    type: 'insufficient_scientific_data' as const,
    message: 'No studies',
    suggestions: [{ name: 'Melatonina', hasStudies: true }],
  };

  it('clicking a suggestion calls router.push (not window.location.href)', async () => {
    const user = userEvent.setup();
    render(
      React.createElement(ErrorState, {
        ...baseProps,
        error: errorWithSuggestion,
      })
    );
    const suggestionBtn = screen.getByText('Melatonina');
    await user.click(suggestionBtn);
    expect(mockPush).toHaveBeenCalled();
  });

  it('router.push path does not contain a hardcoded locale prefix', async () => {
    const user = userEvent.setup();
    render(
      React.createElement(ErrorState, {
        ...baseProps,
        error: errorWithSuggestion,
      })
    );
    const suggestionBtn = screen.getByText('Melatonina');
    await user.click(suggestionBtn);
    expect(mockPush).toHaveBeenCalled();
    const calledWith = mockPush.mock.calls[0][0] as string;
    expect(calledWith).not.toMatch(/^\/(en|es)\//);
  });

  it('the back-to-portal button calls router.push("/portal")', async () => {
    const user = userEvent.setup();
    render(
      React.createElement(ErrorState, {
        ...baseProps,
        error: { type: 'insufficient_scientific_data', message: 'No studies' },
      })
    );
    const backBtn = screen.getByText('Buscar Otro Suplemento');
    await user.click(backBtn);
    expect(mockPush).toHaveBeenCalledWith('/portal');
  });
});
