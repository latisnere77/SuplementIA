/**
 * Input Validation and Sanitization Module
 * Provides validation functions for supplement queries
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { normalizeQuery, type NormalizedQuery } from './query-normalization';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  suggestion?: string;
}

/**
 * Validate supplement name for empty/whitespace-only values
 * Requirement 4.1: WHEN se recibe una búsqueda de suplemento THEN el sistema SHALL validar que el nombre no esté vacío
 */
export function validateSupplementName(name: string): ValidationResult {
  // Check if name is null, undefined, or not a string
  if (!name || typeof name !== 'string') {
    return {
      valid: false,
      error: 'El nombre del suplemento es requerido',
      suggestion: 'Por favor, ingresa un nombre de suplemento válido',
    };
  }

  // Check if name is only whitespace
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return {
      valid: false,
      error: 'El nombre del suplemento no puede estar vacío',
      suggestion: 'Por favor, ingresa un nombre de suplemento válido',
    };
  }

  // Check minimum length (at least 2 characters)
  if (trimmed.length < 2) {
    return {
      valid: false,
      error: 'El nombre del suplemento es demasiado corto',
      suggestion: 'Por favor, ingresa al menos 2 caracteres',
    };
  }

  return { valid: true };
}

/**
 * Sanitize query to handle special characters correctly
 * Requirement 4.3: WHEN un suplemento tiene caracteres especiales THEN el sistema SHALL sanitizarlos correctamente
 */
export function sanitizeQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    return '';
  }

  return query
    .trim()
    // Remove potentially dangerous characters
    .replace(/[<>]/g, '')
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Normalize multiple spaces to single space
    .replace(/\s+/g, ' ')
    // Limit length to prevent abuse
    .slice(0, 100);
}

/**
 * Verify that normalization was successful
 * Requirement 4.2: WHEN se normaliza un query THEN el sistema SHALL verificar que la normalización fue exitosa antes de proceder
 */
export function verifyNormalization(normalized: NormalizedQuery): ValidationResult {
  // Check if normalization returned a valid result
  if (!normalized || !normalized.normalized) {
    return {
      valid: false,
      error: 'Error al normalizar el nombre del suplemento',
      suggestion: 'Por favor, intenta con un nombre diferente',
    };
  }

  // Check if normalized name is empty
  if (normalized.normalized.trim().length === 0) {
    return {
      valid: false,
      error: 'La normalización resultó en un nombre vacío',
      suggestion: 'Por favor, verifica el nombre del suplemento',
    };
  }

  // Check if normalization confidence is too low (< 0.3)
  // This indicates the query might not be a valid supplement name
  if (normalized.confidence < 0.3 && normalized.confidence > 0) {
    return {
      valid: false,
      error: 'No pudimos identificar el suplemento con certeza',
      suggestion: 'Por favor, verifica la ortografía o intenta con un nombre más específico',
    };
  }

  return { valid: true };
}

/**
 * Detect problematic queries that might cause issues
 * Requirement 4.5: WHEN se detecta un query potencialmente problemático THEN el sistema SHALL loggear una advertencia
 */
export function detectProblematicQuery(query: string): {
  isProblematic: boolean;
  reason?: string;
  severity: 'low' | 'medium' | 'high';
} {
  const trimmed = query.trim();

  // Check for very long queries
  if (trimmed.length > 100) {
    return {
      isProblematic: true,
      reason: 'Query exceeds maximum length',
      severity: 'medium',
    };
  }

  // Check for queries that look like SQL injection attempts (check before special chars)
  const sqlPatterns = /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bUNION\b)/i;
  if (sqlPatterns.test(trimmed)) {
    return {
      isProblematic: true,
      reason: 'Query contains SQL-like patterns',
      severity: 'high',
    };
  }

  // Check for queries that look like script injection attempts (check before special chars)
  const scriptPatterns = /<script|javascript:|onerror=|onload=/i;
  if (scriptPatterns.test(trimmed)) {
    return {
      isProblematic: true,
      reason: 'Query contains script-like patterns',
      severity: 'high',
    };
  }

  // Check for queries with excessive special characters
  const specialCharCount = (trimmed.match(/[^a-zA-Z0-9\s\-]/g) || []).length;
  const specialCharRatio = specialCharCount / trimmed.length;
  if (specialCharRatio > 0.3) {
    return {
      isProblematic: true,
      reason: 'Query contains too many special characters',
      severity: 'high',
    };
  }

  // Check for queries with only numbers
  if (/^\d+$/.test(trimmed)) {
    return {
      isProblematic: true,
      reason: 'Query contains only numbers',
      severity: 'medium',
    };
  }

  // Check for queries with repeated characters (e.g., "aaaaaaa")
  if (/(.)\1{5,}/.test(trimmed)) {
    return {
      isProblematic: true,
      reason: 'Query contains repeated characters',
      severity: 'high',
    };
  }

  // Check for queries with unusual character combinations
  if (/[^\x20-\x7E\u00C0-\u024F\u1E00-\u1EFF]/.test(trimmed)) {
    return {
      isProblematic: true,
      reason: 'Query contains unusual characters',
      severity: 'low',
    };
  }

  return {
    isProblematic: false,
    severity: 'low',
  };
}

/**
 * Comprehensive validation function that combines all checks
 * Returns 400 Bad Request for validation failures with descriptive messages
 */
export function validateAndSanitizeQuery(query: string): {
  valid: boolean;
  sanitized?: string;
  normalized?: NormalizedQuery;
  error?: string;
  suggestion?: string;
  statusCode?: number;
  problematic?: {
    isProblematic: boolean;
    reason?: string;
    severity: 'low' | 'medium' | 'high';
  };
} {
  // Step 1: Validate supplement name
  const nameValidation = validateSupplementName(query);
  if (!nameValidation.valid) {
    return {
      valid: false,
      error: nameValidation.error,
      suggestion: nameValidation.suggestion,
      statusCode: 400,
    };
  }

  // Step 2: Sanitize query
  const sanitized = sanitizeQuery(query);
  if (sanitized.length === 0) {
    return {
      valid: false,
      error: 'El nombre del suplemento contiene solo caracteres inválidos',
      suggestion: 'Por favor, usa solo letras, números y espacios',
      statusCode: 400,
    };
  }

  // Step 3: Detect problematic queries
  const problematic = detectProblematicQuery(sanitized);

  // Step 4: Normalize query
  const normalized = normalizeQuery(sanitized);

  // Step 5: Verify normalization
  const normalizationValidation = verifyNormalization(normalized);
  if (!normalizationValidation.valid) {
    return {
      valid: false,
      sanitized,
      error: normalizationValidation.error,
      suggestion: normalizationValidation.suggestion,
      statusCode: 400,
      problematic,
    };
  }

  return {
    valid: true,
    sanitized,
    normalized,
    problematic,
  };
}
