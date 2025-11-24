/**
 * Works For Section Component
 * Muestra para qué FUNCIONA y para qué NO FUNCIONA un suplemento
 * Diseño visual con colores llamativos
 */

'use client';

import { CheckCircle, XCircle, TrendingUp, Minus } from 'lucide-react';
import { SupplementGradeBadge, type GradeType } from './SupplementGrade';

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
 * Sección visual "Funciona vs No Funciona"
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
  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-6 md:p-8 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        ¿Para qué funciona?
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* FUNCIONA PARA */}
        {worksFor.length > 0 && (
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
              {worksFor.map((item, index) => (
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
        {doesntWorkFor.length > 0 && (
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
              {doesntWorkFor.map((item, index) => (
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
      {limitedEvidence.length > 0 && (
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
              {limitedEvidence.map((item, index) => (
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
