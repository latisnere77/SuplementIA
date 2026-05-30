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
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('portal.insufficientData');
  const errorT = useTranslations('portal.errorState');
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
  const researchTerms = Array.from(new Set([
    searchedFor,
    neutralComponentQuery,
    neutralTopicQuery,
    `${searchedFor} PubMed`,
  ])).filter(Boolean);
  const popularEvidenceSupplements = ['Magnesium', 'Creatine', 'Vitamin D', 'Psyllium'];
  const isTimeout = typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('timeout');

  // Render based on error type
  if (errorType === 'insufficient_scientific_data') {
    const cardClassName = hasLiteratureProfile
      ? 'max-w-4xl w-full overflow-hidden border-slate-200 bg-white'
      : 'max-w-3xl w-full overflow-hidden border-yellow-200 bg-yellow-50';
    const sectionClassName = hasLiteratureProfile
      ? 'rounded-xl border border-slate-200 bg-slate-50 p-5'
      : 'rounded-xl border-2 border-yellow-200 bg-white p-5';
    const headingClassName = hasLiteratureProfile ? 'text-slate-950' : 'text-yellow-950';
    const bodyClassName = hasLiteratureProfile ? 'text-slate-700' : 'text-yellow-900';
    const accentClassName = hasLiteratureProfile ? 'text-blue-700' : 'text-yellow-600';

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" data-testid="error-state">
        <Card className={cardClassName}>
          <CardContent className="pt-8 pb-8">
            <div className="space-y-6">
              {/* Scientific Data Not Found Icon */}
              <div className="text-center">
                <div className="relative inline-block">
                  <Microscope className={`w-20 h-20 mx-auto mb-4 ${accentClassName}`} />
                  <div className={`absolute -top-1 -right-1 rounded-full p-1 ${hasLiteratureProfile ? 'bg-blue-600' : 'bg-yellow-500'}`}>
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className={`text-xl sm:text-2xl font-bold ${headingClassName} mb-3`}>
                  {hasLiteratureProfile ? t('researchTitle') : t('title')}
                </h3>
                <p className={`text-base ${bodyClassName} max-w-2xl mx-auto leading-relaxed`}>
                  {isTimeout
                    ? t('timeoutMessage', { query: searchedFor })
                    : hasLiteratureProfile
                      ? t('literatureMessage', { query: searchedFor })
                      : t('defaultMessage', { query: searchedFor })}
                </p>
              </div>

              {hasLiteratureProfile && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-600">{t('pubmedResults')}</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950">{totalCount}</p>
                    <p className="mt-1 text-xs text-slate-600">{t('pubmedResultsDesc')}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-600">{t('reviewedSample')}</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950">{sampledCount}</p>
                    <p className="mt-1 text-xs text-slate-600">{t('reviewedSampleDesc')}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-600">{t('conclusion')}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{t('doNotConclude')}</p>
                    <p className="mt-1 text-xs text-slate-600">{t('thresholdDesc')}</p>
                  </div>
                </div>
              )}

              {hasLiteratureProfile && (
                <div className={sectionClassName}>
                  <h4 className="font-semibold text-slate-950 mb-4 flex items-center gap-2">
                    <FlaskConical className="w-5 h-5" />
                    {t('literatureTypes')}
                  </h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {LITERATURE_CATEGORY_ORDER.map((category) => {
                      const count = literatureCategories?.[category as keyof typeof literatureCategories] || 0;
                      return (
                        <div
                          key={category}
                          className="rounded-lg border border-slate-200 bg-white p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">
                                {t(`categoryLabels.${category}`)}
                              </p>
                              <p className="mt-1 text-xs text-slate-600">
                                {t(`categoryDescriptions.${category}`)}
                              </p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-800">
                              {count}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-xs text-slate-600">
                    {t('nonClinicalWarning')}
                  </p>
                </div>
              )}

              {hasLiteratureProfile && (
                <div className={sectionClassName}>
                  <h4 className="font-semibold text-slate-950 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {t('cannotConcludeTitle')}
                  </h4>
                  <p className="text-sm text-slate-700">
                    {t('cannotConcludeBody', { query: searchedFor })}
                  </p>
                </div>
              )}

              {literatureArticles.length > 0 && (
                <div className={sectionClassName}>
                  <h4 className="font-semibold text-slate-950 mb-3 flex items-center gap-2">
                    <Microscope className="w-5 h-5" />
                    {t('representativeArticles')}
                  </h4>
                  <p className="text-sm text-slate-700 mb-4">
                    {t('representativeArticlesDesc', { query: searchedFor })}
                  </p>
                  <div className="space-y-3">
                    {literatureArticles.map((article) => (
                      <a
                        key={article.pmid}
                        href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:bg-slate-100"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium">
                                {t(`categoryLabels.${article.category || 'other'}`)}
                              </span>
                              {article.year && <span>{article.year}</span>}
                              <span>PMID {article.pmid}</span>
                            </div>
                            <p className="text-sm font-medium leading-snug text-slate-950 break-words [overflow-wrap:anywhere]">
                              {article.title}
                            </p>
                          </div>
                          <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-slate-500" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {hasLiteratureProfile && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                  <h4 className="font-semibold text-blue-950 mb-3 flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    {t('usefulTermsTitle')}
                  </h4>
                  <p className="text-sm text-blue-800 mb-3">
                    {t('usefulTermsDesc')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {researchTerms.map((term) => (
                      <button
                        key={term}
                        onClick={() => window.location.href = `/portal/results?q=${encodeURIComponent(term)}&supplement=${encodeURIComponent(term)}`}
                        className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-900 hover:bg-blue-100"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Why This Matters */}
              <div className={sectionClassName}>
                <h4 className={`font-semibold ${hasLiteratureProfile ? 'text-slate-950' : 'text-yellow-900'} mb-3 flex items-center gap-2`}>
                  <TrendingUp className="w-5 h-5" />
                  {isTimeout ? t('timeoutWhyTitle') : hasLiteratureProfile ? t('prudentConclusionTitle') : t('whyTitle')}
                </h4>
                <p className={`text-sm ${hasLiteratureProfile ? 'text-slate-700' : 'text-yellow-800'} mb-3`}>
                  {isTimeout ? (
                    t('whyTimeout', { query: searchedFor })
                  ) : hasLiteratureProfile ? (
                    t('prudentConclusionBody', { query: searchedFor })
                  ) : (
                    t('whyBody')
                  )}
                </p>
                <div className={`rounded-lg p-3 ${hasLiteratureProfile ? 'border border-slate-200 bg-white' : 'border border-yellow-200 bg-yellow-50'}`}>
                  <p className={`text-xs ${hasLiteratureProfile ? 'text-slate-700' : 'text-yellow-700'} font-medium mb-2`}>
                    {isTimeout ? t('timeoutRecommendations') : t('reasonsTitle')}
                  </p>
                  <ul className={`text-xs ${hasLiteratureProfile ? 'text-slate-600' : 'text-yellow-700'} space-y-1`}>
                    {isTimeout ? (
                      <>
                        <li>• {t('timeoutTipSpecific')}</li>
                        <li>• {t('timeoutTipNames')}</li>
                        <li>• {t('timeoutTipFunction')}</li>
                        <li>• {t('timeoutTipQueued')}</li>
                      </>
                    ) : (
                      <>
                        <li>• {t('reasonPublishedNoTrials')}</li>
                        <li>• {t('reasonNonHuman')}</li>
                        <li>• {t('reasonMechanisms')}</li>
                        <li>• {t('reasonSpecificTerm')}</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>

              {/* Intelligent Suggestions */}
              {suggestions.length > 0 && (
                <div className="bg-white rounded-xl p-5 border-2 border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-3 text-center">
                    {t('similarTitle')}
                  </h4>
                  <p className="text-sm text-blue-700 mb-4 text-center">
                    {t('similarDesc')}
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
                                {t('withStudies')}
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
                  {t('nextSearchesTitle')}
                </h4>
                <p className="text-sm text-blue-800 mb-4">
                  {t('nextSearchesDesc')}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button
                    onClick={() => window.location.href = '/portal'}
                    variant="outline"
                    className="h-auto min-w-0 justify-start whitespace-normal border-blue-200 bg-blue-50 px-4 py-3 text-left text-blue-950 hover:bg-blue-100"
                  >
                    <Search className="mr-3 h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-semibold">{t('tryAnotherName')}</span>
                      <span className="block break-words text-xs font-normal text-blue-800 [overflow-wrap:anywhere]">{t('tryAnotherNameDesc')}</span>
                    </span>
                  </Button>
                  <Button
                    onClick={() => window.location.href = `/portal/results?q=${encodeURIComponent(neutralComponentQuery)}&supplement=${encodeURIComponent(neutralComponentQuery)}`}
                    variant="outline"
                    className="h-auto min-w-0 justify-start whitespace-normal border-blue-200 bg-blue-50 px-4 py-3 text-left text-blue-950 hover:bg-blue-100"
                  >
                    <FlaskConical className="mr-3 h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-semibold">{t('searchComponents')}</span>
                      <span className="block break-words text-xs font-normal text-blue-800 [overflow-wrap:anywhere]">{neutralComponentQuery}</span>
                    </span>
                  </Button>
                  <Button
                    onClick={() => window.location.href = `/portal/results?q=${encodeURIComponent(neutralTopicQuery)}&supplement=${encodeURIComponent(neutralTopicQuery)}`}
                    variant="outline"
                    className="h-auto min-w-0 justify-start whitespace-normal border-blue-200 bg-blue-50 px-4 py-3 text-left text-blue-950 hover:bg-blue-100"
                  >
                    <Microscope className="mr-3 h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-semibold">{t('exploreSpecificTopic')}</span>
                      <span className="block break-words text-xs font-normal text-blue-800 [overflow-wrap:anywhere]">{neutralTopicQuery}</span>
                    </span>
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/portal'}
                    variant="outline"
                    className="h-auto min-w-0 justify-start whitespace-normal border-blue-200 bg-blue-50 px-4 py-3 text-left text-blue-950 hover:bg-blue-100"
                  >
                    <TrendingUp className="mr-3 h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-semibold">{t('popularEvidence')}</span>
                      <span className="block break-words text-xs font-normal text-blue-800 [overflow-wrap:anywhere]">{t('popularEvidenceDesc')}</span>
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
                  {t('searchAnother')}
                </Button>
                <Button 
                  onClick={onRetry} 
                  variant="outline"
                  size="lg"
                  className="border-yellow-300 hover:bg-yellow-100"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  {t('retry')}
                </Button>
              </div>

              {/* Search Tips */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <p className="font-medium text-blue-900 mb-2 text-sm">
                  {t('tipsTitle')}
                </p>
                <ul className="text-xs text-blue-800 space-y-1.5">
                  <li>• {t('tipSpelling')}</li>
                  <li>• {t('tipName')}</li>
                  <li>• {t('tipComponents', { query: searchedFor })}</li>
                  <li>• {t('tipCondition')}</li>
                  <li>• {t('tipEnglish')}</li>
                  <li>• {t('tipBrands')}</li>
                  <li>• {t('tipPopular')}</li>
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
                {errorType === 'network_error' ? errorT('networkTitle') : errorT('systemTitle')}
              </h3>
              <p className="text-sm text-red-700 whitespace-pre-line">
                {typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage)}
              </p>
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-red-900 text-center">
                  {errorT('maybeSearched')}
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
                {errorT('retry')}
              </Button>
              <Button 
                onClick={() => window.location.href = '/portal'} 
                variant="outline"
                className="border-red-300 hover:bg-red-100"
              >
                <Search className="w-4 h-4 mr-2" />
                {errorT('newSearch')}
              </Button>
            </div>

            {/* Help Text */}
            <div className="text-center text-xs text-red-600 bg-white rounded-lg p-3 border border-red-200">
              <p className="font-medium mb-1">{errorT('tipsTitle')}</p>
              <ul className="text-left space-y-1 max-w-md mx-auto">
                <li>• {errorT('tipSpelling')}</li>
                <li>• {errorT('tipScientific')}</li>
                <li>• {errorT('tipEnglish')}</li>
                <li>• {errorT('tipBrands')}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
