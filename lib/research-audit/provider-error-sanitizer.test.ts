import { sanitizeProviderError } from './provider-error-sanitizer';

describe('sanitizeProviderError', () => {
  it('redacts provider auth errors before they can be written to reports', () => {
    const sanitized = sanitizeProviderError(
      JSON.stringify({
        error: {
          message: 'Invalid Authentication for key sk-secret-token',
          type: 'invalid_authentication_error',
        },
      }),
      401
    );

    expect(sanitized).toEqual({
      httpStatus: 401,
      errorType: 'invalid_authentication_error',
      message: 'provider authentication failed',
    });
    expect(JSON.stringify(sanitized)).not.toContain('sk-secret-token');
    expect(JSON.stringify(sanitized)).not.toContain('Invalid Authentication');
  });

  it('redacts quota and billing metadata from provider 429 errors', () => {
    const sanitized = sanitizeProviderError(
      JSON.stringify({
        error: {
          message:
            'Your account org-15c6702e4995423188fb3ab4eca27f86 <ak-f9g643cpffni11frg8pi> is suspended due to insufficient balance',
          type: 'exceeded_current_quota_error',
        },
      }),
      429
    );

    expect(sanitized).toEqual({
      httpStatus: 429,
      errorType: 'exceeded_current_quota_error',
      message: 'provider rate limit or quota error',
    });
    expect(JSON.stringify(sanitized)).not.toContain('org-15c');
    expect(JSON.stringify(sanitized)).not.toContain('ak-f9g');
    expect(JSON.stringify(sanitized)).not.toContain('balance');
    expect(JSON.stringify(sanitized)).not.toContain('suspended');
  });

  it('does not preserve suspicious error types', () => {
    const sanitized = sanitizeProviderError(
      JSON.stringify({
        error: {
          message: 'request failed',
          type: 'sk-secret-token',
        },
      }),
      400
    );

    expect(sanitized).toEqual({
      httpStatus: 400,
      message: 'provider request failed',
    });
  });
});
