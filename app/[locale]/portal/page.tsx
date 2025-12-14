/**
 * Portal Landing Page
 * Modern design from Magic MCP integrated with existing system
 */

'use client';

import { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Heart, Shield, TrendingUp, BookOpen, Globe, ChevronRight, Dumbbell, Brain, Moon, Bone, Milestone, Sparkles, User, Venus, Mars } from 'lucide-react';
import { Combobox, Transition } from '@headlessui/react';
import { useTranslations, useLocale } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAutocomplete } from '@/lib/portal/useAutocomplete';
import { validateSupplementQuery } from '@/lib/portal/query-validator';
import { normalizeQuery } from '@/lib/portal/query-normalization';
import FAQSection from '@/components/portal/FAQSection';
import { getAllCategories } from '@/lib/knowledge-base'; // Importar la fuente de la verdad

// Mapeo de slugs a iconos para mantener la consistencia visual
const categoryIcons: { [key: string]: React.ElementType } = {
  sleep: Moon,
  energy: TrendingUp,
  anxiety: Shield,
  'muscle-gain': Dumbbell,
  'cognitive-function': Brain,
  'heart-health': Heart,
  'joint-bone-health': Bone,
  'gut-health': Milestone, // Icono de reemplazo para 'Stomach'
  'skin-hair-health': Sparkles,
  immunity: Shield, // Re-usando Shield para inmunidad
  'mens-health': Mars, // Icono de reemplazo para 'User'
  'womens-health': Venus, // Icono de reemplazo para 'Woman'
};

export default function PortalPage() {
  const t = useTranslations();
  const language = useLocale();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Hook de autocomplete con debouncing
  const { suggestions, isLoading: isLoadingSuggestions } = useAutocomplete(searchQuery, {
    debounceMs: 300,
    limit: 10,
  });

  const placeholders = language === 'es'
    ? [
      t('portal.search.placeholder'),
      '¿Qué beneficios tiene la vitamina D?',
      'Mejores suplementos para energía',
      'Información sobre omega-3',
    ]
    : [
      t('portal.search.placeholder'),
      'What are the benefits of vitamin D?',
      'Best supplements for energy',
      'Information about omega-3',
    ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [placeholders.length]);

  // ¡Ahora las categorías se cargan dinámicamente!
  const categories = getAllCategories().map(category => ({
    ...category,
    name: t(`portal.categories.${category.slug}.name` as any, { defaultMessage: category.name }),
    description: t(`portal.categories.${category.slug}.desc` as any, { defaultMessage: category.description }),
    icon: categoryIcons[category.slug] || BookOpen, // Usar icono mapeado o uno por defecto
    color: {
      sleep: 'from-indigo-500/20 to-indigo-600/20',
      energy: 'from-orange-500/20 to-amber-500/20',
      anxiety: 'from-green-500/20 to-green-600/20',
      'muscle-gain': 'from-blue-500/20 to-blue-600/20',
      'cognitive-function': 'from-purple-500/20 to-purple-600/20',
      'heart-health': 'from-red-500/20 to-pink-500/20',
      'joint-bone-health': 'from-gray-500/20 to-gray-600/20',
      'gut-health': 'from-lime-500/20 to-lime-600/20',
      'skin-hair-health': 'from-pink-500/20 to-rose-500/20',
      immunity: 'from-teal-500/20 to-cyan-500/20',
      'mens-health': 'from-sky-500/20 to-sky-600/20',
      'womens-health': 'from-fuchsia-500/20 to-fuchsia-600/20',
    }[category.slug] || 'from-gray-500/20 to-gray-600/20',
  }));

  const popularSearches = language === 'es'
    ? [
      { term: 'Vitamina D', category: 'Vitaminas' },
      { term: 'Omega-3', category: 'Ácidos Grasos' },
      { term: 'Magnesio', category: 'Minerales' },
      { term: 'Proteína Whey', category: 'Proteínas' },
      { term: 'Creatina', category: 'Rendimiento' },
      { term: 'Colágeno', category: 'Piel y Articulaciones' },
    ]
    : [
      { term: 'Vitamin D', category: 'Vitamins' },
      { term: 'Omega-3', category: 'Fatty Acids' },
      { term: 'Magnesium', category: 'Minerals' },
      { term: 'Whey Protein', category: 'Proteins' },
      { term: 'Creatine', category: 'Performance' },
      { term: 'Collagen', category: 'Skin & Joints' },
    ];

  const valueProps = [
    {
      icon: Search,
      title: t('portal.value.realtime'),
      description: t('portal.value.realtime.desc'),
    },
    {
      icon: BookOpen,
      title: t('portal.value.evidence'),
      description: t('portal.value.evidence.desc'),
    },
    {
      icon: Globe,
      title: t('portal.value.latam'),
      description: t('portal.value.latam.desc'),
    },
  ];

  const handleSearch = (query: string) => {
    console.log('[handleSearch] 🔍 Called with query:', query);

    if (!query?.trim()) {
      console.log('[handleSearch] ❌ Empty query, returning');
      return;
    }

    console.log('[handleSearch] ✅ Query is not empty, proceeding with validation');

    // VALIDACIÓN DE GUARDRAILS
    const validation = validateSupplementQuery(query.trim());
    console.log('[handleSearch] 📋 Validation result:', {
      valid: validation.valid,
      error: validation.error,
      severity: validation.severity,
    });

    if (!validation.valid) {
      console.log('[handleSearch] ❌ Validation failed, showing error');
      setValidationError(validation.error || 'Búsqueda inválida');
      return;
    }

    console.log('[handleSearch] ✅ Validation passed');

    // Normalizar query (español → inglés, typos, etc.)
    const normalized = normalizeQuery(query.trim());
    const searchTerm = normalized.confidence >= 0.7 ? normalized.normalized : query.trim();

    console.log('[handleSearch] 🔄 Normalized query:', {
      original: query.trim(),
      normalized: normalized.normalized,
      confidence: normalized.confidence,
      finalSearchTerm: searchTerm,
    });

    // Limpiar error previo y proceder
    setValidationError(null);
    setIsLoading(true);

    const targetUrl = `/portal/results?q=${encodeURIComponent(searchTerm)}&supplement=${encodeURIComponent(searchTerm)}`;
    console.log('[handleSearch] 🚀 Navigating to:', targetUrl);

    router.push(targetUrl);
  };

  const handleCategoryClick = (categoryId: string) => {
    router.push(`/portal/category/${encodeURIComponent(categoryId)}`);
  };

  const handlePopularSearch = (term: string) => {
    setSearchQuery(term);
    router.push(`/portal/results?q=${encodeURIComponent(term)}&supplement=${encodeURIComponent(term)}`);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Hero Section */}
      <div className="relative min-h-[80vh] w-full flex items-center justify-center overflow-x-hidden bg-white dark:bg-gray-950">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 dark:from-primary/10 dark:via-transparent dark:to-accent/10 blur-3xl" />

        {/* Floating Shapes */}
        <motion.div
          initial={{ opacity: 0, y: -150, rotate: -15 }}
          animate={{ opacity: 1, y: 0, rotate: 12 }}
          transition={{ duration: 2.4, ease: [0.23, 0.86, 0.39, 0.96] }}
          className="absolute left-[-5%] top-[20%] w-[500px] h-[120px]"
        >
          <motion.div
            animate={{ y: [0, 15, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            className="w-full h-full rounded-full bg-gradient-to-r from-primary/15 to-transparent backdrop-blur-[2px] border-2 border-primary/20"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -150, rotate: 15 }}
          animate={{ opacity: 1, y: 0, rotate: -15 }}
          transition={{ duration: 2.4, delay: 0.5, ease: [0.23, 0.86, 0.39, 0.96] }}
          className="absolute right-[0%] top-[75%] w-[400px] h-[100px]"
        >
          <motion.div
            animate={{ y: [0, 15, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            className="w-full h-full rounded-full bg-gradient-to-r from-accent/15 to-transparent backdrop-blur-[2px] border-2 border-accent/20"
          />
        </motion.div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
            >
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-b from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300">
                  {t('portal.title')}
                </span>
                <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 dark:from-blue-400 dark:via-purple-400 dark:to-blue-400">
                  {language === 'es' ? 'Basada en Ciencia' : 'Based on Science'}
                </span>
              </h1>
            </motion.div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.7 }}
              className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
            >
              {t('portal.subtitle')}
            </motion.p>

            {/* Search Bar with Autocomplete - Combobox con Enter funcional */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.9 }}
              className="relative max-w-2xl mx-auto"
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  console.log('[PortalPage] 📝 Form submit triggered');
                  console.log('[PortalPage] 📝 searchQuery value:', searchQuery);
                  console.log('[PortalPage] 📝 searchQuery trimmed:', searchQuery.trim());
                  console.log('[PortalPage] 📝 searchQuery length:', searchQuery.trim().length);

                  if (searchQuery.trim()) {
                    console.log('[PortalPage] ✅ searchQuery is valid, calling handleSearch');
                    handleSearch(searchQuery);
                  } else {
                    console.log('[PortalPage] ❌ searchQuery is empty after trim');
                  }
                }}
              >
                <Combobox
                  value={searchQuery}
                  onChange={(value) => {
                    // Solo se llama cuando se selecciona una sugerencia
                    console.log('[PortalPage] 🎯 Combobox onChange (suggestion selected)');
                    console.log('[PortalPage] 🎯 Selected value:', value);
                    if (value) {
                      console.log('[PortalPage] ✅ Value is truthy, calling handleSearch');
                      handleSearch(value);
                    } else {
                      console.log('[PortalPage] ❌ Value is falsy, not calling handleSearch');
                    }
                  }}
                >
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 dark:text-gray-400 z-10 pointer-events-none" />

                    <Combobox.Input
                      className="h-14 w-full pl-12 pr-24 text-base bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-lg"
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                      }}
                      displayValue={() => searchQuery}
                      placeholder=""
                      autoComplete="off"
                    />

                    {/* Animated Placeholder */}
                    <div className="absolute inset-0 flex items-center pl-12 pointer-events-none">
                      <AnimatePresence mode="wait">
                        {!searchQuery && (
                          <motion.p
                            key={currentPlaceholder}
                            initial={{ y: 5, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -15, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'linear' }}
                            className="text-gray-500 dark:text-gray-400 text-base truncate"
                          >
                            {placeholders[currentPlaceholder]}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Search Button or Loading Spinner */}
                    {isLoading || isLoadingSuggestions ? (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <button
                        type="submit"
                        disabled={!searchQuery.trim()}
                        className={cn(
                          "absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 z-20",
                          searchQuery.trim()
                            ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transform hover:scale-105"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                        )}
                      >
                        {language === 'es' ? 'Ir' : 'Go'}
                      </button>
                    )}
                  </div>

                  {/* Autocomplete Dropdown con Combobox.Options */}
                  {searchQuery.length >= 2 && (
                    <Transition
                      as={Fragment}
                      show={searchQuery.length >= 2}
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                    >
                      <Combobox.Options
                        static
                        className="absolute z-[9999] mt-2 w-full bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-gray-100 dark:border-gray-700 max-h-[400px] overflow-y-auto py-2"
                      >
                        {isLoadingSuggestions ? (
                          <div className="px-4 py-3 flex items-center gap-3 text-gray-500">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                            <span className="text-sm">{t('autocomplete.loading')}</span>
                          </div>
                        ) : suggestions.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500">
                            {t('autocomplete.no.results')}
                          </div>
                        ) : (
                          suggestions.map((suggestion, idx) => (
                            <Combobox.Option
                              key={`${suggestion.text}-${idx}`}
                              value={suggestion.text}
                              className={({ active }) =>
                                cn(
                                  'relative cursor-pointer select-none py-3 px-4 transition-colors',
                                  active ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'
                                )
                              }
                            >
                              {({ active }) => (
                                <div className="flex items-center gap-3">
                                  {/* Icon based on type */}
                                  {suggestion.type === 'category' ? (
                                    <TrendingUp className={cn('h-4 w-4 flex-shrink-0', active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400')} />
                                  ) : (
                                    <Search className={cn('h-4 w-4 flex-shrink-0', active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400')} />
                                  )}

                                  {/* Suggestion text */}
                                  <span className={cn('text-sm font-medium flex-1 min-w-0', active ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100')}>
                                    {suggestion.text}
                                  </span>

                                  {/* Type label */}
                                  {suggestion.type !== 'supplement' && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                                      {suggestion.type === 'category' ? t('autocomplete.categories') : 'Condition'}
                                    </span>
                                  )}
                                </div>
                              )}
                            </Combobox.Option>
                          ))
                        )}
                      </Combobox.Options>
                    </Transition>
                  )}
                </Combobox>
              </form>

              {/* Validation Error Message */}
              <AnimatePresence>
                {validationError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                  >
                    <div className="flex items-start gap-2">
                      <svg className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">{validationError}</p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          Intenta buscar: ashwagandha, omega-3, vitamin-d, magnesium, sleep, cognitive
                        </p>
                      </div>
                      <button
                        onClick={() => setValidationError(null)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 p-1"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Popular Searches */}
      <div className="container mx-auto px-4 md:px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="text-xl font-semibold mb-4 text-center text-gray-900 dark:text-gray-100">
            {t('portal.popular.searches')}
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {popularSearches.map((search, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => handlePopularSearch(search.term)}
                className="group px-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{search.term}</span>
                  <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300">
                    {search.category}
                  </Badge>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Health Categories Grid */}
      <div className="container mx-auto px-4 md:px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            {t('portal.browse.categories')}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            {language === 'es'
              ? 'Encuentra información específica para tus necesidades de salud'
              : 'Find specific information for your health needs'}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <motion.div
                key={category.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card
                  className="group h-full hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-gray-800"
                  onClick={() => handleCategoryClick(category.slug)}
                >
                  <CardHeader>
                    <div className={cn('w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center mb-4', category.color)}>
                      <Icon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                    </div>
                    <CardTitle className="text-xl text-gray-900 dark:text-gray-100">{category.name}</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-300">{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                      <span className="text-sm font-medium">
                        {t('portal.browse.view_more' as any, { defaultMessage: language === 'es' ? 'Ver más' : 'Learn more' })}
                      </span>
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Value Propositions */}
      <div className="container mx-auto px-4 md:px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              {language === 'es' ? '¿Por Qué Confiar en Nosotros?' : 'Why Trust Us?'}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {valueProps.map((prop, index) => {
              const Icon = prop.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  className="text-center"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">{prop.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{prop.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="container mx-auto px-4 md:px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <FAQSection />
        </motion.div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 md:px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-12 border border-primary/20"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            {language === 'es'
              ? 'Comienza tu Viaje hacia una Mejor Salud'
              : 'Start Your Journey to Better Health'}
          </h2>
          <p className="text-lg text-gray-700 dark:text-gray-200 mb-8">
            {language === 'es'
              ? 'Únete a miles de personas que ya confían en nuestra información'
              : 'Join thousands of people who already trust our information'}
          </p>
          <Button size="lg" className="text-base px-8" onClick={() => router.push('/portal')}>
            {language === 'es' ? 'Explorar Ahora' : 'Explore Now'}
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
