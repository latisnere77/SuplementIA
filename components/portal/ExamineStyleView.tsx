/**
 * Examine.com-style Content Renderer
 * 
 * Displays quantitative, data-driven supplement analysis
 * Focus: Precise numbers, effect magnitudes, evidence counts
 */

'use client';

import { TrendingUp, TrendingDown, Minus, AlertCircle, Pill, Shield } from 'lucide-react';

interface ExamineStyleContent {
  overview: {
    whatIsIt: string;
    functions: string[];
    sources: string[];
  };
  benefitsByCondition: BenefitByCondition[];
  dosage: ExamineDosage;
  safety: ExamineSafety;
  mechanisms?: ExamineMechanism[];
}

interface BenefitByCondition {
  condition: string;
  effect: 'Small' | 'Moderate' | 'Large' | 'No effect';
  quantitativeData: string;
  evidence: string;
  context?: string;
  studyTypes: string[];
}

interface ExamineDosage {
  effectiveDose: string;
  commonDose: string;
  timing: string;
  forms: Array<{
    name: string;
    bioavailability?: string;
    notes?: string;
  }>;
  notes?: string;
}

interface ExamineSafety {
  sideEffects: {
    common: string[];
    rare: string[];
    severity: string;
  };
  interactions: {
    medications: Array<{
      medication: string;
      severity: 'Mild' | 'Moderate' | 'Severe';
      description: string;
    }>;
  };
  contraindications: string[];
  pregnancyLactation?: string;
}

interface ExamineMechanism {
  name: string;
  description: string;
  evidenceLevel: 'strong' | 'moderate' | 'weak';
}

interface ExamineStyleViewProps {
  content: ExamineStyleContent;
  supplementName?: string;
}

/**
 * Get effect icon and color based on magnitude
 */
function getEffectDisplay(effect: string) {
  switch (effect) {
    case 'Large':
      return {
        icon: TrendingUp,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-300',
        label: 'Efecto Grande',
      };
    case 'Moderate':
      return {
        icon: TrendingUp,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-300',
        label: 'Efecto Moderado',
      };
    case 'Small':
      return {
        icon: TrendingUp,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-300',
        label: 'Efecto Pequeño',
      };
    case 'No effect':
      return {
        icon: Minus,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-300',
        label: 'Sin Efecto',
      };
    default:
      return {
        icon: AlertCircle,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-300',
        label: 'Desconocido',
      };
  }
}

/**
 * Get severity color
 */
function getSeverityColor(severity: string) {
  switch (severity) {
    case 'Severe':
      return 'text-red-600 bg-red-50 border-red-300';
    case 'Moderate':
      return 'text-orange-600 bg-orange-50 border-orange-300';
    case 'Mild':
      return 'text-yellow-600 bg-yellow-50 border-yellow-300';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-300';
  }
}

export default function ExamineStyleView({
  content,
  supplementName,
}: ExamineStyleViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border-2 border-gray-200 p-8 shadow-lg">
        {supplementName && (
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {supplementName}
          </h1>
        )}
        
        {/* Overview */}
        <div className="bg-white rounded-xl p-6 border-2 border-gray-200 space-y-4">
          <h3 className="text-lg font-bold text-gray-900">¿Qué es?</h3>
          <p className="text-xl text-gray-700 leading-relaxed">
            {content.overview.whatIsIt}
          </p>
          
          {/* Functions */}
          {content.overview.functions && content.overview.functions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Funciones:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                {content.overview.functions.map((func, idx) => (
                  <li key={idx}>{func}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Sources */}
          {content.overview.sources && content.overview.sources.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Fuentes:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                {content.overview.sources.map((source, idx) => (
                  <li key={idx}>{source}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Benefits by Condition */}
      {content.benefitsByCondition && content.benefitsByCondition.length > 0 && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Beneficios por Condición
          </h2>
          <div className="space-y-4">
            {content.benefitsByCondition.map((benefit, idx) => {
              const display = getEffectDisplay(benefit.effect);
              const Icon = display.icon;
              
              return (
                <div
                  key={idx}
                  className={`border-2 rounded-lg p-5 ${display.bgColor} ${display.borderColor}`}
                >
                  {/* Condition + Effect */}
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-900">
                      {benefit.condition}
                    </h3>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${display.color} font-semibold text-sm`}>
                      <Icon className="h-4 w-4" />
                      {display.label}
                    </div>
                  </div>
                  
                  {/* Quantitative Data */}
                  <div className="mb-3">
                    <p className="text-lg font-semibold text-gray-800">
                      {benefit.quantitativeData}
                    </p>
                  </div>
                  
                  {/* Evidence */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <span className="font-semibold">Evidencia:</span>
                    <span>{benefit.evidence}</span>
                  </div>
                  
                  {/* Study Types */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {benefit.studyTypes.map((type, typeIdx) => (
                      <span
                        key={typeIdx}
                        className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                  
                  {/* Context */}
                  {benefit.context && (
                    <div className="bg-white border border-gray-300 rounded-lg p-3 text-sm text-gray-700">
                      <span className="font-semibold">Contexto:</span> {benefit.context}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dosage */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Pill className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">
            Dosificación
          </h2>
        </div>
        
        <div className="space-y-4">
          {/* Effective Dose */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">
              Dosis Efectiva
            </h4>
            <p className="text-lg text-blue-800">
              {content.dosage.effectiveDose}
            </p>
          </div>
          
          {/* Common Dose */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-green-900 mb-2">
              Dosis Común
            </h4>
            <p className="text-lg text-green-800">
              {content.dosage.commonDose}
            </p>
          </div>
          
          {/* Timing */}
          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-purple-900 mb-2">
              Momento de Toma
            </h4>
            <p className="text-lg text-purple-800">
              {content.dosage.timing}
            </p>
          </div>
          
          {/* Forms */}
          {content.dosage.forms && content.dosage.forms.length > 0 && (
            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Formas Disponibles
              </h4>
              <div className="space-y-3">
                {content.dosage.forms.map((form, idx) => (
                  <div key={idx} className="bg-white border border-gray-300 rounded p-3">
                    <div className="font-semibold text-gray-900">{form.name}</div>
                    {form.bioavailability && (
                      <div className="text-sm text-gray-600 mt-1">
                        Biodisponibilidad: {form.bioavailability}
                      </div>
                    )}
                    {form.notes && (
                      <div className="text-sm text-gray-600 mt-1">
                        {form.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Notes */}
          {content.dosage.notes && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-900">
                <strong>Nota:</strong> {content.dosage.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Safety */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900">
            Seguridad
          </h2>
        </div>
        
        <div className="space-y-6">
          {/* Side Effects */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Efectos Secundarios
            </h3>
            <div className="space-y-3">
              {content.safety.sideEffects.common.length > 0 && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-yellow-900 mb-2">
                    Comunes
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-yellow-800">
                    {content.safety.sideEffects.common.map((effect, idx) => (
                      <li key={idx}>{effect}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {content.safety.sideEffects.rare.length > 0 && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">
                    Raros
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    {content.safety.sideEffects.rare.map((effect, idx) => (
                      <li key={idx}>{effect}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="text-sm text-gray-600">
                <strong>Severidad:</strong> {content.safety.sideEffects.severity}
              </div>
            </div>
          </div>
          
          {/* Interactions */}
          {content.safety.interactions.medications.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Interacciones con Medicamentos
              </h3>
              <div className="space-y-2">
                {content.safety.interactions.medications.map((interaction, idx) => (
                  <div
                    key={idx}
                    className={`border-2 rounded-lg p-4 ${getSeverityColor(interaction.severity)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{interaction.medication}</span>
                      <span className="text-xs font-bold px-2 py-1 rounded">
                        {interaction.severity}
                      </span>
                    </div>
                    <p className="text-sm">{interaction.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Contraindications */}
          {content.safety.contraindications.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Contraindicaciones
              </h3>
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <ul className="list-disc list-inside space-y-1 text-red-800">
                  {content.safety.contraindications.map((contra, idx) => (
                    <li key={idx}>{contra}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {/* Pregnancy/Lactation */}
          {content.safety.pregnancyLactation && (
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-purple-900 mb-2">
                Embarazo y Lactancia
              </h4>
              <p className="text-purple-800">
                {content.safety.pregnancyLactation}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mechanisms */}
      {content.mechanisms && content.mechanisms.length > 0 && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Mecanismos de Acción
          </h2>
          <div className="space-y-4">
            {content.mechanisms.map((mechanism, idx) => (
              <div
                key={idx}
                className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {mechanism.name}
                  </h3>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      mechanism.evidenceLevel === 'strong'
                        ? 'bg-green-100 text-green-800'
                        : mechanism.evidenceLevel === 'moderate'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {mechanism.evidenceLevel === 'strong' ? 'Fuerte' : 
                     mechanism.evidenceLevel === 'moderate' ? 'Moderado' : 'Débil'}
                  </span>
                </div>
                <p className="text-gray-700">{mechanism.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
