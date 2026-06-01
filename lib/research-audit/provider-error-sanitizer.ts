export interface SanitizedProviderError {
  httpStatus?: number;
  errorType?: string;
  message: string;
}

const SAFE_ERROR_TYPE_PATTERN = /^[a-z][a-z0-9_.-]{0,80}$/i;
const SENSITIVE_PATTERN =
  /(org-[a-z0-9_-]+|ak-[a-z0-9_-]+|sk-[a-z0-9_-]+|api[_-]?key|token|bearer|account)/i;

function parseProviderErrorType(body: string): string | undefined {
  try {
    const parsed = JSON.parse(body) as unknown;
    if (!parsed || typeof parsed !== 'object') return undefined;

    const error = (parsed as { error?: unknown }).error;
    if (!error || typeof error !== 'object') return undefined;

    const type = (error as { type?: unknown }).type;
    if (typeof type === 'string' && SAFE_ERROR_TYPE_PATTERN.test(type)) return type;
  } catch {
    return undefined;
  }

  return undefined;
}

function safeMessageForStatus(httpStatus?: number): string {
  if (httpStatus === 401 || httpStatus === 403) return 'provider authentication failed';
  if (httpStatus === 429) return 'provider rate limit or quota error';
  if (httpStatus && httpStatus >= 500) return 'provider server error';
  if (httpStatus) return 'provider request failed';
  return 'provider response could not be parsed';
}

export function sanitizeProviderError(body: string, httpStatus?: number): SanitizedProviderError {
  const errorType = parseProviderErrorType(body);
  const sanitized: SanitizedProviderError = {
    httpStatus,
    message: safeMessageForStatus(httpStatus),
  };

  if (errorType && !SENSITIVE_PATTERN.test(errorType)) {
    sanitized.errorType = errorType;
  }

  return sanitized;
}
