/**
 * IngredientBadges Component for Portal
 * 
 * User-friendly badges showing what matters to end-users:
 * - Evidence Quality: How strong is the scientific evidence?
 * - Works Well Combined: Does it work better with other ingredients?
 * - Real-World Results: Validated by similar users' experiences
 * - Clinical Support: Level of clinical research backing
 * 
 * All badges use simple, clear language for non-scientific users.
 */

'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Award, 
  Sparkles, 
  Users, 
  FlaskConical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface IngredientBadgeData {
  evidenceGrade?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  evidenceConfidence?: number; // 0-1
  synergy_score?: number;
  synergy_partner_count?: number;
  ml_boost?: number; // 0-1, represents percentage
  clinical_evidence_strength?: number; // 0-10
  studyCount?: number;
  rctCount?: number;
}

interface IngredientBadgesProps {
  ingredient: IngredientBadgeData;
  className?: string;
  showAll?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Evidence Quality Badge
 * Shows scientific evidence quality in simple terms
 */
function EvidenceQualityBadge({ 
  grade, 
  className,
  size = 'md',
  t
}: { 
  grade?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  t: any;
}) {
  if (!grade) return null;

  const gradeConfig = {
    A: { 
      label: t('badges.evidence.strong') || 'Evidencia Sólida', 
      color: 'bg-green-600 text-white border-green-700 dark:bg-green-700 dark:border-green-800', 
      icon: Award, 
      tooltip: t('badges.evidence.strong.tooltip') || 'Evidencia científica sólida - Múltiples estudios de alta calidad respaldan su efectividad' 
    },
    B: { 
      label: t('badges.evidence.moderate') || 'Evidencia Moderada', 
      color: 'bg-blue-600 text-white border-blue-700 dark:bg-blue-700 dark:border-blue-800', 
      icon: Award, 
      tooltip: t('badges.evidence.moderate.tooltip') || 'Evidencia científica moderada - Estudios respaldan su uso, pero con limitaciones' 
    },
    C: { 
      label: t('badges.evidence.limited') || 'Evidencia Limitada', 
      color: 'bg-yellow-600 text-white border-yellow-700 dark:bg-yellow-700 dark:border-yellow-800', 
      icon: Award, 
      tooltip: t('badges.evidence.limited.tooltip') || 'Evidencia científica limitada - Algunos estudios sugieren beneficios, pero se necesita más investigación' 
    },
    D: { 
      label: t('badges.evidence.weak') || 'Evidencia Débil', 
      color: 'bg-orange-600 text-white border-orange-700 dark:bg-orange-700 dark:border-orange-800', 
      icon: Award, 
      tooltip: t('badges.evidence.weak.tooltip') || 'Evidencia científica débil - Muy pocos estudios o resultados inconsistentes' 
    },
    E: { 
      label: t('badges.evidence.insufficient') || 'Evidencia Insuficiente', 
      color: 'bg-red-600 text-white border-red-700 dark:bg-red-700 dark:border-red-800', 
      icon: Award, 
      tooltip: t('badges.evidence.insufficient.tooltip') || 'Evidencia científica insuficiente - No hay suficientes estudios para evaluar su efectividad' 
    },
    F: { 
      label: t('badges.evidence.none') || 'Sin Evidencia', 
      color: 'bg-gray-600 text-white border-gray-700 dark:bg-gray-700 dark:border-gray-800', 
      icon: Award, 
      tooltip: t('badges.evidence.none.tooltip') || 'Sin evidencia científica confiable - No se encontraron estudios que respalden su uso' 
    },
  };

  const config = gradeConfig[grade];
  const Icon = config.icon;
  const sizeClasses = {
    sm: 'h-3 w-3 text-xs px-1.5 py-0.5',
    md: 'h-4 w-4 text-xs px-2 py-1',
    lg: 'h-5 w-5 text-sm px-3 py-1.5',
  };

  return (
    <Badge
      variant="default"
      className={cn('flex items-center gap-1 border', config.color, sizeClasses[size], className)}
      title={config.tooltip}
    >
      <Icon className={sizeClasses[size].split(' ')[0]} />
      <span>{config.label}</span>
    </Badge>
  );
}

/**
 * Synergy Badge
 * Shows if ingredient works well with others (user-friendly)
 */
function SynergyBadge({ 
  score, 
  partnerCount,
  className,
  size = 'md',
  t
}: { 
  score?: number;
  partnerCount?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  t: any;
}) {
  if (score === undefined || score === null || score === 0) return null;

  // Normalize score to 0-100 if it's higher (synergy scores can be 100-300+)
  const normalizedScore = score > 100 ? Math.min(100, Math.round(score / 3)) : Math.round(score);

  // Only show if synergy is meaningful (>= 40)
  if (normalizedScore < 40) return null;

  const getColor = (score: number) => {
    if (score >= 80) return 'bg-purple-600 text-white border-purple-700 dark:bg-purple-700 dark:border-purple-800';
    if (score >= 60) return 'bg-indigo-600 text-white border-indigo-700 dark:bg-indigo-700 dark:border-indigo-800';
    return 'bg-blue-600 text-white border-blue-700 dark:bg-blue-700 dark:border-blue-800';
  };

  const sizeClasses = {
    sm: 'h-3 w-3 text-xs px-1.5 py-0.5',
    md: 'h-4 w-4 text-xs px-2 py-1',
    lg: 'h-5 w-5 text-sm px-3 py-1.5',
  };

  const tooltip = partnerCount 
    ? (t('badges.synergy.tooltip.withPartners' as any) || `Funciona mejor cuando se combina con otros ingredientes - Compatible con ${partnerCount} ingrediente${partnerCount > 1 ? 's' : ''}`)
    : (t('badges.synergy.tooltip') || 'Funciona mejor cuando se combina con otros ingredientes - Potencia sus efectos');

  return (
    <Badge
      variant="default"
      className={cn('flex items-center gap-1 border', getColor(normalizedScore), sizeClasses[size], className)}
      title={tooltip}
    >
      <Sparkles className={sizeClasses[size].split(' ')[0]} />
      <span>{t('badges.synergy.label') || 'Funciona Mejor Combinado'}</span>
    </Badge>
  );
}

/**
 * Real-World Results Badge
 * Shows validation from similar users' experiences (user-friendly version of ML boost)
 */
function RealWorldResultsBadge({ 
  boost, 
  className,
  size = 'md',
  t
}: { 
  boost?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  t: any;
}) {
  if (boost === undefined || boost === null || boost < 0.4) return null;

  const percentage = Math.round(boost * 100);
  const getColor = (boost: number) => {
    if (boost >= 0.7) return 'bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-700 dark:border-emerald-800';
    if (boost >= 0.4) return 'bg-amber-600 text-white border-amber-700 dark:bg-amber-700 dark:border-amber-800';
    return null;
  };

  const sizeClasses = {
    sm: 'h-3 w-3 text-xs px-1.5 py-0.5',
    md: 'h-4 w-4 text-xs px-2 py-1',
    lg: 'h-5 w-5 text-sm px-3 py-1.5',
  };

  const color = getColor(boost);
  if (!color) return null;

  return (
    <Badge
      variant="default"
      className={cn('flex items-center gap-1 border', color, sizeClasses[size], className)}
      title={t('badges.realWorld.tooltip' as any) || `Validado por resultados reales - ${percentage}% de usuarios similares reportaron buenos resultados`}
    >
      <Users className={sizeClasses[size].split(' ')[0]} />
      <span>{t('badges.realWorld.label') || 'Resultados Reales'}</span>
    </Badge>
  );
}

/**
 * Clinical Support Badge
 * Shows level of clinical research backing (user-friendly)
 */
function ClinicalSupportBadge({ 
  strength, 
  className,
  size = 'md',
  t
}: { 
  strength?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  t: any;
}) {
  if (strength === undefined || strength === null || strength < 4) return null;

  // strength is 0-10 scale
  const score = Math.round(strength);
  const getColor = (score: number) => {
    if (score >= 8) return 'bg-green-600 text-white border-green-700 dark:bg-green-700 dark:border-green-800';
    if (score >= 6) return 'bg-blue-600 text-white border-blue-700 dark:bg-blue-700 dark:border-blue-800';
    return 'bg-yellow-600 text-white border-yellow-700 dark:bg-yellow-700 dark:border-yellow-800';
  };

  const getLabel = (score: number) => {
    if (score >= 8) return t('badges.clinical.strong' as any) || 'Alto Respaldo Clínico';
    if (score >= 6) return t('badges.clinical.moderate' as any) || 'Respaldo Clínico Moderado';
    return t('badges.clinical.limited' as any) || 'Algún Respaldo Clínico';
  };

  const sizeClasses = {
    sm: 'h-3 w-3 text-xs px-1.5 py-0.5',
    md: 'h-4 w-4 text-xs px-2 py-1',
    lg: 'h-5 w-5 text-sm px-3 py-1.5',
  };

  return (
    <Badge
      variant="default"
      className={cn('flex items-center gap-1 border', getColor(score), sizeClasses[size], className)}
      title={t('badges.clinical.tooltip' as any) || `Respaldo de investigación clínica: ${score}/10 - Basado en estudios científicos`}
    >
      <FlaskConical className={sizeClasses[size].split(' ')[0]} />
      <span>{getLabel(score)}</span>
    </Badge>
  );
}

/**
 * Main IngredientBadges Component
 * Combines all available badges for an ingredient
 * Only shows badges that are meaningful for end-users
 */
export function IngredientBadges({ 
  ingredient, 
  className,
  showAll = false,
  size = 'md'
}: IngredientBadgesProps) {
  const { t } = useTranslation();
  const hasData = 
    ingredient.evidenceGrade !== undefined ||
    (ingredient.synergy_score !== undefined && ingredient.synergy_score >= 40) ||
    (ingredient.ml_boost !== undefined && ingredient.ml_boost >= 0.4) ||
    (ingredient.clinical_evidence_strength !== undefined && ingredient.clinical_evidence_strength >= 4);

  if (!hasData && !showAll) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <EvidenceQualityBadge 
        grade={ingredient.evidenceGrade} 
        size={size}
        t={t}
      />
      <SynergyBadge 
        score={ingredient.synergy_score} 
        partnerCount={ingredient.synergy_partner_count}
        size={size}
        t={t}
      />
      <RealWorldResultsBadge 
        boost={ingredient.ml_boost} 
        size={size}
        t={t}
      />
      <ClinicalSupportBadge 
        strength={ingredient.clinical_evidence_strength} 
        size={size}
        t={t}
      />
    </div>
  );
}

/**
 * Compact version for table cells or small spaces
 */
export function IngredientBadgesCompact({ 
  ingredient, 
  className 
}: { 
  ingredient: IngredientBadgeData;
  className?: string;
}) {
  const { t } = useTranslation();
  const badges = [];

  if (ingredient.evidenceGrade) {
    const gradeColors = {
      A: 'bg-green-600 text-white border-green-700',
      B: 'bg-blue-600 text-white border-blue-700',
      C: 'bg-yellow-600 text-white border-yellow-700',
      D: 'bg-orange-600 text-white border-orange-700',
      E: 'bg-red-600 text-white border-red-700',
      F: 'bg-gray-600 text-white border-gray-700',
    };

    badges.push(
      <Badge
        key="grade"
        variant="default"
        className={cn('text-xs border', gradeColors[ingredient.evidenceGrade])}
        title={t(`badges.evidence.${ingredient.evidenceGrade.toLowerCase()}.tooltip` as any) || `Grade ${ingredient.evidenceGrade}: Evidencia científica sólida`}
      >
        {t(`badges.evidence.${ingredient.evidenceGrade.toLowerCase()}` as any) || `Grade ${ingredient.evidenceGrade}`}
      </Badge>
    );
  }

  if (ingredient.synergy_score !== undefined && ingredient.synergy_score >= 40) {
    badges.push(
      <Badge
        key="synergy"
        variant="default"
        className="bg-purple-600 text-white border-purple-700 text-xs"
        title={t('badges.synergy.tooltip') || 'Funciona mejor combinado'}
      >
        {t('badges.synergy.label') || 'Combinado'}
      </Badge>
    );
  }

  if (ingredient.ml_boost !== undefined && ingredient.ml_boost >= 0.4) {
    badges.push(
      <Badge
        key="realWorld"
        variant="default"
        className="bg-emerald-600 text-white border-emerald-700 text-xs"
        title={t('badges.realWorld.tooltip' as any) || 'Resultados reales'}
      >
        {t('badges.realWorld.label') || 'Resultados'}
      </Badge>
    );
  }

  if (badges.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {badges}
    </div>
  );
}
