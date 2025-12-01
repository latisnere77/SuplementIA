
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BenefitEvidenceCardProps {
  benefit: string;
  evidenceLevel: 'Fuerte' | 'Moderada' | 'Limitada' | 'Insuficiente';
  studiesFound: number;
  totalParticipants: number;
  summary: string;
}

const evidenceColors = {
  'Fuerte': 'bg-green-100 text-green-800 border-green-200',
  'Moderada': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Limitada': 'bg-orange-100 text-orange-800 border-orange-200',
  'Insuficiente': 'bg-red-100 text-red-800 border-red-200',
};

export function BenefitEvidenceCard({
  benefit,
  evidenceLevel,
  studiesFound,
  totalParticipants,
  summary,
}: BenefitEvidenceCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">{benefit}</h3>
        <Badge className={cn('text-sm', evidenceColors[evidenceLevel])}>
          {evidenceLevel}
        </Badge>
      </div>
      <p className="text-sm text-gray-600 mb-4">{summary}</p>
      <div className="flex items-center text-xs text-gray-500">
        <span>{studiesFound} estudios</span>
        <span className="mx-2">|</span>
        <span>{totalParticipants} participantes</span>
      </div>
    </div>
  );
}
