/**
 * ErrorMessage Component
 * Displays inline error messages with different styles for 4xx vs 5xx errors
 * 
 * Requirements:
 * - 5.1: Show generic friendly message for 500 errors (no technical details)
 * - 5.2: Show alternative search suggestions for 404 errors
 * - 5.3: Offer retry button for timeout errors (408)
 * - 5.4: Suggest contacting support after multiple consecutive errors
 * - 5.5: Clear error messages on successful retry (handled by parent)
 */

'use client';

import { AlertCircle, AlertTriangle, RefreshCw, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export interface ErrorMessageProps {
  /** HTTP status code (400, 404, 408, 410, 429, 500, etc.) */
  statusCode?: number;
  /** User-friendly error message */
  message: string;
  /** Actionable suggestion for the user */
  suggestion?: string;
  /** Alternative search suggestions (for 404 errors) */
  searchSuggestions?: string[];
  /** Number of consecutive failures (for showing contact support) */
  consecutiveFailures?: number;
  /** Callback for retry action */
  onRetry?: () => void;
  /** Callback for search suggestion click */
  onSearchSuggestion?: (suggestion: string) => void;
  /** Whether to show the component inline or as a card */
  variant?: 'inline' | 'card';
}

/**
 * Determine if error is a client error (4xx) or server error (5xx)
 */
function getErrorCategory(statusCode?: number): '4xx' | '5xx' | 'unknown' {
  if (!statusCode) return 'unknown';
  if (statusCode >= 400 && statusCode < 500) return '4xx';
  if (statusCode >= 500 && statusCode < 600) return '5xx';
  return 'unknown';
}

/**
 * Get appropriate icon based on error category
 */
function getErrorIcon(category: '4xx' | '5xx' | 'unknown') {
  switch (category) {
    case '4xx':
      return <AlertTriangle className="h-5 w-5" />;
    case '5xx':
      return <AlertCircle className="h-5 w-5" />;
    default:
      return <AlertCircle className="h-5 w-5" />;
  }
}

/**
 * Get appropriate styling based on error category
 */
function getErrorStyles(category: '4xx' | '5xx' | 'unknown') {
  switch (category) {
    case '4xx':
      // Client errors - yellow/warning style
      return {
        alertClass: 'border-yellow-300 bg-yellow-50',
        iconClass: 'text-yellow-600',
        titleClass: 'text-yellow-900',
        messageClass: 'text-yellow-800',
        buttonClass: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      };
    case '5xx':
      // Server errors - red/error style
      return {
        alertClass: 'border-red-300 bg-red-50',
        iconClass: 'text-red-600',
        titleClass: 'text-red-900',
        messageClass: 'text-red-800',
        buttonClass: 'bg-red-600 hover:bg-red-700 text-white',
      };
    default:
      // Unknown - gray/neutral style
      return {
        alertClass: 'border-gray-300 bg-gray-50',
        iconClass: 'text-gray-600',
        titleClass: 'text-gray-900',
        messageClass: 'text-gray-800',
        buttonClass: 'bg-gray-600 hover:bg-gray-700 text-white',
      };
  }
}

/**
 * Get user-friendly title based on status code
 */
function getErrorTitle(statusCode?: number): string {
  if (!statusCode) return 'Error';
  
  switch (statusCode) {
    case 400:
      return 'Solicitud inválida';
    case 404:
      return 'No encontrado';
    case 408:
      return 'Tiempo de espera agotado';
    case 410:
      return 'Proceso expirado';
    case 429:
      return 'Demasiados intentos';
    case 500:
      return 'Error del servidor';
    case 502:
    case 503:
    case 504:
      return 'Servicio no disponible';
    default:
      if (statusCode >= 400 && statusCode < 500) {
        return 'Error en la solicitud';
      }
      if (statusCode >= 500 && statusCode < 600) {
        return 'Error del servidor';
      }
      return 'Error';
  }
}

export function ErrorMessage({
  statusCode,
  message,
  suggestion,
  searchSuggestions = [],
  consecutiveFailures = 0,
  onRetry,
  onSearchSuggestion,
  variant = 'inline',
}: ErrorMessageProps) {
  const category = getErrorCategory(statusCode);
  const styles = getErrorStyles(category);
  const icon = getErrorIcon(category);
  const title = getErrorTitle(statusCode);
  
  // Determine if we should show retry button (408 timeout or when onRetry is provided)
  const showRetryButton = statusCode === 408 || (onRetry && category === '5xx');
  
  // Show contact support after 3 consecutive failures (Requirement 5.4)
  const showContactSupport = consecutiveFailures >= 3;
  
  // Show search suggestions for 404 errors (Requirement 5.2)
  const showSearchSuggestions = statusCode === 404 && searchSuggestions.length > 0;

  const content = (
    <Alert className={styles.alertClass}>
      <div className={styles.iconClass}>
        {icon}
      </div>
      <AlertTitle className={styles.titleClass}>
        {title}
      </AlertTitle>
      <AlertDescription className="space-y-4">
        {/* Main error message (Requirement 5.1: Generic friendly message for 500 errors) */}
        <p className={styles.messageClass}>
          {message}
        </p>

        {/* Actionable suggestion */}
        {suggestion && (
          <p className={`text-sm ${styles.messageClass}`}>
            💡 {suggestion}
          </p>
        )}

        {/* Search suggestions for 404 errors (Requirement 5.2) */}
        {showSearchSuggestions && (
          <div className="space-y-2">
            <p className={`text-sm font-medium ${styles.titleClass}`}>
              ¿Quizás buscabas alguno de estos?
            </p>
            <div className="flex flex-wrap gap-2">
              {searchSuggestions.map((suggestionText, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => onSearchSuggestion?.(suggestionText)}
                  className="bg-white hover:bg-gray-100 border-gray-300"
                >
                  {suggestionText}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          {/* Retry button for timeout errors (Requirement 5.3) */}
          {showRetryButton && onRetry && (
            <Button
              onClick={onRetry}
              size="sm"
              className={styles.buttonClass}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Intentar de nuevo
            </Button>
          )}

          {/* Contact support after multiple failures (Requirement 5.4) */}
          {showContactSupport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = 'mailto:support@suplementia.com'}
              className="border-gray-300 hover:bg-gray-100"
            >
              <Mail className="w-4 h-4 mr-2" />
              Contactar soporte
            </Button>
          )}
        </div>

        {/* Additional help text for repeated failures */}
        {showContactSupport && (
          <p className="text-xs text-gray-600 bg-white rounded p-2 border border-gray-200">
            Hemos detectado múltiples intentos fallidos. Nuestro equipo de soporte puede ayudarte a resolver este problema.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );

  // Return as card or inline based on variant
  if (variant === 'card') {
    return (
      <div className="max-w-2xl mx-auto p-4">
        {content}
      </div>
    );
  }

  return content;
}
