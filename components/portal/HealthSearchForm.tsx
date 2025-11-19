/**
 * Health Search Form Component
 * Main search interface for health goals and problems
 * Similar to Examine.com's search-first approach
 */

'use client';

import { useState } from 'react';
import { Search, TrendingUp, Brain, Heart, Moon, Dumbbell, Shield } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useAutocomplete } from '@/lib/portal/useAutocomplete';
import { AutocompleteDropdown } from './AutocompleteDropdown';

interface HealthSearchFormProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

// Pre-populated health categories (like Examine.com)
// Note: Names and descriptions are translated in the component using t()
const HEALTH_CATEGORIES = [
  {
    id: 'muscle-gain',
    nameKey: 'category.muscle-gain',
    descKey: 'category.muscle-gain.desc',
    icon: Dumbbell,
    color: 'from-blue-500 to-blue-600',
  },
  {
    id: 'cognitive',
    nameKey: 'category.cognitive',
    descKey: 'category.cognitive.desc',
    icon: Brain,
    color: 'from-purple-500 to-purple-600',
  },
  {
    id: 'sleep',
    nameKey: 'category.sleep',
    descKey: 'category.sleep.desc',
    icon: Moon,
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    id: 'immune',
    nameKey: 'category.immune',
    descKey: 'category.immune.desc',
    icon: Shield,
    color: 'from-green-500 to-green-600',
  },
  {
    id: 'heart',
    nameKey: 'category.heart',
    descKey: 'category.heart.desc',
    icon: Heart,
    color: 'from-red-500 to-red-600',
  },
  {
    id: 'fat-loss',
    nameKey: 'category.fat-loss',
    descKey: 'category.fat-loss.desc',
    icon: TrendingUp,
    color: 'from-orange-500 to-orange-600',
  },
];

// Popular searches - Now using i18n keys (will be translated in render)
const POPULAR_SEARCH_KEYS = [
  { key: 'muscle', en: 'How to build muscle', es: 'Cómo ganar músculo' },
  { key: 'sleep', en: 'Improve sleep quality', es: 'Mejorar calidad del sueño' },
  { key: 'cognitive', en: 'Boost cognitive function', es: 'Aumentar función cognitiva' },
  { key: 'immune', en: 'Support immune system', es: 'Apoyar sistema inmunológico' },
  { key: 'energy', en: 'Increase energy levels', es: 'Aumentar niveles de energía' },
  { key: 'inflammation', en: 'Reduce inflammation', es: 'Reducir inflamación' },
];

export default function HealthSearchForm({ onSearch, isLoading = false }: HealthSearchFormProps) {
  const { t, language } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategories, setShowCategories] = useState(true);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Hook de autocomplete con debouncing
  const { suggestions, isLoading: isLoadingSuggestions } = useAutocomplete(searchQuery, {
    debounceMs: 300,
    limit: 5,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setShowCategories(false);
      setShowAutocomplete(false);
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    onSearch(categoryId);
    setShowCategories(false);
  };

  const handlePopularSearch = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
    setShowCategories(false);
    setShowAutocomplete(false);
  };

  // Manejar navegación con teclado en autocomplete
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showAutocomplete || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        if (selectedIndex >= 0) {
          e.preventDefault();
          const selected = suggestions[selectedIndex];
          setSearchQuery(selected.text);
          onSearch(selected.text);
          setShowAutocomplete(false);
          setShowCategories(false);
        }
        // Si no hay selección, dejamos que el form submit normal funcione
        break;
      case 'Escape':
        setShowAutocomplete(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Manejar selección de sugerencia con click
  const handleSuggestionSelect = (suggestion: { text: string }) => {
    setSearchQuery(suggestion.text);
    onSearch(suggestion.text);
    setShowAutocomplete(false);
    setShowCategories(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Main Search Bar */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowAutocomplete(true);
              setSelectedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (searchQuery.length >= 2) {
                setShowAutocomplete(true);
              }
            }}
            placeholder={t('portal.search.placeholder')}
            className="w-full pl-12 pr-4 py-4 text-lg border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            disabled={isLoading}
            autoComplete="off"
          />
          {(isLoading || isLoadingSuggestions) && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            </div>
          )}

          {/* Autocomplete Dropdown */}
          {showAutocomplete && suggestions.length > 0 && (
            <AutocompleteDropdown
              suggestions={suggestions}
              selectedIndex={selectedIndex}
              isLoading={isLoadingSuggestions}
              onSelect={handleSuggestionSelect}
              onClose={() => {
                setShowAutocomplete(false);
                setSelectedIndex(-1);
              }}
            />
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading || !searchQuery.trim()}
          className="mt-4 w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
        >
          {isLoading ? t('portal.search.analyzing') : t('portal.search.button')}
        </button>
      </form>

      {/* Popular Searches */}
      {showCategories && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">
            {t('portal.popular.searches')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCH_KEYS.map((item) => {
              // Obtener texto traducido según idioma
              const searchText = language === 'es' ? item.es : item.en;
              return (
                <button
                  key={item.key}
                  onClick={() => handlePopularSearch(searchText)}
                  className="px-4 py-2 bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-600 rounded-full text-sm font-medium transition-colors border border-gray-200 hover:border-blue-300"
                >
                  {searchText}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Health Categories Grid */}
      {showCategories && (
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wide">
            {t('portal.browse.categories')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {HEALTH_CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className="group relative p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all text-left"
                >
                  <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${category.color} mb-3`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {t(category.nameKey as any)}
                  </h4>
                  <p className="text-sm text-gray-600">{t(category.descKey as any)}</p>
                  <div className="mt-3 text-xs font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    {t('evidence.view.studies')} →
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

