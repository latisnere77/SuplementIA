/**
 * Enhanced Error State Component
 * Provides clear error messages with actionable suggestions
 * 
 * Handles different error types:
 * - insufficient_scientific_data: No studies found (NOT a system error)
 * - system_error: Backend/API errors
 * - network_error: Connection issues
 */

'use client';

import { AlertCircle, RefreshCw, Search, Microscope, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export type ErrorType = 'insufficient_scientific_data' | 'system_error' | 'network_error' | 'generic';

interface ErrorMetadata {
  normalizedQuery?: string;
  requestId?: string;
  timestamp?: string;
  [key: string]: unknown;
}

interface ErrorStateProps {
  error: string | {
    type: ErrorType;
    message: string;
    searchedFor?: string;
    suggestions?: Array<{
      name: string;
      confidence?: number;
      hasStudies?: boolean;
    }>;
    metadata?: ErrorMetadata;
  };
  supplementName: string;
  onRetry: () => void;
  suggestions?: string[];
}

export function ErrorState({ 
  error, 
  supplementName, 
  onRetry, 
  suggestions: legacySuggestions = [] 
}: ErrorStateProps) {
  // Parse error object or string
  const errorData = typeof error === 'string' 
    ? { type: 'generic' as ErrorType, message: error, suggestions: [] }
    : error;

  const errorType = errorData.type || 'generic';
  const errorMessage = errorData.message || error;
  const searchedFor = errorData.searchedFor || supplementName;
  const suggestions = errorData.suggestions || legacySuggestions.map(s => ({ name: s, hasStudies: true }));

  // Render based on error type
  if (errorType === 'insufficient_scientific_data') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" data-testid="error-state">
        <Card className="max-w-3xl w-full border-yellow-200 bg-yellow-50">
          <CardContent className="pt-8 pb-8">
            <div className="space-y-6">
              {/* Scientific Data Not Found Icon */}
              <div className="text-center">
                <div className="relative inline-block">
                  <Microscope className="w-20 h-20 mx-auto mb-4 text-yellow-600" />
                  <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-yellow-900 mb-3">
                  🔬 Sin Evidencia Científica Disponible
                </h3>
                <p className="text-base text-yellow-800 max-w-xl mx-auto leading-relaxed">
                  {errorMessage && typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('timeout')
                    ? `La búsqueda de "${searchedFor}" está tardando más de lo esperado. Esto puede ocurrir con términos muy amplios que tienen miles de estudios en PubMed.`
                    : `No encontramos estudios científicos publicados en PubMed sobre "${searchedFor}".`}
                </p>
              </div>

              {/* Why This Matters */}
              <div className="bg-white rounded-xl p-5 border-2 border-yellow-200">
                <h4 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  {errorMessage && typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('timeout')
                    ? '¿Por qué ocurre esto?'
                    : '¿Por qué es importante?'}
                </h4>
                <p className="text-sm text-yellow-800 mb-3">
                  {errorMessage && typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('timeout') ? (
                    <>
                      <strong>&ldquo;{searchedFor}&rdquo;</strong> puede ser un término demasiado genérico o amplio.
                      Los términos genéricos tienen miles de estudios en PubMed, lo que hace que la búsqueda tarde demasiado.
                    </>
                  ) : (
                    <>
                      En Suplementia, <strong>solo mostramos información respaldada por estudios científicos verificables</strong>.
                      Esto garantiza que las recomendaciones sean seguras y efectivas.
                    </>
                  )}
                </p>
                <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                  <p className="text-xs text-yellow-700 font-medium mb-2">
                    {errorMessage && typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('timeout')
                      ? 'Recomendaciones para mejorar tu búsqueda:'
                      : 'Posibles razones por las que no encontramos estudios:'}
                  </p>
                  <ul className="text-xs text-yellow-700 space-y-1">
                    {errorMessage && typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('timeout') ? (
                      <>
                        <li>• <strong>Busca un suplemento específico</strong> en lugar de categorías amplias (ej: busca &ldquo;Colágeno hidrolizado&rdquo; en vez de &ldquo;péptidos bioactivos&rdquo;)</li>
                        <li>• <strong>Usa nombres comerciales específicos</strong> de suplementos que conozcas</li>
                        <li>• <strong>Especifica el tipo o función</strong> (ej: &ldquo;péptidos de colágeno para articulaciones&rdquo;)</li>
                        <li>• El término ha sido agregado a nuestra cola de procesamiento para futura indexación</li>
                      </>
                    ) : (
                      <>
                        <li>• El suplemento no tiene investigación científica publicada</li>
                        <li>• El nombre puede estar escrito de forma diferente en la literatura científica</li>
                        <li>• Puede ser un nombre comercial sin respaldo científico independiente</li>
                        <li>• Los estudios pueden estar en bases de datos especializadas que aún no indexamos</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>

              {/* Intelligent Suggestions */}
              {suggestions.length > 0 && (
                <div className="bg-white rounded-xl p-5 border-2 border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-3 text-center">
                    💡 Suplementos similares con evidencia científica
                  </h4>
                  <p className="text-sm text-blue-700 mb-4 text-center">
                    Estos suplementos tienen estudios publicados y podrían ser lo que buscas:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {suggestions.slice(0, 6).map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          window.location.href = `/portal/results?q=${encodeURIComponent(suggestion.name)}`;
                        }}
                        className="group relative px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="font-medium text-base">{suggestion.name}</div>
                            {suggestion.hasStudies && (
                              <div className="text-xs text-blue-100 mt-1 flex items-center gap-1">
                                <Microscope className="w-3 h-3" />
                                Con estudios científicos
                              </div>
                            )}
                          </div>
                          <Search className="w-4 h-4 text-blue-200 group-hover:text-white transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button 
                  onClick={() => window.location.href = '/portal'} 
                  variant="default"
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Search className="w-5 h-5 mr-2" />
                  Buscar Otro Suplemento
                </Button>
                <Button 
                  onClick={onRetry} 
                  variant="outline"
                  size="lg"
                  className="border-yellow-300 hover:bg-yellow-100"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Intentar de Nuevo
                </Button>
              </div>

              {/* Search Tips */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <p className="font-medium text-blue-900 mb-2 text-sm">
                  💡 Consejos para mejorar tu búsqueda:
                </p>
                <ul className="text-xs text-blue-800 space-y-1.5">
                  <li>• <strong>Verifica la ortografía</strong> del nombre del suplemento</li>
                  <li>• <strong>Usa el nombre científico</strong> si lo conoces (ej: &ldquo;Withania somnifera&rdquo; en vez de &ldquo;ashwagandha&rdquo;)</li>
                  <li>• <strong>Prueba con términos en inglés</strong> - la mayoría de estudios están en inglés</li>
                  <li>• <strong>Evita nombres comerciales</strong> - busca el ingrediente activo (ej: &ldquo;Creatine&rdquo; en vez de &ldquo;CreaPure&rdquo;)</li>
                  <li>• <strong>Busca por categoría</strong> - ej: &ldquo;adaptógeno&rdquo;, &ldquo;nootrópico&rdquo;, &ldquo;antioxidante&rdquo;</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generic/System/Network errors - keep original red design
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" data-testid="error-state">
      <Card className="max-w-2xl w-full border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Error Icon & Message */}
            <div className="text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg sm:text-xl font-semibold text-red-900 mb-2">
                {errorType === 'network_error' ? 'Error de Conexión' : 'Error del Sistema'}
              </h3>
              <p className="text-sm text-red-700 whitespace-pre-line">
                {typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage)}
              </p>
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-red-900 text-center">
                  ¿Quizás buscabas alguno de estos?
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestions.map((suggestion, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.location.href = `/portal/results?q=${encodeURIComponent(suggestion.name)}`;
                      }}
                      className="bg-white hover:bg-red-100 border-red-300"
                    >
                      {suggestion.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={onRetry} 
                variant="default"
                className="bg-red-600 hover:bg-red-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Intentar de Nuevo
              </Button>
              <Button 
                onClick={() => window.location.href = '/portal'} 
                variant="outline"
                className="border-red-300 hover:bg-red-100"
              >
                <Search className="w-4 h-4 mr-2" />
                Nueva Búsqueda
              </Button>
            </div>

            {/* Help Text */}
            <div className="text-center text-xs text-red-600 bg-white rounded-lg p-3 border border-red-200">
              <p className="font-medium mb-1">💡 Consejos de búsqueda:</p>
              <ul className="text-left space-y-1 max-w-md mx-auto">
                <li>• Verifica la ortografía del suplemento</li>
                <li>• Intenta con el nombre científico (ej: &ldquo;Withania somnifera&rdquo; en vez de &ldquo;ashwagandha&rdquo;)</li>
                <li>• Usa términos en inglés si es posible</li>
                <li>• Evita nombres comerciales o marcas</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
