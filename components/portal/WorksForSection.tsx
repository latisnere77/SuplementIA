/**
 * Works For Section Component
 * Muestra para qué FUNCIONA y para qué NO FUNCIONA un suplemento
 * Diseño visual con colores llamativos
 */

'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, TrendingUp, Minus, HelpCircle, X } from 'lucide-react';
import { SupplementGradeBadge, type GradeType } from './SupplementGrade';

/**
 * Componente de leyenda para explicar los grados de evidencia
 */
function EvidenceGradeLegend() {
  const [isOpen, setIsOpen] = useState(false);

  const grades = [
    {
      grade: 'A',
      color: 'bg-green-500',
      textColor: 'text-green-700',
      bgLight: 'bg-green-50',
      label: 'Evidencia Clínica Fuerte',
      description: 'Meta-análisis o múltiples Ensayos Clínicos Aleatorizados (RCT) con resultados consistentes.',
    },
    {
      grade: 'B',
      color: 'bg-emerald-500',
      textColor: 'text-emerald-700',
      bgLight: 'bg-emerald-50',
      label: 'Evidencia Clínica Moderada',
      description: 'Ensayos clínicos aleatorizados (RCT) pequeños o con algunas limitaciones metodológicas.',
    },
    {
      grade: 'C',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-700',
      bgLight: 'bg-yellow-50',
      label: 'Evidencia Clínica Limitada',
      description: 'Estudios observacionales o de cohorte que sugieren asociación pero no prueban causalidad.',
    },
    {
      grade: 'D',
      color: 'bg-orange-500',
      textColor: 'text-orange-700',
      bgLight: 'bg-orange-50',
      label: 'Evidencia Clínica Débil',
      description: 'Series de casos o estudios sin grupo control. Resultados inconsistentes.',
    },
    {
      grade: 'E',
      color: 'bg-red-400',
      textColor: 'text-red-700',
      bgLight: 'bg-red-50',
      label: 'Evidencia Preclínica',
      description: 'Solo estudios en animales o in vitro (laboratorio). No validado en humanos aún.',
    },
    {
      grade: 'F',
      color: 'bg-red-600',
      textColor: 'text-red-800',
      bgLight: 'bg-red-100',
      label: 'Opinión o Anécdota',
      description: 'Opinión de expertos o reportes aislados sin base en estudios clínicos controlados.',
    },
  ];

  return (
    <div className="relative">
      {/* Botón de ayuda */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg"
        aria-label="Ver leyenda de grados de evidencia"
      >
        <HelpCircle className="h-4 w-4" />
        <span className="hidden sm:inline">¿Qué significan A, B, C, D, F?</span>
        <span className="sm:hidden">Leyenda</span>
      </button>

      {/* Modal/Popup de leyenda */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel de leyenda */}
          <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">
                Grados de Evidencia Científica
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
                aria-label="Cerrar leyenda"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {grades.map(({ grade, color, textColor, bgLight, label, description }) => (
                <div
                  key={grade}
                  className={`${bgLight} rounded-lg p-3 border-l-4 ${color.replace('bg-', 'border-')}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`${color} text-white font-bold w-7 h-7 rounded-full flex items-center justify-center text-sm`}>
                      {grade}
                    </span>
                    <span className={`font-semibold ${textColor}`}>
                      {label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 ml-9">
                    {description}
                  </p>
                </div>
              ))}

              {/* Nota adicional */}
              <div className="bg-gray-50 rounded-lg p-3 mt-4 border border-gray-200">
                <p className="text-xs text-gray-500">
                  <strong>Nota:</strong> Estos grados se basan en la cantidad y calidad de estudios científicos disponibles,
                  no en la efectividad personal. Consulta siempre a un profesional de salud.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export interface WorksForItem {
  condition: string;
  grade: GradeType;
  description?: string;
}

interface WorksForSectionProps {
  worksFor: WorksForItem[];
  doesntWorkFor: WorksForItem[];
  limitedEvidence?: WorksForItem[];
}

/**
 * Función helper para ordenar items por grado de evidencia (A → F)
 */
function sortByEvidenceGrade(items: WorksForItem[]): WorksForItem[] {
  const gradeOrder: Record<GradeType, number> = {
    'A': 1,
    'B': 2,
    'C': 3,
    'D': 4,
    'E': 5,
    'F': 6,
  };

  return [...items].sort((a, b) => {
    return gradeOrder[a.grade] - gradeOrder[b.grade];
  });
}

/**
 * Sección visual "Funciona vs No Funciona"
 * Los items se ordenan automáticamente por grado de evidencia (A → F)
 *
 * @example
 * ```tsx
 * <WorksForSection
 *   worksFor={[
 *     { condition: 'Mejorar el sueño', grade: 'A', description: 'Reduce el tiempo para dormir' },
 *     { condition: 'Reducir ansiedad', grade: 'B' },
 *   ]}
 *   doesntWorkFor={[
 *     { condition: 'Pérdida de peso', grade: 'F', description: 'Sin evidencia científica' },
 *   ]}
 * />
 * ```
 */
export default function WorksForSection({
  worksFor,
  doesntWorkFor,
  limitedEvidence = [],
}: WorksForSectionProps) {
  // Ordenar items por grado de evidencia (A → F)
  const sortedWorksFor = sortByEvidenceGrade(worksFor);
  const sortedDoesntWorkFor = sortByEvidenceGrade(doesntWorkFor);
  const sortedLimitedEvidence = sortByEvidenceGrade(limitedEvidence);

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-6 md:p-8 shadow-sm">
      {/* Header con título y leyenda */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          ¿Para qué funciona?
        </h2>
        <EvidenceGradeLegend />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* FUNCIONA PARA */}
        {sortedWorksFor.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-100 p-2 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-green-800">
                ✅ Funciona para
              </h3>
            </div>

            <ul className="space-y-3">
              {sortedWorksFor.map((item, index) => (
                <li
                  key={index}
                  className="bg-green-50 border-2 border-green-200 rounded-lg p-4 hover:border-green-400 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 break-words">
                          {item.condition}
                        </span>
                        <SupplementGradeBadge grade={item.grade} size="sm" />
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1 break-words">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* NO FUNCIONA PARA */}
        {sortedDoesntWorkFor.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-red-800">
                ❌ No funciona para
              </h3>
            </div>

            <ul className="space-y-3">
              {sortedDoesntWorkFor.map((item, index) => (
                <li
                  key={index}
                  className="bg-red-50 border-2 border-red-200 rounded-lg p-4 hover:border-red-400 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 break-words">
                          {item.condition}
                        </span>
                        <SupplementGradeBadge grade={item.grade} size="sm" />
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1 break-words">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* EVIDENCIA LIMITADA (Opcional) */}
      {sortedLimitedEvidence.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-yellow-100 p-2 rounded-lg">
              <TrendingUp className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="text-xl font-bold text-yellow-800">
              ⚠️ Evidencia Limitada
            </h3>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-3">
              Los siguientes efectos tienen evidencia prometedora pero necesitan más investigación:
            </p>
            <ul className="space-y-2">
              {sortedLimitedEvidence.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Minus className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 break-words">{item.condition}</span>
                      <SupplementGradeBadge grade={item.grade} size="sm" />
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-600 mt-0.5 break-words">{item.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
