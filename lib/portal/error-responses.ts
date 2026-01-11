/**
 * Error Response Templates and Formatting
 * Provides structured error responses with user-friendly messages
 */

export interface ErrorResponse {
  success: false;
  status: 'failed' | 'timeout' | 'not_found' | 'expired' | 'validation_failed' | 'too_many_requests';
  error: string;              // Machine-readable error code
  message: string;            // User-friendly message in Spanish
  suggestion?: string;        // Actionable suggestion
  details?: {                 // Debug info (only in dev)
    jobId?: string;
    supplementName?: string;
    elapsedTime?: number;
    retryCount?: number;
    validationErrors?: string[];
    [key: string]: unknown;
  };
  requestId: string;          // For support/debugging
  correlationId?: string;     // From request header
}

/**
 * Error message templates with status codes and user-friendly messages
 */
export const ERROR_MESSAGES = {
  JOB_EXPIRED: {
    status: 410,
    error: 'job_expired',
    message: 'El proceso de búsqueda tomó demasiado tiempo y expiró.',
    suggestion: 'Por favor, intenta buscar de nuevo.',
  },
  JOB_NOT_FOUND: {
    status: 404,
    error: 'job_not_found',
    message: 'No encontramos el proceso de búsqueda solicitado.',
    suggestion: 'Verifica el enlace o inicia una nueva búsqueda.',
  },
  JOB_TIMEOUT: {
    status: 408,
    error: 'job_timeout',
    message: 'La búsqueda está tomando más tiempo del esperado.',
    suggestion: 'Por favor, intenta de nuevo en unos momentos.',
  },
  TOO_MANY_REQUESTS: {
    status: 429,
    error: 'too_many_requests',
    message: 'Demasiados intentos de consulta.',
    suggestion: 'Por favor, espera unos segundos antes de intentar de nuevo.',
  },
  ENRICHMENT_FAILED: {
    status: 500,
    error: 'enrichment_failed',
    message: 'Hubo un error al procesar tu búsqueda.',
    suggestion: 'Por favor, intenta de nuevo. Si el problema persiste, contáctanos.',
  },
  VALIDATION_FAILED: {
    status: 400,
    error: 'validation_failed',
    message: 'El nombre del suplemento no es válido.',
    suggestion: 'Verifica que el nombre no esté vacío y no contenga caracteres especiales.',
  },
  DIRECT_FETCH_FAILED: {
    status: 500,
    error: 'direct_fetch_failed',
    message: 'No pudimos obtener la información del suplemento.',
    suggestion: 'Por favor, intenta de nuevo. Si el problema persiste, contáctanos.',
  },
  NORMALIZATION_FAILED: {
    status: 500,
    error: 'normalization_failed',
    message: 'No pudimos procesar el nombre del suplemento.',
    suggestion: 'Por favor, intenta con un nombre diferente o contáctanos.',
  },
} as const;

export type ErrorType = keyof typeof ERROR_MESSAGES;

/**
 * Sensitive data patterns to sanitize from error responses
 */
const SENSITIVE_PATTERNS = [
  // API keys and tokens
  /api[_-]?key[s]?[\s:=]+[^\s]+/gi,
  /token[\s:=]+[^\s]+/gi,
  /bearer\s+[^\s]+/gi,
  /authorization[\s:=]+[^\s]+/gi,
  
  // AWS credentials
  /aws[_-]?access[_-]?key[_-]?id[\s:=]+[^\s]+/gi,
  /aws[_-]?secret[_-]?access[_-]?key[\s:=]+[^\s]+/gi,
  
  // Internal paths
  /\/home\/[^\s]+/gi,
  /\/usr\/[^\s]+/gi,
  /\/var\/[^\s]+/gi,
  /C:\\[^\s]+/gi,
  
  // Database connection strings
  /mongodb:\/\/[^\s]+/gi,
  /postgres:\/\/[^\s]+/gi,
  /mysql:\/\/[^\s]+/gi,
  
  // Email addresses (partial sanitization)
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  
  // IP addresses (internal)
  /\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/gi,
  /\b172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}\b/gi,
  /\b192\.168\.\d{1,3}\.\d{1,3}\b/gi,
];

/**
 * Sanitize sensitive data from a string
 */
export function sanitizeSensitiveData(text: string): string {
  let sanitized = text;
  
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  
  return sanitized;
}

/**
 * Generate a unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Format an error response with proper structure and sanitization
 * 
 * @param errorType - The type of error from ERROR_MESSAGES
 * @param options - Additional options for the error response
 * @returns Formatted error response object and HTTP status code
 */
export function formatErrorResponse(
  errorType: ErrorType,
  options: {
    correlationId?: string;
    details?: Record<string, unknown>;
    customMessage?: string;
    customSuggestion?: string;
  } = {}
): { response: ErrorResponse; statusCode: number } {
  const template = ERROR_MESSAGES[errorType];
  const requestId = generateRequestId();
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Sanitize details if provided
  let sanitizedDetails: ErrorResponse['details'] | undefined;
  if (options.details) {
    sanitizedDetails = {};
    for (const [key, value] of Object.entries(options.details)) {
      if (typeof value === 'string') {
        sanitizedDetails[key] = sanitizeSensitiveData(value);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitizedDetails[key] = value;
      } else if (Array.isArray(value)) {
        // For arrays, sanitize each string element
        sanitizedDetails[key] = value.map(item => 
          typeof item === 'string' ? sanitizeSensitiveData(item) : item
        );
      } else if (value && typeof value === 'object') {
        // For objects, stringify and sanitize
        sanitizedDetails[key] = sanitizeSensitiveData(JSON.stringify(value));
      } else {
        sanitizedDetails[key] = value;
      }
    }
  }
  
  const response: ErrorResponse = {
    success: false,
    status: template.error as ErrorResponse['status'],
    error: template.error,
    message: options.customMessage || template.message,
    suggestion: options.customSuggestion || template.suggestion,
    requestId,
    correlationId: options.correlationId,
  };
  
  // Only include details in development mode
  if (isDevelopment && sanitizedDetails) {
    response.details = sanitizedDetails;
  }
  
  return {
    response,
    statusCode: template.status,
  };
}

/**
 * Format a validation error response
 * 
 * @param validationErrors - Array of validation error messages
 * @param options - Additional options
 * @returns Formatted error response object and HTTP status code
 */
export function formatValidationError(
  validationErrors: string[],
  options: {
    correlationId?: string;
    supplementName?: string;
  } = {}
): { response: ErrorResponse; statusCode: number } {
  const sanitizedErrors = validationErrors.map(err => sanitizeSensitiveData(err));
  
  return formatErrorResponse('VALIDATION_FAILED', {
    correlationId: options.correlationId,
    details: {
      validationErrors: sanitizedErrors,
      supplementName: options.supplementName,
    },
    customMessage: sanitizedErrors.length === 1 
      ? sanitizedErrors[0]
      : `Se encontraron ${sanitizedErrors.length} errores de validación.`,
  });
}
