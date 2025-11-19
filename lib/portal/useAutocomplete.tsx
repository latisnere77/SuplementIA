/**
 * Autocomplete Hook
 * Custom hook para manejar sugerencias de autocomplete con debouncing
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { AutocompleteSuggestion } from './autocomplete-suggestions-fuzzy';

interface UseAutocompleteOptions {
  debounceMs?: number;
  minQueryLength?: number;
  limit?: number;
}

interface UseAutocompleteReturn {
  suggestions: AutocompleteSuggestion[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook para obtener sugerencias de autocomplete
 *
 * @param query - Texto de búsqueda del usuario
 * @param options - Opciones de configuración
 * @returns Sugerencias, estado de carga y errores
 *
 * @example
 * ```tsx
 * const { suggestions, isLoading } = useAutocomplete(searchQuery, {
 *   debounceMs: 300,
 *   limit: 5
 * });
 * ```
 */
export function useAutocomplete(
  query: string,
  options: UseAutocompleteOptions = {}
): UseAutocompleteReturn {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    limit = 5
  } = options;

  const { language } = useTranslation();
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // DEBUG: Log para verificar que el hook se está ejecutando
    console.log('[useAutocomplete] Query changed:', { query, language, minQueryLength });

    // Reset si query es muy corto
    if (query.length < minQueryLength) {
      console.log('[useAutocomplete] Query too short, skipping');
      setSuggestions([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    console.log('[useAutocomplete] Starting debounce timer...');

    // Cancelar request anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Debounce: esperar antes de hacer la request
    const timeoutId = setTimeout(async () => {
      console.log('[useAutocomplete] Debounce timer fired, making API call...');
      setIsLoading(true);
      setError(null);

      // Crear nuevo AbortController para esta request
      abortControllerRef.current = new AbortController();

      try {
        const url = `/api/portal/autocomplete?q=${encodeURIComponent(query)}&lang=${language}&limit=${limit}`;
        console.log('[useAutocomplete] Fetching:', url);

        const response = await fetch(url, { signal: abortControllerRef.current.signal });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[useAutocomplete] Response received:', data);

        if (data.success && Array.isArray(data.suggestions)) {
          console.log('[useAutocomplete] Setting suggestions:', data.suggestions);
          setSuggestions(data.suggestions);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err: any) {
        // Ignorar errores de abort (cancelación intencional)
        if (err.name !== 'AbortError') {
          console.error('[useAutocomplete] Error:', err);
          setError(err.message || 'Failed to fetch suggestions');
          setSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    // Cleanup: cancelar timeout y request al desmontar o cambiar query
    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, language, debounceMs, minQueryLength, limit]);

  return { suggestions, isLoading, error };
}
