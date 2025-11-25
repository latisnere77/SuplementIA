'use client';

import { useEffect, useState } from 'react';

interface IntelligentLoadingSpinnerProps {
  supplementName?: string;
}

const LOADING_STAGES = [
  {
    icon: '🔍',
    message: 'Buscando estudios científicos en PubMed',
    detail: 'Conectando con la base de datos más grande de investigación médica...',
    duration: 0, // 0-8s (0-13%)
  },
  {
    icon: '📚',
    message: 'Analizando estudios clínicos',
    detail: 'Revisando ensayos controlados aleatorios y meta-análisis...',
    duration: 8000, // 8-20s (13-33%)
  },
  {
    icon: '🧠',
    message: 'Extrayendo información científica',
    detail: 'Procesando dosificaciones, efectividad y seguridad...',
    duration: 20000, // 20-40s (33-67%)
  },
  {
    icon: '⚡',
    message: 'Generando recomendaciones personalizadas',
    detail: 'Adaptando la información a tu perfil...',
    duration: 40000, // 40-55s (67-92%)
  },
  {
    icon: '✅',
    message: 'Finalizando',
    detail: 'Preparando los resultados finales...',
    duration: 55000, // 55-60s (92-100%)
  },
];

export default function IntelligentLoadingSpinner({ supplementName }: IntelligentLoadingSpinnerProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();

    // Update progress bar smoothly - reaches 95% at 45 seconds, then slows down
    // This prevents the bar from getting stuck at 60-70% when response arrives
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      // Fast progress to 95% in 45 seconds, then slow crawl to 99%
      let newProgress;
      if (elapsed < 45000) {
        // 0-45s: Linear progress to 95%
        newProgress = (elapsed / 45000) * 95;
      } else {
        // 45s+: Slow crawl from 95% to 99% (never reaches 100% until actual completion)
        const extraTime = elapsed - 45000;
        newProgress = 95 + Math.min((extraTime / 30000) * 4, 4); // Max 99%
      }
      
      setProgress(Math.min(newProgress, 99)); // Cap at 99% until real completion
    }, 100);

    // Update stages based on time
    const checkStage = () => {
      const elapsed = Date.now() - startTime;

      for (let i = LOADING_STAGES.length - 1; i >= 0; i--) {
        if (elapsed >= LOADING_STAGES[i].duration) {
          setCurrentStage(i);
          break;
        }
      }
    };

    const stageInterval = setInterval(checkStage, 500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stageInterval);
    };
  }, []);

  const stage = LOADING_STAGES[currentStage];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4" data-testid="loading-spinner">
      <div className="w-full max-w-md">
        {/* Card con animación */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-gray-100">
          {/* Icon animado */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 animate-ping"></div>
              <div className="relative text-6xl animate-bounce">
                {stage.icon}
              </div>
            </div>
          </div>

          {/* Supplement name */}
          {supplementName && (
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Analizando</p>
              <h3 className="text-xl font-bold text-gray-900">{supplementName}</h3>
            </div>
          )}

          {/* Main message */}
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">
              {stage.message}
            </h2>
            <p className="text-sm text-gray-600">
              {stage.detail}
            </p>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 text-center">
              {Math.round(progress)}% completado
            </p>
          </div>

          {/* Stage indicators */}
          <div className="flex justify-between items-center pt-2">
            {LOADING_STAGES.map((s, index) => (
              <div
                key={index}
                className={`flex flex-col items-center transition-all duration-300 ${
                  index <= currentStage ? 'opacity-100' : 'opacity-30'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-300 ${
                    index === currentStage
                      ? 'bg-blue-500 text-white scale-110 shadow-lg'
                      : index < currentStage
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {index < currentStage ? '✓' : s.icon}
                </div>
              </div>
            ))}
          </div>

          {/* Info footer */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-start gap-2 text-xs text-gray-500">
              <div className="mt-0.5">💡</div>
              <p>
                Estamos analizando estudios científicos reales de PubMed.
                Este proceso puede tomar 30-60 segundos para garantizar
                información precisa y verificable.
              </p>
            </div>
          </div>
        </div>

        {/* Fun facts mientras esperan */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 italic">
            {currentStage === 0 && '¿Sabías que PubMed contiene más de 35 millones de estudios científicos?'}
            {currentStage === 1 && '¿Sabías que los ensayos controlados aleatorios son el estándar de oro en investigación?'}
            {currentStage === 2 && '¿Sabías que validamos toda la información con fuentes científicas verificables?'}
            {currentStage === 3 && 'Cada recomendación está respaldada por evidencia científica real.'}
            {currentStage === 4 && '¡Ya casi terminamos de procesar toda la información!'}
          </p>
        </div>
      </div>
    </div>
  );
}
