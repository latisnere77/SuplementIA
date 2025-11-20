/**
 * Autocomplete Dropdown Component
 * Muestra sugerencias de búsqueda en un dropdown interactivo
 */

'use client';

import { useEffect, useRef } from 'react';
import { Search, TrendingUp, Folder } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { AutocompleteSuggestion } from '@/lib/portal/autocomplete-suggestions-fuzzy';

interface AutocompleteDropdownProps {
  suggestions: AutocompleteSuggestion[];
  selectedIndex: number;
  isLoading?: boolean;
  onSelect: (suggestion: AutocompleteSuggestion) => void;
  onClose: () => void;
}

/**
 * Dropdown de autocomplete con navegación por teclado
 *
 * Features:
 * - Click para seleccionar
 * - Navegación con teclado (↑↓)
 * - Click fuera para cerrar
 * - Iconos según tipo de sugerencia
 * - Highlighting del item seleccionado
 */
export function AutocompleteDropdown({
  suggestions,
  selectedIndex,
  isLoading = false,
  onSelect,
  onClose,
}: AutocompleteDropdownProps) {
  const { t } = useTranslation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  // DEBUG: Log cuando el componente se renderiza
  console.log('[AutocompleteDropdown] Rendering:', { suggestions: suggestions.length, isLoading });

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // No cerrar si el click fue dentro del dropdown
      if (dropdownRef.current && dropdownRef.current.contains(target)) {
        console.log('[AutocompleteDropdown] Click inside dropdown, not closing');
        return;
      }

      // Cerrar solo si el click fue fuera
      console.log('[AutocompleteDropdown] Click outside dropdown, closing');
      onClose();
    };

    // Usar 'click' con un pequeño delay para dar tiempo al onClick del botón
    document.addEventListener('click', handleClickOutside, true); // true = capture phase
    return () => document.removeEventListener('click', handleClickOutside, true);
  }, [onClose]);

  // Scroll automático al item seleccionado con teclado
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  // Obtener icono según tipo de sugerencia
  const getIcon = (type: AutocompleteSuggestion['type']) => {
    switch (type) {
      case 'category':
        return Folder;
      case 'condition':
        return TrendingUp;
      default:
        return Search;
    }
  };

  // Obtener label del tipo de sugerencia
  const getTypeLabel = (type: AutocompleteSuggestion['type']) => {
    switch (type) {
      case 'category':
        return t('autocomplete.categories');
      case 'condition':
        return 'Condition'; // Simple string, no translation needed
      default:
        return '';
    }
  };

  // Mostrar loader
  if (isLoading) {
    return (
      <div
        ref={dropdownRef}
        className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border-2 border-gray-100 p-4"
      >
        <div className="flex items-center gap-3 text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="text-sm">{t('autocomplete.loading')}</span>
        </div>
      </div>
    );
  }

  // No mostrar si no hay sugerencias
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border-2 border-gray-100 max-h-96 overflow-y-auto"
    >
      <ul className="py-2">
        {suggestions.map((suggestion, index) => {
          const Icon = getIcon(suggestion.type);
          const isSelected = index === selectedIndex;

          return (
            <li key={`${suggestion.text}-${index}`}>
              <button
                ref={isSelected ? selectedItemRef : null}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[AutocompleteDropdown] Clicked suggestion:', suggestion.text);
                  onSelect(suggestion);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className={`
                  w-full px-4 py-3 text-left flex items-center gap-3 transition-all
                  ${
                    isSelected
                      ? 'bg-blue-100'
                      : 'hover:bg-blue-50'
                  }
                `}
              >
                {/* Icono */}
                <Icon
                  className={`h-4 w-4 flex-shrink-0 ${
                    isSelected ? 'text-blue-600' : 'text-gray-400'
                  }`}
                />

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  {/* Texto de la sugerencia */}
                  <div
                    className={`text-sm font-medium truncate ${
                      isSelected ? 'text-blue-900' : 'text-gray-900'
                    }`}
                  >
                    {suggestion.text}
                  </div>

                  {/* Tipo de sugerencia (category/condition) */}
                  {suggestion.type !== 'supplement' && (
                    <div className="text-xs text-gray-500 truncate">
                      {getTypeLabel(suggestion.type)}
                    </div>
                  )}
                </div>

                {/* Score visual (opcional, solo para debugging) */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-gray-400 flex-shrink-0">
                    {Math.round(suggestion.score)}
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Footer con hint de navegación */}
      <div className="border-t border-gray-100 px-4 py-2 bg-gray-50 rounded-b-xl">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>↑↓ para navegar</span>
          <span>Enter para seleccionar</span>
          <span>Esc para cerrar</span>
        </div>
      </div>
    </div>
  );
}
