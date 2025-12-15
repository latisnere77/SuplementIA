/**
 * Scientific Studies Panel
 * Displays real scientific studies from PubMed
 */

'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Beaker, Users, Calendar, FileText, AlertCircle } from 'lucide-react';

interface Study {
  pmid: string;
  title: string;
  abstract: string;
  authors: string[];
  year: number;
  journal?: string;
  studyType?: string;
  participants?: number;
  doi?: string;
  pubmedUrl: string;
}

interface StudiesData {
  studies: Study[];
  totalFound: number;
  searchQuery: string;
}

interface ScientificStudiesPanelProps {
  supplementName: string;
  maxStudies?: number;
  filters?: {
    rctOnly?: boolean;
    yearFrom?: number;
  };
  autoLoad?: boolean;
}

const STUDY_TYPE_COLORS: Record<string, string> = {
  'randomized controlled trial': 'bg-green-100 text-green-800 border-green-200',
  'meta-analysis': 'bg-purple-100 text-purple-800 border-purple-200',
  'systematic review': 'bg-blue-100 text-blue-800 border-blue-200',
  'clinical trial': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'review': 'bg-gray-100 text-gray-800 border-gray-200',
};

const STUDY_TYPE_LABELS: Record<string, string> = {
  'randomized controlled trial': 'RCT',
  'meta-analysis': 'Meta-Análisis',
  'systematic review': 'Revisión Sistemática',
  'clinical trial': 'Ensayo Clínico',
  'review': 'Revisión',
};

export default function ScientificStudiesPanel({
  supplementName,
  maxStudies = 5,
  filters = {},
  autoLoad = false,
}: ScientificStudiesPanelProps) {
  const [studies, setStudies] = useState<StudiesData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedStudy, setExpandedStudy] = useState<string | null>(null);

  const loadStudies = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/portal/studies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supplementName,
          maxResults: maxStudies,
          filters: {
            ...filters,
            humanStudiesOnly: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to load studies');
      }

      const data = await response.json();

      if (data.success && data.data) {
        setStudies(data.data);
      } else {
        throw new Error(data.error || 'Failed to load studies');
      }
    } catch (err: any) {
      console.error('Error loading studies:', err);
      setError(err.message || 'Failed to load studies');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (autoLoad) {
      loadStudies();
    }
  }, [supplementName, autoLoad]);

  const toggleStudy = (pmid: string) => {
    setExpandedStudy(expandedStudy === pmid ? null : pmid);
  };

  if (!autoLoad && !studies && !isLoading) {
    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Estudios Científicos Reales
            </h3>
            <p className="text-gray-600 mb-4">
              Consulta estudios verificables sobre {supplementName}
            </p>
            <button
              onClick={loadStudies}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
            >
              <Beaker className="w-5 h-5" />
              Ver Estudios
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando estudios científicos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl border-2 border-red-200 p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-900 mb-1">Error al cargar estudios</h3>
            <p className="text-red-700">{error}</p>
            <button
              onClick={loadStudies}
              className="mt-3 text-red-600 hover:text-red-700 font-medium"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!studies || studies.studies.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl border-2 border-gray-200 p-6">
        <p className="text-gray-600 text-center">
          No se encontraron estudios para {supplementName}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">
            Estudios Científicos Verificables
          </h3>
        </div>
        <p className="text-gray-600">
          {studies.totalFound} estudios encontrados en bases de datos científicas sobre{' '}
          <span className="font-semibold">{studies.searchQuery}</span>
        </p>
      </div>

      {/* Studies List */}
      <div className="space-y-4">
        {studies.studies.map((study) => (
          <div
            key={study.pmid}
            className="border-2 border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-colors"
          >
            {/* Study Header */}
            <div className="p-4 bg-gray-50">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h4 className="font-semibold text-gray-900 text-lg flex-1">
                  {study.title}
                </h4>
                <a
                  href={study.pubmedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 text-blue-600 hover:text-blue-700"
                  title="Ver Fuente Original"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap gap-3 text-sm">
                {/* Study Type */}
                {study.studyType && (
                  <span
                    className={`px-3 py-1 rounded-full border font-medium ${STUDY_TYPE_COLORS[study.studyType] || STUDY_TYPE_COLORS['review']
                      }`}
                  >
                    {STUDY_TYPE_LABELS[study.studyType] || study.studyType}
                  </span>
                )}

                {/* Year */}
                {study.year > 0 && (
                  <span className="inline-flex items-center gap-1 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    {study.year}
                  </span>
                )}

                {/* Participants */}
                {study.participants && (
                  <span className="inline-flex items-center gap-1 text-gray-600">
                    <Users className="w-4 h-4" />
                    {study.participants.toLocaleString()} participantes
                  </span>
                )}

                {/* PMID */}
                <span className="text-gray-500 font-mono text-xs">
                  PMID: {study.pmid}
                </span>
              </div>

              {/* Authors */}
              {study.authors.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {study.authors.join(', ')}
                </p>
              )}

              {/* Journal */}
              {study.journal && (
                <p className="text-sm text-gray-500 italic mt-1">{study.journal}</p>
              )}
            </div>

            {/* Abstract (Expandable) */}
            {study.abstract && (
              <div className="border-t border-gray-200">
                <button
                  onClick={() => toggleStudy(study.pmid)}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  {expandedStudy === study.pmid ? 'Ocultar' : 'Ver'} resumen
                </button>

                {expandedStudy === study.pmid && (
                  <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {study.abstract}
                    </p>

                    {/* DOI */}
                    {study.doi && (
                      <a
                        href={`https://doi.org/${study.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-3"
                      >
                        DOI: {study.doi}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          Todos los estudios provienen de fuentes científicas globales y verificables.
        </p>
      </div>
    </div>
  );
}
