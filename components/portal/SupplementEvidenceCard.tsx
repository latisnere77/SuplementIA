/**
 * SupplementEvidenceCard Component
 * 
 * Displays a single supplement's evidence level for a specific health condition.
 * It features a prominent evidence grade, a color-coded indicator, and a brief summary.
 */
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { EvidenceGrade } from '@/lib/knowledge-base';

interface SupplementEvidenceCardProps {
  supplement: {
    name: string;
    evidenceGrade: EvidenceGrade;
    summary: string;
    slug: string;
  };
  categorySlug: string;
}

const gradeColorMap: Record<EvidenceGrade, { bg: string; text: string; ring: string }> = {
  A: { bg: 'bg-green-100', text: 'text-green-800', ring: 'ring-green-300' },
  B: { bg: 'bg-lime-100', text: 'text-lime-800', ring: 'ring-lime-300' },
  C: { bg: 'bg-yellow-100', text: 'text-yellow-800', ring: 'ring-yellow-300' },
  D: { bg: 'bg-orange-100', text: 'text-orange-800', ring: 'ring-orange-300' },
  F: { bg: 'bg-red-100', text: 'text-red-800', ring: 'ring-red-300' },
};

export const SupplementEvidenceCard: React.FC<SupplementEvidenceCardProps> = ({ supplement, categorySlug }) => {
  const { name, evidenceGrade, summary, slug } = supplement;
  const colors = gradeColorMap[evidenceGrade];

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <Link href={`/portal/supplement/${slug}?benefit=${categorySlug}`} passHref>
        <div className="flex items-start p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer h-full">
          <div className="flex-shrink-0 mr-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ring-4 ${colors.bg} ${colors.text} ${colors.ring}`}
            >
              {evidenceGrade}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{name}</h3>
            <p className="text-gray-600 mt-1">{summary}</p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};