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
          className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">{supplement.supplementName}</CardTitle>
              <CardDescription className="text-sm text-gray-600 mt-1">
                {supplement.studyCount} estudios analizados
              </CardDescription>
            </div>
            <Badge className={`text-sm font-bold px-3 py-1 border ${gradeColors[supplement.grade]}`}>
              Grado {supplement.grade}
            </Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 mb-4">{supplement.evidenceSummary}</p>
            <div className="flex items-center text-blue-600 group-hover:translate-x-1 transition-transform">
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
