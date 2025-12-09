/**
 * Supplement Grade Component
 * Sistema de calificación visual A-F (tipo semáforo)
 * Muestra si es "Snake Oil" o "Respaldado por ciencia"
 */

'use client';

import { CheckCircle2, XCircle, AlertCircle, TrendingUp } from 'lucide-react';
import type { GradeType } from '@/types/supplement-grade';

interface SupplementGradeProps {
  grade: GradeType;
  supplementName?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const GRADE_CONFIG: Record<GradeType, {
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
  labelShort: string;
  icon: typeof CheckCircle2;
  emoji: string;
  description: string;
}> = {
  A: {
    color: 'text-green-800',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-400',
    label: 'Evidencia Muy Fuerte',
    labelShort: 'Muy Fuerte',
    icon: CheckCircle2,
    emoji: '💚',
    description: 'Respaldado por múltiples estudios de alta calidad',
  },
  B: {
    color: 'text-emerald-800',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-400',
    label: 'Evidencia Sólida',
    labelShort: 'Sólida',
    icon: CheckCircle2,
    emoji: '🟢',
    description: 'Respaldado por varios estudios consistentes',
  },
  C: {
    color: 'text-yellow-800',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-400',
    label: 'Evidencia Emergente',
    labelShort: 'Emergente',
    icon: TrendingUp,
    emoji: '🟡',
    description: 'Algunos estudios prometedores, más investigación necesaria',
  },
  D: {
    color: 'text-orange-800',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-400',
    label: 'Evidencia Débil',
    labelShort: 'Débil',
    icon: AlertCircle,
    emoji: '🟠',
    description: 'Pocos estudios, calidad baja o resultados mixtos',
  },
  E: {
    color: 'text-red-800',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-400',
    label: 'Evidencia Muy Débil',
    labelShort: 'Muy Débil',
    icon: XCircle,
    emoji: '🔴',
    description: 'Evidencia insuficiente o contradictoria',
  },
  F: {
    color: 'text-red-900',
    bgColor: 'bg-red-200',
    borderColor: 'border-red-600',
    label: 'Sin Evidencia / Snake Oil',
    labelShort: 'Snake Oil',
    icon: XCircle,
    emoji: '🚫',
    description: 'No respaldado por evidencia científica',
  },
};

/**
 * Componente de calificación visual para suplementos
 *
 * @example
 * ```tsx
 * <SupplementGrade grade="A" supplementName="Ashwagandha" />
 * ```
 */
export default function SupplementGrade({
  grade,
  supplementName,
  showLabel = true,
  size = 'md',
}: SupplementGradeProps) {
  const config = GRADE_CONFIG[grade];
  const Icon = config.icon;

  // Tamaños
  const sizes = {
    sm: {
      badge: 'px-3 py-1 text-sm',
      icon: 'h-4 w-4',
      text: 'text-sm',
      emoji: 'text-lg',
    },
    md: {
      badge: 'px-4 py-2 text-base',
      icon: 'h-5 w-5',
      text: 'text-base',
      emoji: 'text-xl',
    },
    lg: {
      badge: 'px-6 py-3 text-lg',
      icon: 'h-6 w-6',
      text: 'text-lg',
      emoji: 'text-2xl',
    },
  };

  const sizeClasses = sizes[size];

  return (
    <div className="space-y-3">
      {/* Badge principal con calificación */}
      <div
        className={`
          inline-flex items-center gap-3 rounded-lg border-2 font-bold
          ${config.bgColor} ${config.borderColor} ${config.color} ${sizeClasses.badge}
        `}
      >
        <span className={sizeClasses.emoji}>{config.emoji}</span>
        <span>Calificación: {grade}</span>
        <Icon className={sizeClasses.icon} />
      </div>

      {/* Label descriptivo */}
      {showLabel && (
        <div className="flex items-start gap-2">
          <div className={`font-semibold ${config.color} ${sizeClasses.text}`}>
            {config.label}
          </div>
        </div>
      )}

      {/* Descripción */}
      <p className="text-sm text-gray-600 max-w-md">
        {config.description}
      </p>
    </div>
  );
}

/**
 * Versión compacta del badge para usar en listas
 */
export function SupplementGradeBadge({ grade, size = 'sm' }: { grade: GradeType; size?: 'sm' | 'md' }) {
  const config = GRADE_CONFIG[grade];
  const Icon = config.icon;

  const sizeClasses = size === 'sm'
    ? 'px-2 py-1 text-xs gap-1.5'
    : 'px-3 py-1.5 text-sm gap-2';

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <span
      className={`
        inline-flex items-center rounded-full border font-semibold
        ${config.bgColor} ${config.borderColor} ${config.color} ${sizeClasses}
      `}
      title={config.description}
    >
      <span>{config.emoji}</span>
      <span>{grade}</span>
      <Icon className={iconSize} />
    </span>
  );
}
