/**
 * Variant Selector Modal
 * Displays available supplement variants and lets user choose which one to view
 * Examples: Choose between Magnesium Glycinate, Citrate, etc.
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SupplementVariant, VariantDetectionResult } from '@/types/supplement-variants';

interface VariantSelectorModalProps {
  isOpen: boolean;
  supplementName: string;
  variantDetection: VariantDetectionResult;
  onSelectVariant: (variant: SupplementVariant | null) => void;
  onSelectGeneric: () => void;
  _isLoading?: boolean;
}

export default function VariantSelectorModal({
  isOpen,
  supplementName,
  variantDetection,
  onSelectVariant,
  onSelectGeneric
}: VariantSelectorModalProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleVariantClick = async (variant: SupplementVariant) => {
    setSelectedIndex(variantDetection.variants.indexOf(variant));
    setIsSearching(true);
    
    // Small delay for visual feedback
    setTimeout(() => {
      onSelectVariant(variant);
    }, 300);
  };

  const handleGenericClick = async () => {
    setIsSearching(true);
    setTimeout(() => {
      onSelectGeneric();
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 px-6 py-8 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                ¿Cuál forma de {supplementName} te interesa?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                Hemos encontrado múltiples formas estudiadas de este suplemento. Elige una específica o ver información general sobre todas.
              </p>
            </div>

            {/* Content */}
            <div className="p-6 md:p-8">
              {/* Variant Options */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🔬</span>
                  Formas específicas encontradas
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {variantDetection.variants.map((variant, index) => (
                    <motion.button
                      key={`${variant.name}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleVariantClick(variant)}
                      disabled={isSearching}
                      className={`relative overflow-hidden rounded-xl p-4 text-left transition-all duration-200 ${
                        selectedIndex === index
                          ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-gray-800'
                      } ${isSearching ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}
                    >
                      {/* Background animation on select */}
                      {selectedIndex === index && (
                        <motion.div
                          layoutId="variant-bg"
                          className="absolute inset-0 bg-blue-100 dark:bg-blue-900/20 -z-10"
                          transition={{ type: 'spring', bounce: 0.2 }}
                        />
                      )}

                      {/* Content */}
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white pr-2">
                            {variant.displayName}
                          </h4>
                          {selectedIndex === index && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="flex-shrink-0 text-blue-600 dark:text-blue-400"
                            >
                              ✓
                            </motion.div>
                          )}
                        </div>

                        {/* Description */}
                        {variant.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {variant.description}
                          </p>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-xs flex-wrap">
                          {variant.studyCount !== undefined && variant.studyCount > 0 && (
                            <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full text-gray-700 dark:text-gray-300">
                              📚 {variant.studyCount.toLocaleString()} estudios
                            </span>
                          )}
                          {variant.confidence !== undefined && variant.confidence > 0 && (
                            <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full text-amber-700 dark:text-amber-400">
                              ⭐ {Math.round(variant.confidence * 100)}% confianza
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-8">
                <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 px-2">O</span>
                <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
              </div>

              {/* Generic Option */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  Información general
                </h3>

                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (variantDetection.variants.length + 1) * 0.1 }}
                  onClick={handleGenericClick}
                  disabled={isSearching}
                  className="w-full rounded-xl p-5 text-left transition-all duration-200 border-2 border-dashed border-purple-300 dark:border-purple-600 hover:border-purple-500 dark:hover:border-purple-400 bg-purple-50 dark:bg-purple-900/20 hover:shadow-md cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed group"
                >
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                    Ver análisis general de {supplementName}
                  </h4>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    Obtén información sobre todas las formas y sus diferencias. Mejor para entender qué forma es más adecuada para ti.
                  </p>
                </motion.button>
              </div>

              {/* Loading indicator */}
              {isSearching && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-4"
                >
                  <div className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                    <span>Buscando información...</span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer Info */}
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
              💡 Los datos provienen de análisis de estudios científicos publicados. Cada forma tiene diferentes niveles de absorción y beneficios específicos.
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
