/**
 * SupplementEvidenceCard Component
 *
 * Muestra una tarjeta individual para un suplemento, resumiendo la evidencia
 * encontrada para una condición específica.
 */
import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';
import type { SupplementEvidence, EvidenceGrade } from '@/lib/services/pubmed-search';

interface SupplementEvidenceCardProps {
  supplement: SupplementEvidence;
}

const gradeColors: Record<EvidenceGrade, string> = {
  A: 'bg-green-100 text-green-800 border-green-300',
  B: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  C: 'bg-orange-100 text-orange-800 border-orange-300',
  D: 'bg-red-100 text-red-800 border-red-300',
};

const SupplementEvidenceCard: React.FC<SupplementEvidenceCardProps> = ({ supplement }) => {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/portal/results?q=${encodeURIComponent(supplement.supplementName)}`);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <button
        onClick={handleCardClick}
        className="w-full text-left"
        aria-label={`Ver análisis completo para ${supplement.supplementName}`}
      >
        <Card
          className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg h-full flex flex-col"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">{supplement.supplementName}</CardTitle>
              <CardDescription className="text-sm text-gray-600 mt-1">
                {supplement.totalStudyCount} estudios analizados en total
              </CardDescription>
            </div>
            <Badge className={`text-sm font-bold px-3 py-1 border ${gradeColors[supplement.overallGrade]}`}>
              Grado {supplement.overallGrade}
            </Badge>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Evidencia por Beneficio:</h4>
              <ul className="space-y-2 mb-4">
                {supplement.benefits.map((benefit) => (
                  <li key={benefit.benefitName} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{benefit.benefitName}</span>
                    <Badge className={`text-xs font-bold px-2 py-0.5 border ${gradeColors[benefit.grade]}`}>
                      {benefit.grade} ({benefit.studyCount})
                    </Badge>
                  </li>
                ))}
                {supplement.benefits.length === 0 && (
                   <p className="text-xs text-gray-500">No se encontró evidencia específica para beneficios predefinidos.</p>
                )}
              </ul>
            </div>
            <div className="flex items-center text-blue-600 group-hover:translate-x-1 transition-transform mt-auto">
              <span className="text-sm font-medium">Ver análisis completo</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </div>
          </CardContent>
        </Card>
      </button>
    </motion.div>
  );
};

export default SupplementEvidenceCard;
