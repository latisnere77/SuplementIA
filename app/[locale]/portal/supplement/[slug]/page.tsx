/**
 * Dynamic Supplement Detail Page with Rich Evidence Display
 * 
 * This page fetches enriched evidence data using:
 * - studies-fetcher Lambda (real PubMed studies)
 * - content-enricher Lambda (Claude AI analysis)
 * - EvidenceAnalysisPanelNew (rich UI component)
 * 
 * NO NEW LAMBDAS - Reuses existing infrastructure.
 */
'use client';

import { useSearchParams, useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, LoaderCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import EvidenceAnalysisPanelNew from '@/components/portal/EvidenceAnalysisPanelNew';
import type { GradeType } from '@/types/supplement-grade';
import { trackGAEvent } from '@/lib/analytics/ga4';
import { getLocalizedSupplementName } from '@/lib/i18n/supplement-names';
import { useTranslations } from 'next-intl';
import { getCanonicalSupplementQuery } from '@/lib/knowledge-base';

// Evidence summary structure from enrichment API
interface EvidenceSummary {
  overallGrade: GradeType;
  whatIsItFor: string;
  summary?: string;
  worksFor: Array<{
    condition: string;
    grade: GradeType;
    description: string;
  }>;
  doesntWorkFor: Array<{
    condition: string;
    grade: GradeType;
    description: string;
  }>;
  limitedEvidence: Array<{
    condition: string;
    grade: GradeType;
    description: string;
  }>;
  ingredients: Array<{
    name: string;
    grade: GradeType;
    studyCount: number;
    rctCount: number;
    description?: string;
  }>;
  qualityBadges?: {
    hasRCTs: boolean;
    hasMetaAnalysis: boolean;
    longTermStudies: boolean;
    safetyEstablished: boolean;
  };
  // Metadata from enrichment
  metadata?: {
    fromCache?: boolean;
    studiesUsed?: number;
    searchTerm?: string;
  };
}

export default function SupplementDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const t = useTranslations();

  const slug = params.slug as string;
  const locale = params.locale as string;
  const language = locale === 'en' ? 'en' : 'es';
  const benefit = searchParams.get('benefit') || '';

  const [evidenceSummary, setEvidenceSummary] = useState<EvidenceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const trackedViewRef = useRef<string | null>(null);

  const fallbackSupplementName = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const canonicalSupplementName = getCanonicalSupplementQuery(slug, fallbackSupplementName);
  const supplementName = getLocalizedSupplementName(canonicalSupplementName, language);
  const fallbackBenefitName = benefit.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const benefitName = benefit
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? t(`portal.categories.${benefit}.name` as any, { defaultMessage: fallbackBenefitName })
    : '';
  const labels = useMemo(() => language === 'es'
    ? ({
      fallbackDescription: `${supplementName} es un suplemento con evidencia científica para diversos beneficios de salud.`,
      enrichmentIncomplete: 'No pudimos completar el enriquecimiento.',
      timeout: 'El análisis está tomando más tiempo del esperado. Intenta de nuevo en unos minutos.',
      fetchEvidenceError: 'Error al obtener evidencia',
      invalidFormat: 'Formato de datos inválido',
      unknownError: 'Error desconocido al obtener la evidencia.',
      backTo: 'Volver a',
      backToSearch: 'Volver a Búsqueda',
      evidenceFor: 'Evidencia Científica para',
      focusedOn: 'Enfocado en:',
      refreshTitle: 'Actualizar datos',
      refresh: 'Actualizar',
      analyzing: 'Analizando literatura científica...',
      analyzingHint: 'Esto puede tomar unos segundos',
      errorTitle: 'Error al Obtener Evidencia',
      retry: 'Reintentar',
    })
    : ({
      fallbackDescription: `${supplementName} is a supplement with scientific evidence for different health benefits.`,
      enrichmentIncomplete: 'We could not complete the enrichment.',
      timeout: 'The analysis is taking longer than expected. Try again in a few minutes.',
      fetchEvidenceError: 'Error fetching evidence',
      invalidFormat: 'Invalid data format',
      unknownError: 'Unknown error while fetching evidence.',
      backTo: 'Back to',
      backToSearch: 'Back to Search',
      evidenceFor: 'Scientific Evidence for',
      focusedOn: 'Focused on:',
      refreshTitle: 'Refresh data',
      refresh: 'Refresh',
      analyzing: 'Analyzing scientific literature...',
      analyzingHint: 'This may take a few seconds',
      errorTitle: 'Error Fetching Evidence',
      retry: 'Retry',
    }), [language, supplementName]);

  const formatEvidenceError = useCallback((data: any): string => {
    if (data?.error === 'insufficient_data') {
      return data.message || labels.enrichmentIncomplete;
    }

    if (data?.error === 'upstream_unavailable') {
      return data.message || labels.timeout;
    }

    return labels.enrichmentIncomplete;
  }, [labels.enrichmentIncomplete, labels.timeout]);

  // Transform enrichment API response to component format
  const transformEnrichmentResponse = useCallback((data: any): EvidenceSummary => {
    const evidence = data.evidence || data.data || {};

    // Map grade string to GradeType
    const mapGrade = (grade: string): GradeType => {
      const gradeMap: Record<string, GradeType> = {
        'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D', 'E': 'E', 'F': 'F',
        'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D', 'e': 'E', 'f': 'F',
      };
      return gradeMap[grade] || 'C';
    };

    // Extract worksFor from various possible field names
    const worksFor = evidence.worksFor || evidence.effectiveBenefits || evidence.benefits || [];
    const doesntWorkFor = evidence.doesntWorkFor || evidence.ineffectiveBenefits || [];
    const limitedEvidence = evidence.limitedEvidence || evidence.uncertainBenefits || [];

    return {
      overallGrade: mapGrade(evidence.overallGrade || evidence.grade || 'C'),
      whatIsItFor: evidence.whatIsItFor || evidence.description || evidence.summary ||
        labels.fallbackDescription,
      summary: evidence.summary || evidence.description,
      worksFor: (worksFor || []).map((item: any) => ({
        condition: item.condition || item.benefit || item.name,
        grade: mapGrade(item.grade || 'B'),
        description: item.description || item.explanation || '',
      })),
      doesntWorkFor: (doesntWorkFor || []).map((item: any) => ({
        condition: item.condition || item.benefit || item.name,
        grade: mapGrade(item.grade || 'D'),
        description: item.description || item.explanation || '',
      })),
      limitedEvidence: (limitedEvidence || []).map((item: any) => ({
        condition: item.condition || item.benefit || item.name,
        grade: mapGrade(item.grade || 'C'),
        description: item.description || item.explanation || '',
      })),
      ingredients: evidence.ingredients || [{
        name: supplementName,
        grade: mapGrade(evidence.overallGrade || 'C'),
        studyCount: evidence.studyCount || data.metadata?.studiesUsed || 0,
        rctCount: evidence.rctCount || 0,
        description: evidence.ingredientDescription,
      }],
      qualityBadges: {
        hasRCTs: evidence.qualityBadges?.hasRCTs ?? evidence.hasRCTs ?? true,
        hasMetaAnalysis: evidence.qualityBadges?.hasMetaAnalysis ?? evidence.hasMetaAnalysis ?? false,
        longTermStudies: evidence.qualityBadges?.longTermStudies ?? false,
        safetyEstablished: evidence.qualityBadges?.safetyEstablished ?? evidence.safetyEstablished ?? true,
      },
      metadata: {
        fromCache: data.metadata?.fromCache || data.metadata?.cacheHit,
        studiesUsed: data.metadata?.studiesUsed || evidence.studiesAnalyzed,
        searchTerm: data.metadata?.searchTerm,
      },
    };
  }, [labels.fallbackDescription, supplementName]);

  const pollEnrichmentStatus = useCallback(async (pollUrl: string): Promise<any> => {
    const maxPolls = 140;
    const pollIntervalMs = 3000;

    for (let pollCount = 0; pollCount < maxPolls; pollCount++) {
      await new Promise(resolve => setTimeout(resolve, pollCount === 0 ? 2000 : pollIntervalMs));

      const statusResponse = await fetch(pollUrl);
      const statusData = await statusResponse.json();

      if (statusResponse.status === 200 && statusData.status === 'completed' && statusData.recommendation) {
        return statusData.recommendation;
      }

      if (statusResponse.status !== 202 || statusData.status !== 'processing') {
        throw new Error(statusData.message || statusData.error || labels.enrichmentIncomplete);
      }
    }

    throw new Error(labels.timeout);
  }, [labels.enrichmentIncomplete, labels.timeout]);

  const fetchEnrichedEvidence = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    try {
      // Call the simplified enrichment API that bypasses TDZ errors
      const response = await fetch('/api/portal/enrich-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supplementName: slug,
          category: benefit,
          forceRefresh,
        }),
      });

      const data = await response.json();
      let enrichmentData = data;

      if (response.status === 202 && data.status === 'processing' && data.pollUrl) {
        enrichmentData = await pollEnrichmentStatus(data.pollUrl);
      } else if (!response.ok) {
        throw new Error(formatEvidenceError(data));
      }

      if (enrichmentData.success && enrichmentData.evidence) {
        // Transform enrichment response to EvidenceAnalysisPanelNew format
        const evidence = transformEnrichmentResponse(enrichmentData);
        setEvidenceSummary(evidence);
      } else if (enrichmentData.success && enrichmentData.data) {
        // Alternative response format
        const evidence = transformEnrichmentResponse(enrichmentData);
        setEvidenceSummary(evidence);
      } else if (enrichmentData.evidence || enrichmentData.data) {
        const evidence = transformEnrichmentResponse(enrichmentData);
        setEvidenceSummary(evidence);
      } else {
        throw new Error(enrichmentData.error || labels.invalidFormat);
      }

    } catch (err: any) {
      setError(err.message || labels.unknownError);
      console.error("Enrichment error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [benefit, formatEvidenceError, labels.invalidFormat, labels.unknownError, pollEnrichmentStatus, slug, transformEnrichmentResponse]);

  useEffect(() => {
    if (!slug) return;
    fetchEnrichedEvidence();
  }, [fetchEnrichedEvidence, slug]);

  useEffect(() => {
    if (!slug) return;

    const viewKey = `${locale}:${slug}:${benefit || 'general'}`;
    if (trackedViewRef.current === viewKey) {
      return;
    }

    trackedViewRef.current = viewKey;
    trackGAEvent('supplement_viewed', {
      supplement_slug: slug,
      supplement_name: supplementName,
      benefit: benefit || 'general',
      language: locale,
      source: 'supplement_detail',
    });
  }, [benefit, locale, slug, supplementName]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href={benefit ? `/${language}/portal/category/${benefit}` : `/${language}/portal`} className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {benefit ? `${labels.backTo} ${benefitName}` : labels.backToSearch}
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            {labels.evidenceFor} <span className="text-blue-600">{supplementName}</span>
          </h1>
          {benefit && (
            <p className="text-lg text-gray-600 mt-2">
              {labels.focusedOn} <span className="font-medium">{benefitName}</span>
            </p>
          )}
        </div>
        {!isLoading && (
          <button
            onClick={() => fetchEnrichedEvidence(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title={labels.refreshTitle}
          >
            <RefreshCw className="w-4 h-4" />
            {labels.refresh}
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col justify-center items-center py-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
          <LoaderCircle className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <p className="text-lg text-gray-700 font-medium">{labels.analyzing}</p>
          <p className="text-sm text-gray-500 mt-2">{labels.analyzingHint}</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-6 flex items-start">
          <AlertTriangle className="w-6 h-6 mr-4 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-lg">{labels.errorTitle}</h3>
            <p className="text-sm mt-1">{error}</p>
            <button
              onClick={() => fetchEnrichedEvidence(true)}
              className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-sm font-medium transition-colors"
            >
              {labels.retry}
            </button>
          </div>
        </div>
      )}

      {!isLoading && !error && evidenceSummary && (
        <div className="space-y-6">
          {/* Cache indicator */}
          {evidenceSummary.metadata?.fromCache && (
            <div className="text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1 w-fit">
              ⚡ Datos en caché • {evidenceSummary.metadata.studiesUsed || 'Varios'} estudios analizados
            </div>
          )}

          {/* Rich Evidence Panel */}
          <EvidenceAnalysisPanelNew
            evidenceSummary={evidenceSummary}
            supplementName={supplementName}
            language={language}
            onViewStudies={(ingredientName) => {
              // Open PubMed search for this ingredient
              const query = encodeURIComponent(ingredientName);
              window.open(`https://pubmed.ncbi.nlm.nih.gov/?term=${query}`, '_blank');
            }}
          />
        </div>
      )}

      {!isLoading && !error && !evidenceSummary && (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <h3 className="text-xl font-semibold text-gray-800">No se encontró evidencia</h3>
          <p className="text-gray-500 mt-2">
            No pudimos encontrar estudios para &quot;{supplementName}&quot;.
          </p>
          <button
            onClick={() => fetchEnrichedEvidence(true)}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Buscar de nuevo
          </button>
        </div>
      )}
    </div>
  );
}
