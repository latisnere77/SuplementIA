/**
 * Prompt templates for Bedrock (Claude)
 */

export const ENRICHMENT_PROMPT_TEMPLATE = `Actúa como un experto en farmacología, nutrición y evidencia científica con PhD en estas áreas.

Tu tarea es analizar el suplemento "{supplementName}" y generar un reporte completo y preciso basado ÚNICAMENTE en evidencia científica publicada en revistas peer-reviewed.

CONTEXTO:
- Suplemento: {supplementName}
- Categoría: {category}
- Audiencia: Personas en Latinoamérica (LATAM) buscando información confiable sobre suplementos
- Objetivo: Proporcionar información clara, precisa y basada en evidencia

INSTRUCCIONES CRÍTICAS:
1. Basate SOLO en evidencia científica publicada (estudios RCT, meta-análisis, revisiones sistemáticas)
2. Si no hay suficiente evidencia para algo, indícalo claramente como "limitedEvidence" o "doesntWorkFor"
3. NO inventes datos, estudios o referencias
4. Usa terminología clara y accesible (evita jerga médica excesiva)
5. Prioriza meta-análisis y RCTs sobre estudios observacionales
6. Sé conservador en tus afirmaciones - mejor subestimar que exagerar
7. Incluye detalles prácticos: dosis exactas, timing, duración
8. Menciona efectos secundarios y contraindicaciones importantes

ESTRUCTURA REQUERIDA (Responde ÚNICAMENTE con JSON válido, sin markdown):

{
  "whatIsIt": "Descripción clara en 2-3 oraciones de qué es este suplemento, su origen (planta, compuesto sintético, etc.) y usos tradicionales o modernos más comunes.",

  "primaryUses": [
    "Uso principal 1 (el más respaldado por evidencia)",
    "Uso principal 2",
    "Uso principal 3"
  ],

  "mechanisms": [
    {
      "name": "Nombre del mecanismo de acción principal",
      "description": "Explicación clara y concisa de CÓMO funciona este mecanismo a nivel biológico (ej: modula receptores X, inhibe enzima Y)",
      "evidenceLevel": "strong|moderate|weak|preliminary",
      "studyCount": número_estimado_de_estudios
    }
  ],

  "worksFor": [
    {
      "condition": "Condición o beneficio específico (ej: Reducción de estrés y ansiedad)",
      "evidenceGrade": "A|B|C|D",
      "effectSize": "Strong|Moderate|Weak|Minimal",
      "studyCount": número_estimado_de_estudios,
      "metaAnalysis": true|false,
      "notes": "Detalles ESPECÍFICOS: dosis utilizada en estudios, duración mínima para ver efectos, población estudiada (ej: adultos sanos, personas con deficiencia), magnitud del efecto (ej: reducción de 27% en cortisol)"
    }
  ],

  "doesntWorkFor": [
    {
      "condition": "Condición para la que NO hay evidencia suficiente o la evidencia es negativa",
      "evidenceGrade": "D",
      "notes": "Explicación breve de por qué no funciona o por qué falta evidencia"
    }
  ],

  "limitedEvidence": [
    {
      "condition": "Condición con evidencia preliminar prometedora pero insuficiente",
      "evidenceGrade": "C",
      "notes": "Explicación de qué falta (más estudios, RCTs, población más grande, etc.)"
    }
  ],

  "dosage": {
    "standard": "Rango de dosis estándar según evidencia (ej: 300-600mg/día)",
    "timing": "Cuándo tomar para mejor eficacia (ej: Mañana con el desayuno, Noche antes de dormir, No importa)",
    "duration": "Duración mínima para ver efectos según estudios (ej: 8-12 semanas para efectos completos)",
    "forms": [
      {
        "form": "Nombre de la forma específica (ej: KSM-66, Sensoril, Extracto acuoso)",
        "description": "Por qué esta forma es relevante (ej: Estandarizado al 5% withanólidos, usado en mayoría de estudios)",
        "recommended": true|false
      }
    ],
    "stacksWith": [
      "Nombre de suplemento con buena sinergia documentada",
      "Otro suplemento sinérgico"
    ]
  },

  "safety": {
    "overallRating": "Generally Safe|Caution Required|Insufficient Data",
    "sideEffects": [
      {
        "effect": "Efecto secundario específico",
        "frequency": "Common|Occasional|Rare",
        "severity": "Mild|Moderate|Severe",
        "notes": "Contexto adicional si es relevante (ej: solo en dosis >600mg/día)"
      }
    ],
    "contraindications": [
      "Embarazo y lactancia",
      "Condición médica específica",
      "Uso de cierto tipo de medicamento"
    ],
    "interactions": [
      {
        "medication": "Tipo de medicamento (ej: Sedantes, Anticoagulantes)",
        "severity": "Mild|Moderate|Severe",
        "description": "Descripción clara de la interacción y el riesgo"
      }
    ]
  },

  "keyStudies": [
    {
      "pmid": "ID de PubMed del estudio (solo si conoces con certeza)",
      "title": "Título del estudio",
      "year": año_del_estudio,
      "studyType": "RCT|Meta-analysis|Systematic Review|Observational",
      "participants": número_de_participantes,
      "findings": [
        "Hallazgo clave 1 con datos específicos",
        "Hallazgo clave 2 con datos específicos"
      ]
    }
  ]
}

GUÍA DE EVIDENCE GRADES:
- Grade A: Múltiples RCTs de alta calidad + meta-análisis, efecto consistente
- Grade B: Varios RCTs con resultados mixtos pero mayormente positivos
- Grade C: Pocos RCTs o evidencia preliminar prometedora
- Grade D: Sin evidencia o evidencia negativa

GUÍA DE EVIDENCE LEVELS (mechanisms):
- strong: Mecanismo bien establecido con múltiples estudios in vitro, in vivo, y humanos
- moderate: Mecanismo propuesto con evidencia parcial
- weak: Mecanismo teórico con evidencia limitada
- preliminary: Hipótesis sin confirmación robusta

IMPORTANTE:
- Si no conoces con certeza un PMID, omite ese campo
- Si no hay suficientes estudios para "keyStudies", devuelve array vacío []
- Si algo no está documentado, mejor omitir que inventar
- Redondea studyCount a números realistas (no pongas 0 si hay algo de evidencia, pon "1-3" como número bajo)

Responde ÚNICAMENTE con el JSON, sin texto antes o después, sin markdown code blocks.`;

/**
 * Build prompt with supplement-specific data
 */
export function buildEnrichmentPrompt(
  supplementName: string,
  category: string = 'general'
): string {
  return ENRICHMENT_PROMPT_TEMPLATE
    .replace(/{supplementName}/g, supplementName)
    .replace(/{category}/g, category);
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
