'use client';

import { useState } from 'react';

export default function LegalDisclaimer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if user dismissed it
  if (isDismissed) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 bg-yellow-50 border-b-2 border-yellow-200 shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
              ⚠
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Collapsed view */}
            {!isExpanded && (
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-yellow-900 font-medium">
                  <span className="font-bold">Importante:</span> Esta información es solo para fines educativos y no constituye consejo médico.
                </p>
                <button
                  onClick={() => setIsExpanded(true)}
                  className="flex-shrink-0 text-xs text-yellow-700 hover:text-yellow-900 font-semibold underline whitespace-nowrap min-h-[44px] min-w-[44px] px-2 py-3 flex items-center justify-center"
                >
                  Leer más
                </button>
              </div>
            )}

            {/* Expanded view */}
            {isExpanded && (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-base font-bold text-yellow-900">
                    ⚠️ Aviso Legal Importante
                  </h3>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="flex-shrink-0 text-yellow-700 hover:text-yellow-900 transition-colors"
                    aria-label="Cerrar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="text-sm text-yellow-900 space-y-2">
                  <p>
                    La información proporcionada en este sitio es <strong>solo para fines educativos e informativos</strong> y no debe considerarse como consejo médico, diagnóstico o tratamiento.
                  </p>

                  <p className="font-semibold">Antes de tomar cualquier suplemento, debes consultar con un profesional de salud calificado, especialmente si:</p>

                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Estás embarazada, amamantando o planeas quedar embarazada</li>
                    <li>Estás tomando medicamentos recetados o de venta libre</li>
                    <li>Tienes condiciones médicas preexistentes</li>
                    <li>Eres menor de 18 años o mayor de 65 años</li>
                    <li>Has tenido reacciones adversas a suplementos en el pasado</li>
                  </ul>

                  <p className="text-xs pt-2 border-t border-yellow-300">
                    <strong>Fuente de información:</strong> Los estudios y datos presentados provienen de bases de datos de investigación biomédica globales y verificables. Sin embargo, la interpretación de estos estudios no reemplaza el juicio clínico de un profesional de salud.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setIsExpanded(false);
                      setIsDismissed(true);
                      // Save to localStorage
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('disclaimer_dismissed', Date.now().toString());
                      }
                    }}
                    className="text-xs bg-yellow-200 hover:bg-yellow-300 text-yellow-900 px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Entendido, no mostrar de nuevo
                  </button>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="text-xs text-yellow-700 hover:text-yellow-900 font-semibold underline"
                  >
                    Minimizar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
