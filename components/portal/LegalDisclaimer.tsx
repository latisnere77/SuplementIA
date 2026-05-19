'use client';

import { useState } from 'react';

interface LegalDisclaimerProps {
  language?: 'en' | 'es';
}

export default function LegalDisclaimer({ language = 'es' }: LegalDisclaimerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const labels = language === 'en'
    ? {
      important: 'Important:',
      short: 'This information is for educational purposes only and does not constitute medical advice.',
      readMore: 'Read more',
      title: 'Important Legal Notice',
      close: 'Close',
      body1: 'The information provided on this site is for educational and informational purposes only and should not be considered medical advice, diagnosis, or treatment.',
      before: 'Before taking any supplement, consult a qualified health professional, especially if:',
      pregnant: 'You are pregnant, breastfeeding, or planning pregnancy',
      medications: 'You are taking prescription or over-the-counter medications',
      conditions: 'You have pre-existing medical conditions',
      age: 'You are under 18 or over 65',
      reactions: 'You have had adverse reactions to supplements in the past',
      sourceTitle: 'Information source:',
      source: 'The studies and data presented come from global, verifiable biomedical research databases. However, interpretation of these studies does not replace clinical judgment from a health professional.',
      dismiss: 'Got it, do not show again',
      minimize: 'Minimize',
    }
    : {
      important: 'Importante:',
      short: 'Esta información es solo para fines educativos y no constituye consejo médico.',
      readMore: 'Leer más',
      title: 'Aviso Legal Importante',
      close: 'Cerrar',
      body1: 'La información proporcionada en este sitio es solo para fines educativos e informativos y no debe considerarse como consejo médico, diagnóstico o tratamiento.',
      before: 'Antes de tomar cualquier suplemento, debes consultar con un profesional de salud calificado, especialmente si:',
      pregnant: 'Estás embarazada, amamantando o planeas quedar embarazada',
      medications: 'Estás tomando medicamentos recetados o de venta libre',
      conditions: 'Tienes condiciones médicas preexistentes',
      age: 'Eres menor de 18 años o mayor de 65 años',
      reactions: 'Has tenido reacciones adversas a suplementos en el pasado',
      sourceTitle: 'Fuente de información:',
      source: 'Los estudios y datos presentados provienen de bases de datos de investigación biomédica globales y verificables. Sin embargo, la interpretación de estos estudios no reemplaza el juicio clínico de un profesional de salud.',
      dismiss: 'Entendido, no mostrar de nuevo',
      minimize: 'Minimizar',
    };

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
                  <span className="font-bold">{labels.important}</span> {labels.short}
                </p>
                <button
                  onClick={() => setIsExpanded(true)}
                  className="flex-shrink-0 text-xs text-yellow-700 hover:text-yellow-900 font-semibold underline whitespace-nowrap min-h-[44px] min-w-[44px] px-2 py-3 flex items-center justify-center"
                >
                  {labels.readMore}
                </button>
              </div>
            )}

            {/* Expanded view */}
            {isExpanded && (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-base font-bold text-yellow-900">
                    ⚠️ {labels.title}
                  </h3>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="flex-shrink-0 text-yellow-700 hover:text-yellow-900 transition-colors"
                    aria-label={labels.close}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="text-sm text-yellow-900 space-y-2">
                  <p>
                    {labels.body1}
                  </p>

                  <p className="font-semibold">{labels.before}</p>

                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>{labels.pregnant}</li>
                    <li>{labels.medications}</li>
                    <li>{labels.conditions}</li>
                    <li>{labels.age}</li>
                    <li>{labels.reactions}</li>
                  </ul>

                  <p className="text-xs pt-2 border-t border-yellow-300">
                    <strong>{labels.sourceTitle}</strong> {labels.source}
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
                    {labels.dismiss}
                  </button>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="text-xs text-yellow-700 hover:text-yellow-900 font-semibold underline"
                  >
                    {labels.minimize}
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
