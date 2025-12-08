/**
 * ConditionResultsDisplay Component
 *
 * Muestra los resultados de una búsqueda por condición, agrupando los
 * suplementos por su nivel de evidencia científica.
 */
import React from 'react';
import type { PubMedQueryResult } from '@/lib/services/pubmed-search';
import { SupplementEvidenceCard } from './SupplementEvidenceCard';
import type { SupplementEvidence } from '@/lib/knowledge-base'; // Use the new unified type

interface ConditionResultsDisplayProps {
  result: PubMedQueryResult;
}

interface GradeSectionProps {
  title: string;
  supplements: any[]; // Loosening type here to accommodate old structure temporarily
  borderColor: string;
  categorySlug: string;
}

const GradeSection: React.FC<GradeSectionProps> = ({ title, supplements, borderColor, categorySlug }) => {
  if (supplements.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className={`text-xl font-semibold text-gray-800 mb-4 border-b-2 ${borderColor} pb-2`}>
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {supplements.map((supplement) => (
          <SupplementEvidenceCard 
            key={supplement.supplementName} 
            supplement={{
              name: supplement.supplementName,
              evidenceGrade: supplement.grade,
              summary: supplement.summary,
              slug: supplement.supplementName.toLowerCase().replace(/ /g, '-'), // Create a slug on the fly
            }}
            categorySlug={categorySlug}
          />
        ))}
      </div>
    </div>
  );
};

const ConditionResultsDisplay: React.FC<ConditionResultsDisplayProps> = ({ result }) => {
  const allSupplements = [
    ...result.supplementsByEvidence.gradeA,
    ...result.supplementsByEvidence.gradeB,
    ...result.supplementsByEvidence.gradeC,
    ...result.supplementsByEvidence.gradeD,
  ];
  
  const categorySlug = result.condition.toLowerCase().replace(/ /g, '-');

  return (
    <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-sm">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
        Evidencia de Suplementos para: <span className="text-blue-600">{result.condition}</span>
      </h2>
      <p className="text-gray-600 mb-6">{result.summary}</p>

      {allSupplements.length > 0 ? (
        <div className="space-y-8">
          <GradeSection
            title="Grado A: Evidencia Fuerte"
            supplements={result.supplementsByEvidence.gradeA}
            borderColor="border-green-300"
            categorySlug={categorySlug}
          />
          <GradeSection
            title="Grado B: Evidencia Moderada"
            supplements={result.supplementsByEvidence.gradeB}
            borderColor="border-yellow-300"
            categorySlug={categorySlug}
          />
          <GradeSection
            title="Grado C: Evidencia Limitada"
            supplements={result.supplementsByEvidence.gradeC}
            borderColor="border-orange-300"
            categorySlug={categorySlug}
          />
          <GradeSection
            title="Grado D: Evidencia en Contra o Inexistente"
            supplements={result.supplementsByEvidence.gradeD}
            borderColor="border-red-300"
            categorySlug={categorySlug}
          />
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No se encontraron suplementos con evidencia relevante para esta condición.</p>
        </div>
      )}
    </div>
  );
};

export default ConditionResultsDisplay;
