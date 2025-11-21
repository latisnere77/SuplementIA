/**
 * Prompt templates for Bedrock (Claude)
 */

import { PubMedStudy } from './types';

export const ENRICHMENT_PROMPT_TEMPLATE = `Actúa como experto en farmacología y nutrición basada en evidencia, especializado en análisis tipo Examine.com.

Analiza el suplemento "{supplementName}" y genera un reporte CONCISO pero COMPLETO basado en evidencia científica peer-reviewed.

CONTEXTO:
- Suplemento: {supplementName}
- Categoría: {category}
- Audiencia: Personas en LATAM buscando información confiable
- Objetivo: Información precisa, práctica y basada en evidencia

{studiesContext}

INSTRUCCIONES:
1. Basate SOLO en evidencia científica (RCTs, meta-análisis, revisiones sistemáticas)
2. Incluye NÚMEROS y PORCENTAJES cuando estén disponibles
3. Para "worksFor": effect size, metodología, grado de evidencia
4. NO inventes datos o estudios
5. Sé CONCISO pero preciso - incluye lo esencial sin repetir
6. Prioriza meta-análisis y RCTs
7. Dosis prácticas con rangos específicos
8. Efectos secundarios con frecuencia estimada
9. {studiesInstruction}

IMPORTANTE: Genera respuestas CONCISAS. Evita repetición. Prioriza calidad sobre cantidad de texto.

ESTRUCTURA JSON (responde SOLO con JSON válido, sin markdown):

{
  "whatIsIt": "Descripción en 2-3 oraciones: qué es, origen, mecanismo principal.",

  "primaryUses": [
    "Uso principal 1 con NÚMEROS (ej: Reducir estrés y ansiedad - reduce cortisol 27.9% en promedio)",
    "Uso principal 2 con DATOS ESPECÍFICOS",
    "Uso principal 3 con EVIDENCIA CUANTITATIVA"
  ],

  "mechanisms": [
    {
      "name": "Nombre específico del mecanismo (ej: Modulación de receptores GABA-A, Inhibición de 5-alfa-reductasa)",
      "description": "Explicación clara de cómo funciona a nivel molecular/celular. Incluye receptores, enzimas, vías principales.",
      "evidenceLevel": "strong|moderate|weak|preliminary",
      "studyCount": número_estimado_de_estudios_que_respaldan_este_mecanismo
    }
  ],

  "worksFor": [
    {
      "condition": "Condición o beneficio específico (ej: Aumento de fuerza muscular en entrenamiento de resistencia)",
      "evidenceGrade": "A|B|C|D",
      "effectSize": "Very Large|Large|Moderate|Small|Minimal",
      "magnitude": "Descripción numérica del efecto (ej: Aumenta 8-15% en fuerza máxima, Reduce 25-30% en tiempo de recuperación)",
      "studyCount": número_total_de_estudios,
      "rctCount": número_de_RCTs,
      "metaAnalysis": true|false,
      "totalParticipants": número_total_aproximado_de_participantes_en_todos_los_estudios,
      "notes": "Detalles clave: dosis exacta (ej: 3-5g/día), duración para ver efectos (ej: 4-8 semanas), población estudiada (ej: adultos 18-65 años), magnitud con números (ej: reducción 27% cortisol), contexto relevante"
    }
  ],

  "doesntWorkFor": [
    {
      "condition": "Condición para la que NO hay evidencia suficiente o la evidencia es negativa",
      "evidenceGrade": "D|F",
      "studyCount": número_de_estudios_que_no_mostraron_efecto,
      "notes": "Por qué no funciona con datos (ej: 8 RCTs sin diferencia vs placebo, p>0.05)"
    }
  ],

  "limitedEvidence": [
    {
      "condition": "Condición con evidencia preliminar prometedora pero insuficiente",
      "evidenceGrade": "C",
      "studyCount": número_de_estudios_preliminares,
      "notes": "Qué falta (ej: Solo 3 estudios pequeños (n<50), se necesitan RCTs grandes, población diversa)"
    }
  ],

  "dosage": {
    "standard": "Rango de dosis según evidencia con unidades exactas (ej: 300-600mg/día de extracto estandarizado, 3-5g/día de monohidrato)",
    "effectiveDose": "Dosis mínima efectiva (ej: 300mg/día para efectos ansiolíticos)",
    "optimalDose": "Dosis óptima según meta-análisis (ej: 500mg/día mostró mejores resultados)",
    "maxSafeDose": "Dosis máxima segura (ej: Hasta 1200mg/día sin efectos adversos significativos)",
    "timing": "Cuándo tomar para mejor eficacia (ej: Mañana con desayuno para mejor absorción, Noche antes de dormir, Timing no crítico según estudios)",
    "duration": "Duración para ver efectos (ej: Efectos iniciales en 2-4 semanas, efectos completos en 8-12 semanas, uso continuo seguro hasta 6 meses)",
    "forms": [
      {
        "form": "Nombre exacto de la forma (ej: KSM-66®, Sensoril®, Extracto acuoso 10:1, Monohidrato micronizado)",
        "description": "Por qué es relevante con datos (ej: Estandarizado al 5% withanólidos, usado en 78% de estudios, biodisponibilidad 40% mayor)",
        "recommended": true|false,
        "studyCount": número_de_estudios_con_esta_forma
      }
    ],
    "stacksWith": [
      "Suplemento con sinergia documentada (incluye razón breve, ej: L-Teanina - potencia efectos calmantes sin sedación)"
    ],
    "notes": "Consideraciones sobre dosificación (ej: Tomar con grasas aumenta absorción 30%, dividir dosis mejora tolerancia, ciclado no necesario)"
  },

  "safety": {
    "overallRating": "Generally Safe|Caution Required|Insufficient Data",
    "safetyScore": "Puntuación 1-10 basada en evidencia (10 = extremadamente seguro)",
    "sideEffects": [
      {
        "effect": "Efecto secundario específico (ej: Malestar gastrointestinal leve, Somnolencia diurna)",
        "frequency": "Porcentaje o descripción cuantitativa (ej: 10-15% de usuarios, Raro <1%, Común en dosis >600mg)",
        "severity": "Mild|Moderate|Severe",
        "notes": "Contexto (ej: Solo en dosis >600mg/día, Desaparece después de 1-2 semanas, Más común con estómago vacío)"
      }
    ],
    "contraindications": [
      "Embarazo y lactancia (falta evidencia de seguridad)",
      "Condición médica específica con razón (ej: Hipotiroidismo - puede reducir TSH)",
      "Uso de medicamento específico (ej: Sedantes benzodiacepínicos - efecto aditivo)"
    ],
    "interactions": [
      {
        "medication": "Tipo o nombre específico de medicamento (ej: Benzodiazepinas, Warfarina, Inhibidores bomba protones)",
        "severity": "Mild|Moderate|Severe",
        "mechanism": "Cómo ocurre la interacción (ej: Potenciación efectos GABAérgicos, Inhibición CYP3A4)",
        "description": "Riesgo con recomendación (ej: Puede potenciar sedación. Reducir dosis de sedante o evitar combinación. Consultar médico.)"
      }
    ],
    "longTermSafety": "Datos de seguridad a largo plazo con duración (ej: Uso continuo seguro hasta 6 meses en RCTs, Estudios 12+ meses con perfil favorable)",
    "pregnancyCategory": "Avoid|Caution|Insufficient Data",
    "notes": "Notas de seguridad (ej: No reportes de toxicidad hepática en estudios clínicos, Perfil de seguridad superior a medicamentos ansiolíticos)"
  },

  "keyStudies": [
    {
      "pmid": "ID de PubMed exacto (solo si conoces con certeza, sino omite)",
      "title": "Título completo del estudio",
      "year": año_del_estudio,
      "studyType": "RCT|Meta-analysis|Systematic Review|Observational",
      "participants": número_exacto_de_participantes,
      "duration": "Duración del estudio (ej: 8 semanas, 6 meses)",
      "dose": "Dosis utilizada en el estudio",
      "findings": [
        "Hallazgo clave 1 con datos numéricos (ej: Reducción 27.9% en cortisol vs placebo, p<0.001)",
        "Hallazgo clave 2 con estadísticas (ej: Aumento 15% en fuerza máxima, IC 95%: 12-18%)"
      ],
      "quality": "High|Moderate|Low (basado en diseño, tamaño muestral, metodología)"
    }
  ],

  "practicalRecommendations": [
    "Recomendación práctica 1 basada en evidencia (ej: Comenzar con dosis baja (300mg) y aumentar gradualmente)",
    "Recomendación práctica 2 (ej: Tomar consistentemente a la misma hora para mejores resultados)",
    "Recomendación práctica 3 (ej: Esperar mínimo 4-6 semanas antes de evaluar eficacia)"
  ]
}

GUÍA DE EVIDENCE GRADES (Sé estricto):
- Grade A: Múltiples RCTs de alta calidad (n>100 cada uno) + meta-análisis, efecto consistente y grande
- Grade B: Varios RCTs (n>50) con resultados mayormente positivos, efecto moderado
- Grade C: Pocos RCTs o evidencia preliminar, efecto pequeño o inconsistente
- Grade D: Sin evidencia robusta, solo estudios observacionales o in vitro
- Grade F: Evidencia negativa - estudios muestran NO efecto

GUÍA DE EFFECT SIZE (Sé preciso):
- Very Large: >50% de mejora, Cohen's d >1.2, efecto clínicamente muy significativo
- Large: 30-50% de mejora, Cohen's d 0.8-1.2, efecto clínicamente significativo
- Moderate: 15-30% de mejora, Cohen's d 0.5-0.8, efecto notable
- Small: 5-15% de mejora, Cohen's d 0.2-0.5, efecto detectable
- Minimal: <5% de mejora, Cohen's d <0.2, efecto marginal

GUÍA DE EVIDENCE LEVELS (mechanisms):
- strong: Mecanismo bien establecido con múltiples estudios in vitro, in vivo, y humanos. Consenso científico.
- moderate: Mecanismo propuesto con evidencia parcial en humanos, respaldado por estudios preclínicos
- weak: Mecanismo teórico con evidencia limitada, principalmente estudios in vitro
- preliminary: Hipótesis sin confirmación robusta, especulativo

IMPORTANTE - CALIDAD SOBRE CANTIDAD:
- Si no conoces con certeza un PMID, OMITE ese campo
- Si no hay suficientes estudios para "keyStudies", devuelve array vacío []
- Si algo no está documentado, mejor OMITIR que inventar
- Redondea studyCount a números realistas (si hay poca evidencia, pon 1-3, no 0)
- Prioriza números y datos específicos en todas las descripciones
- Incluye rangos cuando sea apropiado (ej: "8-15%", "300-600mg")

RECUERDA: Este análisis será usado por personas para tomar decisiones de salud. Sé preciso y honesto.

Responde ÚNICAMENTE con el JSON, sin texto antes o después, sin markdown code blocks.`;

/**
 * Build studies context from real PubMed data
 */
function buildStudiesContext(studies: PubMedStudy[]): string {
  if (!studies || studies.length === 0) {
    return '';
  }

  const studiesText = studies.map((study, idx) => {
    const participantsText = study.participants ? ` | Participantes: ${study.participants}` : '';
    const journalText = study.journal ? ` | Journal: ${study.journal}` : '';

    return `
ESTUDIO ${idx + 1}:
Título: ${study.title}
Tipo: ${study.studyType || 'No especificado'}
Año: ${study.year}
PMID: ${study.pmid}${participantsText}${journalText}
Autores: ${study.authors.slice(0, 3).join(', ')}${study.authors.length > 3 ? ' et al.' : ''}

Abstract:
${study.abstract.substring(0, 1000)}${study.abstract.length > 1000 ? '...' : ''}

URL: ${study.pubmedUrl}
`;
  }).join('\n---\n');

  return `
ESTUDIOS CIENTÍFICOS REALES DE PUBMED (${studies.length} estudios):

Tienes acceso a ${studies.length} estudios científicos REALES y VERIFICABLES desde PubMed.
Usa ÚNICAMENTE estos estudios como base para tu análisis.

${studiesText}
`;
}

/**
 * Build prompt with supplement-specific data and optional studies
 */
export function buildEnrichmentPrompt(
  supplementName: string,
  category: string = 'general',
  studies?: PubMedStudy[]
): string {
  const hasStudies = studies && studies.length > 0;

  const studiesContext = hasStudies
    ? buildStudiesContext(studies!)
    : 'NOTA: No se proporcionaron estudios específicos de PubMed. Usa tu conocimiento general basado en la literatura científica publicada.';

  const studiesInstruction = hasStudies
    ? `IMPORTANTE: Tienes ${studies!.length} estudios reales de PubMed arriba. DEBES basar tu análisis ÚNICAMENTE en estos estudios. Cita los PMIDs en keyStudies.`
    : 'Usa tu conocimiento de la literatura científica, pero sé conservador en tus afirmaciones.';

  return ENRICHMENT_PROMPT_TEMPLATE
    .replace(/{supplementName}/g, supplementName)
    .replace(/{category}/g, category)
    .replace(/{studiesContext}/g, studiesContext)
    .replace(/{studiesInstruction}/g, studiesInstruction);
}

/**
 * Validate enriched content structure
 */
export function validateEnrichedContent(data: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  const requiredFields = [
    'whatIsIt',
    'primaryUses',
    'mechanisms',
    'worksFor',
    'dosage',
    'safety',
  ];

  for (const field of requiredFields) {
    if (!(field in data)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate types
  if (data.primaryUses && !Array.isArray(data.primaryUses)) {
    errors.push('primaryUses must be an array');
  }

  if (data.mechanisms && !Array.isArray(data.mechanisms)) {
    errors.push('mechanisms must be an array');
  }

  if (data.worksFor && !Array.isArray(data.worksFor)) {
    errors.push('worksFor must be an array');
  }

  // Validate dosage structure
  if (data.dosage) {
    const dosageRequired = ['standard', 'timing', 'duration'];
    for (const field of dosageRequired) {
      if (!(field in data.dosage)) {
        errors.push(`dosage.${field} is required`);
      }
    }
  }

  // Validate safety structure
  if (data.safety) {
    if (!('overallRating' in data.safety)) {
      errors.push('safety.overallRating is required');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
