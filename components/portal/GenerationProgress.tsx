/**
 * Generation Progress Component
 * Shows real-time progress while generating supplement evidence
 */

'use client';

import { Beaker, Brain, Database, CheckCircle2 } from 'lucide-react';

interface ProgressUpdate {
  step: number;
  totalSteps: number;
  message: string;
  percentage: number;
  phase: 'searching' | 'analyzing' | 'caching' | 'complete';
}

interface GenerationProgressProps {
  progress: ProgressUpdate | null;
  supplementName?: string;
}

const PHASE_ICONS = {
  searching: Beaker,
  analyzing: Brain,
  caching: Database,
  complete: CheckCircle2,
};

const PHASE_COLORS = {
  searching: 'text-blue-600 bg-blue-100',
  analyzing: 'text-purple-600 bg-purple-100',
  caching: 'text-green-600 bg-green-100',
  complete: 'text-emerald-600 bg-emerald-100',
};

export default function GenerationProgress({ progress, supplementName }: GenerationProgressProps) {
  if (!progress) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  const Icon = PHASE_ICONS[progress.phase];
  const colorClass = PHASE_COLORS[progress.phase];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Generando Análisis de Evidencia
            </h2>
            {supplementName && (
              <p className="text-lg text-gray-600">
                Para: <span className="font-semibold text-gray-900">{supplementName}</span>
              </p>
            )}
          </div>

          {/* Progress Icon */}
          <div className="flex justify-center mb-8">
            <div className={`rounded-full p-6 ${colorClass} animate-pulse`}>
              <Icon className="h-12 w-12" />
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Paso {progress.step} de {progress.totalSteps}
              </span>
              <span className="text-sm font-bold text-blue-600">
                {progress.percentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>

          {/* Current Message */}
          <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
            <p className="text-center text-lg font-medium text-gray-800">
              {progress.message}
            </p>
          </div>

          {/* Steps Timeline */}
          <div className="mt-8 space-y-3">
            {[
              { step: 1, label: 'Buscando estudios en PubMed', phase: 'searching' },
              { step: 2, label: 'Analizando con IA (Bedrock Claude)', phase: 'analyzing' },
              { step: 3, label: 'Guardando en caché', phase: 'caching' },
              { step: 4, label: 'Completado', phase: 'complete' },
            ].map((item) => {
              const isCompleted = progress.step > item.step;
              const isCurrent = progress.step === item.step;
              const StepIcon = PHASE_ICONS[item.phase as keyof typeof PHASE_ICONS];

              return (
                <div
                  key={item.step}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg transition-all duration-300
                    ${isCurrent ? 'bg-blue-50 border-2 border-blue-300' : ''}
                    ${isCompleted ? 'bg-green-50' : ''}
                  `}
                >
                  <div
                    className={`
                      rounded-full p-2 transition-all duration-300
                      ${isCompleted ? 'bg-green-500 text-white' : ''}
                      ${isCurrent ? 'bg-blue-500 text-white animate-pulse' : ''}
                      ${!isCurrent && !isCompleted ? 'bg-gray-200 text-gray-400' : ''}
                    `}
                  >
                    <StepIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p
                      className={`
                        font-medium transition-all duration-300
                        ${isCurrent ? 'text-blue-700' : ''}
                        ${isCompleted ? 'text-green-700' : ''}
                        ${!isCurrent && !isCompleted ? 'text-gray-400' : ''}
                      `}
                    >
                      {item.label}
                    </p>
                  </div>
                  {isCompleted && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-500">
              Este proceso toma aproximadamente 10-15 segundos la primera vez.
              <br />
              Los resultados se guardarán en caché para futuras búsquedas.
            </p>
          </div>
        </div>

        {/* Fun Fact */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 inline-block">
            💡 <strong>Dato:</strong> Estamos analizando estudios científicos reales de PubMed usando IA
          </p>
        </div>
      </div>
    </div>
  );
}
