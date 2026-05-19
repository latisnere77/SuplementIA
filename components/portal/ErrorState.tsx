/**
 * Enhanced Error State Component
 * Provides clear error messages with actionable suggestions
 * 
 * Handles different error types:
 * - insufficient_scientific_data: No sufficient human clinical evidence found (NOT a system error)
 * - system_error: Backend/API errors
 * - network_error: Connection issues
 */

'use client';

import { AlertCircle, BookOpen, ExternalLink, FlaskConical, RefreshCw, Search, Microscope, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export type ErrorType = 'insufficient_scientific_data' | 'system_error' | 'network_error' | 'generic';

interface ErrorMetadata {
  normalizedQuery?: string;
  requestId?: string;
  timestamp?: string;
  literatureProfile?: {
    totalCount?: number;
    sampledCount?: number;
    categories?: {
      human_clinical?: number;
      review?: number;
      preclinical?: number;
      phytochemical?: number;
      other?: number;
    };
    articles?: Array<{
      pmid: string;
      title: string;
      year?: number;
      category?: string;
      publicationTypes?: string[];
    }>;
  } | null;
  [key: string]: unknown;
}

const LITERATURE_CATEGORY_LABELS: Record<string, string> = {
  human_clinical: 'Clínico humano',
  review: 'Revisión',
  preclinical: 'Preclínico',
  phytochemical: 'Fitoquímico',
  other: 'Otro',
};

const LITERATURE_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  human_clinical: 'Estudios en personas',
  preclinical: 'Animales, células o laboratorio',
  phytochemical: 'Composición o caracterización química',
  review: 'Revisiones o contexto bibliográfico',
  other: 'Botánica, agricultura u otros temas',
};

const LITERATURE_CATEGORY_ORDER = ['human_clinical', 'preclinical', 'phytochemical', 'review', 'other'];

function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function selectRepresentativeArticles(
  articles: NonNullable<NonNullable<ErrorMetadata['literatureProfile']>['articles']>,
  limit = 6
) {
  const selected: typeof articles = [];
  const seen = new Set<string>();

  for (const category of LITERATURE_CATEGORY_ORDER) {
    const article = articles.find((candidate) => candidate.category === category && !seen.has(candidate.pmid));
    if (article) {
      selected.push(article);
      seen.add(article.pmid);
    }
  }

  for (const article of articles) {
    if (selected.length >= limit) break;
    if (!seen.has(article.pmid)) {
      selected.push(article);
      seen.add(article.pmid);
    }
  }

  return selected.slice(0, limit);
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
  const literatureProfile = errorData.metadata?.literatureProfile;
  const hasLiteratureProfile = !!literatureProfile && (literatureProfile.totalCount || 0) > 0;
  const literatureCategories = literatureProfile?.categories;
  const literatureArticles = literatureProfile?.articles ? selectRepresentativeArticles(literatureProfile.articles) : [];
  const sampledCount = literatureProfile?.sampledCount || literatureArticles.length || 0;
  const totalCount = literatureProfile?.totalCount || 0;
  const neutralComponentQuery = `${searchedFor} chemical composition`;
  const neutralTopicQuery = `${searchedFor} safety`;
  const popularEvidenceSupplements = ['Magnesium', 'Creatine', 'Vitamin D', 'Psyllium'];

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
                <h3 className="text-xl sm:text-2xl font-bold text-yellow-950 mb-3">
                  Sin Evidencia Clínica Humana Suficiente
                </h3>
                <p className="text-base text-yellow-900 max-w-2xl mx-auto leading-relaxed">
                  {errorMessage && typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('timeout')
                    ? `La búsqueda de "${searchedFor}" está tardando más de lo esperado. Esto puede ocurrir con términos muy amplios que tienen miles de estudios en PubMed.`
                    : hasLiteratureProfile
                      ? `PubMed sí contiene literatura relacionada con "${searchedFor}", pero la muestra revisada no tiene evidencia clínica humana suficiente para recomendar beneficios.`
                      : `No encontramos evidencia clínica humana suficiente para recomendar beneficios de "${searchedFor}".`}
                </p>
              </div>

              {hasLiteratureProfile && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-yellow-200 bg-white p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-yellow-700">Resultados PubMed</p>
                    <p className="mt-1 text-2xl font-semibold text-yellow-950">{totalCount}</p>
                    <p className="mt-1 text-xs text-yellow-800">Literatura relacionada con la consulta, no beneficios confirmados.</p>
                  </div>
                  <div className="rounded-lg border border-yellow-200 bg-white p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-yellow-700">Muestra Revisada</p>
                    <p className="mt-1 text-2xl font-semibold text-yellow-950">{sampledCount}</p>
                    <p className="mt-1 text-xs text-yellow-800">Artículos clasificados para orientar este estado.</p>
                  </div>
                  <div className="rounded-lg border border-yellow-200 bg-white p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-yellow-700">Conclusión</p>
                    <p className="mt-2 text-sm font-semibold text-yellow-950">No recomendar beneficios</p>
                    <p className="mt-1 text-xs text-yellow-800">La evidencia no alcanza el umbral clínico humano.</p>
                  </div>
                </div>
              )}

              {hasLiteratureProfile && (
                <div className="bg-white rounded-xl p-5 border-2 border-yellow-200">
                  <h4 className="font-semibold text-yellow-950 mb-4 flex items-center gap-2">
                    <FlaskConical className="w-5 h-5" />
                    Qué tipo de literatura apareció en la muestra
                  </h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {LITERATURE_CATEGORY_ORDER.map((category) => {
                      const count = literatureCategories?.[category as keyof typeof literatureCategories] || 0;
                      return (
                        <div
                          key={category}
                          className="rounded-lg border border-yellow-200 bg-yellow-50 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-yellow-950">
                                {LITERATURE_CATEGORY_LABELS[category]}
                              </p>
                              <p className="mt-1 text-xs text-yellow-800">
                                {LITERATURE_CATEGORY_DESCRIPTIONS[category]}
                              </p>
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-yellow-900">
                              {count}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-xs text-yellow-800">
                    Preclínico, fitoquímico, botánico o agrícola no equivale a un efecto comprobado en personas.
                  </p>
                </div>
              )}

              {literatureArticles.length > 0 && (
                <div className="bg-white rounded-xl p-5 border-2 border-yellow-200">
                  <h4 className="font-semibold text-yellow-950 mb-3 flex items-center gap-2">
                    <Microscope className="w-5 h-5" />
                    Artículos representativos de la muestra
                  </h4>
                  <p className="text-sm text-yellow-800 mb-4">
                    Esta lista no es una recomendación. Solo muestra ejemplos de la literatura revisada sobre <strong>&ldquo;{searchedFor}&rdquo;</strong> y por qué no la tratamos como evidencia clínica humana suficiente.
                  </p>
                  <div className="space-y-3">
                    {literatureArticles.map((article) => (
                      <a
                        key={article.pmid}
                        href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-lg border border-yellow-200 bg-yellow-50 p-3 transition-colors hover:bg-yellow-100"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-yellow-700">
                              <span className="rounded-full bg-white px-2 py-0.5 font-medium">
                                {LITERATURE_CATEGORY_LABELS[article.category || 'other'] || 'Otro'}
                              </span>
                              {article.year && <span>{article.year}</span>}
                              <span>PMID {article.pmid}</span>
                            </div>
                            <p className="text-sm font-medium leading-snug text-yellow-950">
                              {article.title}
                            </p>
                          </div>
                          <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-yellow-700" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

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
                      En Suplementia, <strong>solo promovemos beneficios confirmados cuando hay evidencia clínica humana suficiente</strong>.
                      Puede haber estudios preclínicos, en animales, in vitro, fitoquímicos o revisiones botánicas, pero no los tratamos como efectos comprobados en personas.
                    </>
                  )}
                </p>
                <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                  <p className="text-xs text-yellow-700 font-medium mb-2">
                    {errorMessage && typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('timeout')
                      ? 'Recomendaciones para mejorar tu búsqueda:'
                      : 'Por qué puede aparecer este estado:'}
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
                        <li>• Puede haber estudios publicados, pero no ensayos clínicos humanos suficientes</li>
                        <li>• La evidencia disponible puede ser preclínica, animal, in vitro o fitoquímica</li>
                        <li>• Los resultados pueden estudiar mecanismos, seguridad, cultivo o composición</li>
                        <li>• El término puede necesitar una forma, extracto, dosis o tema de búsqueda más específico</li>
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

              <div className="bg-white rounded-xl p-5 border-2 border-blue-200">
                <h4 className="font-semibold text-blue-950 mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Siguientes búsquedas exploratorias
                </h4>
                <p className="text-sm text-blue-800 mb-4">
                  Estas acciones sirven para refinar la búsqueda. No implican que el suplemento tenga un efecto clínico confirmado.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button
                    onClick={() => window.location.href = '/portal'}
                    variant="outline"
                    className="h-auto justify-start border-blue-200 bg-blue-50 px-4 py-3 text-left text-blue-950 hover:bg-blue-100"
                  >
                    <Search className="mr-3 h-4 w-4 shrink-0" />
                    <span>
                      <span className="block font-semibold">Probar otro nombre</span>
                      <span className="block text-xs font-normal text-blue-800">Nombre común, científico o forma específica</span>
                    </span>
                  </Button>
                  <Button
                    onClick={() => window.location.href = `/portal/results?q=${encodeURIComponent(neutralComponentQuery)}&supplement=${encodeURIComponent(neutralComponentQuery)}`}
                    variant="outline"
                    className="h-auto justify-start border-blue-200 bg-blue-50 px-4 py-3 text-left text-blue-950 hover:bg-blue-100"
                  >
                    <FlaskConical className="mr-3 h-4 w-4 shrink-0" />
                    <span>
                      <span className="block font-semibold">Buscar componentes</span>
                      <span className="block text-xs font-normal text-blue-800">{neutralComponentQuery}</span>
                    </span>
                  </Button>
                  <Button
                    onClick={() => window.location.href = `/portal/results?q=${encodeURIComponent(neutralTopicQuery)}&supplement=${encodeURIComponent(neutralTopicQuery)}`}
                    variant="outline"
                    className="h-auto justify-start border-blue-200 bg-blue-50 px-4 py-3 text-left text-blue-950 hover:bg-blue-100"
                  >
                    <Microscope className="mr-3 h-4 w-4 shrink-0" />
                    <span>
                      <span className="block font-semibold">Explorar un tema específico</span>
                      <span className="block text-xs font-normal text-blue-800">{neutralTopicQuery}</span>
                    </span>
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/portal'}
                    variant="outline"
                    className="h-auto justify-start border-blue-200 bg-blue-50 px-4 py-3 text-left text-blue-950 hover:bg-blue-100"
                  >
                    <TrendingUp className="mr-3 h-4 w-4 shrink-0" />
                    <span>
                      <span className="block font-semibold">Volver a suplementos populares</span>
                      <span className="block text-xs font-normal text-blue-800">Ver ingredientes con mejor respaldo clínico</span>
                    </span>
                  </Button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {popularEvidenceSupplements.map((name) => (
                    <button
                      key={name}
                      onClick={() => window.location.href = `/portal/results?q=${encodeURIComponent(name)}&supplement=${encodeURIComponent(name)}`}
                      className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-50"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

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
                  <li>• <strong>Prueba otro nombre común o científico</strong> si lo conoces (ej: &ldquo;Withania somnifera&rdquo; en vez de &ldquo;ashwagandha&rdquo;)</li>
                  <li>• <strong>Busca componentes específicos</strong> (ej: &ldquo;{searchedFor} essential oil&rdquo; o &ldquo;{searchedFor} chemical composition&rdquo;)</li>
                  <li>• <strong>Explora suplemento + condición solo como búsqueda</strong>; no lo interpretes como recomendación</li>
                  <li>• <strong>Prueba con términos en inglés</strong> - la mayoría de estudios están en inglés</li>
                  <li>• <strong>Evita nombres comerciales</strong> - busca el ingrediente activo (ej: &ldquo;Creatine&rdquo; en vez de &ldquo;CreaPure&rdquo;)</li>
                  <li>• <strong>Compara con ingredientes populares</strong> cuando quieras ver ejemplos con respaldo clínico humano</li>
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
