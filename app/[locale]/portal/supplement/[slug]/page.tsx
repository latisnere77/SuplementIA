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
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, LoaderCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import EvidenceAnalysisPanelNew from '@/components/portal/EvidenceAnalysisPanelNew';
import type { GradeType } from '@/types/supplement-grade';

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

  const slug = params.slug as string;
  const benefit = searchParams.get('benefit') || '';

  const [evidenceSummary, setEvidenceSummary] = useState<EvidenceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supplementName = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const benefitName = benefit.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const fetchEnrichedEvidence = async (forceRefresh = false) => {
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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error al obtener evidencia: ${errorText}`);
      }

      const data = await response.json();

      if (data.success && data.evidence) {
        // Transform enrichment response to EvidenceAnalysisPanelNew format
        const evidence = transformEnrichmentResponse(data);
        setEvidenceSummary(evidence);
      } else if (data.success && data.data) {
        // Alternative response format
        const evidence = transformEnrichmentResponse(data);
        setEvidenceSummary(evidence);
      } else {
        throw new Error(data.error || 'Formato de datos inválido');
      }

    } catch (err: any) {
      setError(err.message || 'Error desconocido al obtener la evidencia.');
      console.error("Enrichment error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Transform enrichment API response to component format
  const transformEnrichmentResponse = (data: any): EvidenceSummary => {
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
        `${supplementName} es un suplemento con evidencia científica para diversos beneficios de salud.`,
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
  };

  useEffect(() => {
    if (!slug) return;
    fetchEnrichedEvidence();
  }, [slug, benefit]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href={`/portal/category/${benefit}`} className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver a {benefitName}
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Evidencia Científica para <span className="text-blue-600">{supplementName}</span>
          </h1>
          {benefit && (
            <p className="text-lg text-gray-600 mt-2">
              Enfocado en: <span className="font-medium">{benefitName}</span>
            </p>
          )}
        </div>
        {!isLoading && (
          <button
            onClick={() => fetchEnrichedEvidence(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Actualizar datos"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col justify-center items-center py-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
          <LoaderCircle className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <p className="text-lg text-gray-700 font-medium">Analizando literatura científica...</p>
          <p className="text-sm text-gray-500 mt-2">Esto puede tomar unos segundos</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-6 flex items-start">
          <AlertTriangle className="w-6 h-6 mr-4 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-lg">Error al Obtener Evidencia</h3>
            <p className="text-sm mt-1">{error}</p>
            <button
              onClick={() => fetchEnrichedEvidence(true)}
              className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-sm font-medium transition-colors"
            >
              Reintentar
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
            No pudimos encontrar estudios para "{supplementName}".
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
