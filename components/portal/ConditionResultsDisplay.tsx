/**
 * ConditionResultsDisplay Component
 *
 * Muestra los resultados de una búsqueda por condición, agrupando los
 * suplementos por su nivel de evidencia científica.
 */
import React from 'react';
import type { PubMedQueryResult, SupplementEvidence } from '@/lib/services/pubmed-search';
import SupplementEvidenceCard from './SupplementEvidenceCard';

interface ConditionResultsDisplayProps {
  result: PubMedQueryResult;
}

interface GradeSectionProps {
  title: string;
  supplements: SupplementEvidence[];
  borderColor: string;
}

const GradeSection: React.FC<GradeSectionProps> = ({ title, supplements, borderColor }) => {
  if (supplements.length === 0) {
    return null; // No renderizar la sección si no hay suplementos
  }

  return (
    <div>
      <h3 className={`text-xl font-semibold text-gray-800 mb-4 border-b-2 ${borderColor} pb-2`}>
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {supplements.map((supplement) => (
          <SupplementEvidenceCard key={supplement.supplementName} supplement={supplement} />
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
          />
          <GradeSection
            title="Grado B: Evidencia Moderada"
            supplements={result.supplementsByEvidence.gradeB}
            borderColor="border-yellow-300"
          />
          <GradeSection
            title="Grado C: Evidencia Limitada"
            supplements={result.supplementsByEvidence.gradeC}
            borderColor="border-orange-300"
          />
          <GradeSection
            title="Grado D: Evidencia en Contra o Inexistente"
            supplements={result.supplementsByEvidence.gradeD}
            borderColor="border-red-300"
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
