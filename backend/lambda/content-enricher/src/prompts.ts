/**
 * Prompt templates for Bedrock (Claude)
 */

import { PubMedStudy } from './types';

export const ENRICHMENT_PROMPT_TEMPLATE = `Actúa como un experto WORLD-CLASS en farmacología, nutrición y evidencia científica con PhD en estas áreas, especializado en análisis tipo Examine.com.

Tu tarea es analizar el suplemento "{supplementName}" y generar un reporte EXTREMADAMENTE DETALLADO Y COMPLETO basado ÚNICAMENTE en evidencia científica publicada en revistas peer-reviewed.

CONTEXTO:
- Suplemento: {supplementName}
- Categoría: {category}
- Audiencia: Personas en Latinoamérica (LATAM) buscando información confiable sobre suplementos
- Objetivo: Proporcionar información ULTRA-DETALLADA, precisa y basada en evidencia que RIVALICE con Examine.com

{studiesContext}

INSTRUCCIONES CRÍTICAS - LEE CUIDADOSAMENTE:
1. Basate SOLO en evidencia científica publicada (estudios RCT, meta-análisis, revisiones sistemáticas)
2. SÉ EXTREMADAMENTE DETALLADO - Incluye NÚMEROS EXACTOS, PORCENTAJES, TAMAÑOS DE EFECTO
3. Para CADA "worksFor", incluye:
   - Effect size EXACTO (ej: "Aumenta fuerza muscular 8-15%", "Reduce cortisol 27.9%")
   - Metodología del estudio (ej: "Meta-análisis de 150+ RCTs", "Estudio doble-ciego con 500 participantes")
   - Número de participantes TOTAL
   - Magnitud del efecto: Small, Moderate, Large, o Very Large
4. NO inventes datos, estudios o referencias
5. Usa terminología clara pero ESPECÍFICA (incluye números y estadísticas)
6. Prioriza meta-análisis y RCTs sobre estudios observacionales
7. Sé conservador pero COMPLETO - mejor subestimar que exagerar, pero incluye TODOS los detalles disponibles
8. Incluye detalles prácticos ESPECÍFICOS: dosis exactas con rangos, timing preciso, duración mínima
9. Menciona efectos secundarios con FRECUENCIA (ej: "10-15% de usuarios", "Raro <1%")
10. {studiesInstruction}

🎯 REGLAS DE CANTIDAD (OBLIGATORIO - NO NEGOCIABLE):
⚠️ DEBES incluir EXACTAMENTE este número de items:
- "worksFor": MÍNIMO 5, MÁXIMO 8 condiciones (ES OBLIGATORIO tener al menos 5)
- "doesntWorkFor": MÍNIMO 5, MÁXIMO 8 condiciones (ES OBLIGATORIO tener al menos 5)
- "limitedEvidence": MÍNIMO 3, MÁXIMO 5 condiciones

Si los estudios proporcionados no cubren 5 beneficios, USA TU BASE DE CONOCIMIENTO para completar.
Por ejemplo, para CALCIO debes incluir: salud ósea, función muscular, función nerviosa, coagulación, salud cardiovascular, regulación hormonal, etc.
Para MAGNESIO: sueño, ansiedad, calambres, migrañas, presión arterial, energía, etc.

ORDENA por evidenceGrade (A primero, luego B, C, D).

Para "doesntWorkFor": Si no tienes 5 evidencias negativas claras de los estudios, incluye usos populares sin respaldo científico como: pérdida de peso directa, cura de cáncer, mejora cognitiva dramática, etc.

Para "limitedEvidence": Incluye condiciones donde hay señales prometedoras pero insuficientes.

ESTRUCTURA REQUERIDA (Responde ÚNICAMENTE con JSON válido, sin markdown):

{
  "whatIsIt": "Descripción DETALLADA en 3-4 oraciones de qué es este suplemento, su origen (planta específica, compuesto sintético, etc.), mecanismos de acción principales, y por qué es notable. SÉ ESPECÍFICO Y TÉCNICO.",

  "totalStudies": número_total_de_estudios_analizados_para_esta_recomendación,

  "primaryUses": [
    "Uso principal 1 con NÚMEROS (ej: Reducir estrés y ansiedad - reduce cortisol 27.9% en promedio)",
    "Uso principal 2 con DATOS ESPECÍFICOS",
    "Uso principal 3 con EVIDENCIA CUANTITATIVA"
  ],

  "mechanisms": [
    {
      "name": "Nombre ESPECÍFICO del mecanismo (ej: Modulación de receptores GABA-A, Inhibición de 5-alfa-reductasa)",
      "description": "Explicación DETALLADA de CÓMO funciona este mecanismo a nivel molecular/celular. Incluye receptores específicos, enzimas, vías de señalización. Mínimo 2-3 oraciones técnicas pero claras.",
      "evidenceLevel": "strong|moderate|weak|preliminary",
      "studyCount": número_estimado_de_estudios_que_respaldan_este_mecanismo
    }
  ],

  "worksFor": [
    {
      "condition": "Condición o beneficio MUY ESPECÍFICO (ej: Aumento de fuerza muscular en entrenamiento de resistencia)",
      "evidenceGrade": "A|B|C|D",
      "effectSize": "Very Large|Large|Moderate|Small|Minimal",
      "magnitude": "DESCRIPCIÓN NUMÉRICA EXACTA del efecto (ej: Aumenta 8-15% en fuerza máxima, Reduce 25-30% en tiempo de recuperación)",
      "studyCount": número_total_de_estudios,
      "rctCount": número_de_RCTs,
      "metaAnalysis": true|false,
      "totalParticipants": número_total_aproximado_de_participantes_en_todos_los_estudios,
      "notes": "Detalles ULTRA-ESPECÍFICOS: 
        - Dosis exacta utilizada (ej: 3-5g/día)
        - Duración mínima para ver efectos (ej: 4-8 semanas)
        - Población estudiada (ej: adultos sanos 18-65 años, personas con deficiencia)
        - Magnitud del efecto con NÚMEROS (ej: reducción de 27% en cortisol, aumento de 12% en VO2max)
        - Contexto importante (ej: efecto mayor en personas con niveles bajos iniciales)"
    }
  ],

  "doesntWorkFor": [
    {
      "condition": "Condición para la que NO hay evidencia suficiente o la evidencia es NEGATIVA",
      "evidenceGrade": "D|F",
      "studyCount": número_de_estudios_que_no_mostraron_efecto,
      "notes": "Explicación ESPECÍFICA de por qué no funciona con DATOS (ej: 8 RCTs no mostraron diferencia significativa vs placebo, p>0.05)"
    }
  ],

  "limitedEvidence": [
    {
      "condition": "Condición con evidencia preliminar prometedora pero insuficiente",
      "evidenceGrade": "C",
      "studyCount": número_de_estudios_preliminares,
      "notes": "Explicación DETALLADA de qué falta (ej: Solo 3 estudios pequeños (n<50), se necesitan RCTs grandes, población más diversa, etc.)"
    }
  ],

  "dosage": {
    "standard": "Rango de dosis ESPECÍFICO según evidencia con UNIDADES EXACTAS (ej: 300-600mg/día de extracto estandarizado, 3-5g/día de monohidrato)",
    "effectiveDose": "Dosis MÍNIMA efectiva documentada (ej: 300mg/día para efectos ansiolíticos)",
    "optimalDose": "Dosis ÓPTIMA según meta-análisis (ej: 500mg/día mostró mejores resultados)",
    "maxSafeDose": "Dosis máxima segura documentada (ej: Hasta 1200mg/día sin efectos adversos significativos)",
    "timing": "CUÁNDO tomar para mejor eficacia con RAZÓN (ej: Mañana con el desayuno para mejor absorción, Noche antes de dormir para aprovechar pico de cortisol, Timing no crítico según estudios)",
    "duration": "Duración ESPECÍFICA para ver efectos según estudios (ej: Efectos iniciales en 2-4 semanas, efectos completos en 8-12 semanas, uso continuo seguro hasta 6 meses documentado)",
    "forms": [
      {
        "form": "Nombre EXACTO de la forma (ej: KSM-66®, Sensoril®, Extracto acuoso 10:1, Monohidrato micronizado)",
        "description": "Por qué esta forma es relevante con DATOS (ej: Estandarizado al 5% withanólidos, usado en 78% de estudios clínicos, biodisponibilidad 40% mayor)",
        "recommended": true|false,
        "studyCount": número_de_estudios_con_esta_forma
      }
    ],
    "stacksWith": [
      "Nombre de suplemento con sinergia DOCUMENTADA (incluye breve razón, ej: L-Teanina - potencia efectos calmantes sin sedación)"
    ],
    "notes": "Consideraciones IMPORTANTES sobre dosificación (ej: Tomar con grasas aumenta absorción 30%, dividir dosis mejora tolerancia, ciclado no necesario según evidencia)"
  },

  "safety": {
    "overallRating": "Generally Safe|Caution Required|Insufficient Data",
    "safetyScore": "Puntuación 1-10 basada en evidencia (10 = extremadamente seguro)",
    "sideEffects": [
      {
        "effect": "Efecto secundario ESPECÍFICO (ej: Malestar gastrointestinal leve, Somnolencia diurna)",
        "frequency": "PORCENTAJE o DESCRIPCIÓN CUANTITATIVA (ej: 10-15% de usuarios, Raro <1%, Común en dosis >600mg)",
        "severity": "Mild|Moderate|Severe",
        "notes": "Contexto DETALLADO (ej: Solo en dosis >600mg/día, Desaparece después de 1-2 semanas, Más común con estómago vacío)"
      }
    ],
    "contraindications": [
      "Embarazo y lactancia (falta evidencia de seguridad)",
      "Condición médica ESPECÍFICA con RAZÓN (ej: Hipotiroidismo - puede reducir TSH)",
      "Uso de medicamento ESPECÍFICO (ej: Sedantes benzodiacepínicos - efecto aditivo)"
    ],
    "interactions": [
      {
        "medication": "Tipo o nombre ESPECÍFICO de medicamento (ej: Benzodiazepinas, Warfarina, Inhibidores de la bomba de protones)",
        "severity": "Mild|Moderate|Severe",
        "mechanism": "CÓMO ocurre la interacción (ej: Potenciación de efectos GABAérgicos, Inhibición de CYP3A4)",
        "description": "Descripción CLARA del riesgo con RECOMENDACIÓN (ej: Puede potenciar sedación. Reducir dosis de sedante o evitar combinación. Consultar médico.)"
      }
    ],
    "longTermSafety": "Datos de seguridad a largo plazo con DURACIÓN ESPECÍFICA (ej: Uso continuo seguro hasta 6 meses documentado en RCTs, Estudios de 12+ meses muestran perfil de seguridad favorable)",
    "pregnancyCategory": "Avoid|Caution|Insufficient Data",
    "notes": "Notas IMPORTANTES de seguridad (ej: No reportes de toxicidad hepática en estudios clínicos, Perfil de seguridad superior a medicamentos ansiolíticos)"
  },

  "keyStudies": [
    {
      "pmid": "ID de PubMed EXACTO (solo si conoces con certeza, sino omite)",
      "title": "Título COMPLETO del estudio",
      "year": año_del_estudio,
      "studyType": "RCT|Meta-analysis|Systematic Review|Observational",
      "participants": número_EXACTO_de_participantes,
      "duration": "Duración del estudio (ej: 8 semanas, 6 meses)",
      "dose": "Dosis utilizada en el estudio",
      "findings": [
        "Hallazgo clave 1 con DATOS NUMÉRICOS ESPECÍFICOS (ej: Reducción de 27.9% en cortisol vs placebo, p<0.001)",
        "Hallazgo clave 2 con ESTADÍSTICAS (ej: Aumento de 15% en fuerza máxima, IC 95%: 12-18%)"
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

GUÍA DE EVIDENCE GRADES (SÉ ESTRICTO):
- Grade A: Múltiples RCTs de alta calidad (n>100 cada uno) + meta-análisis, efecto consistente y grande
- Grade B: Varios RCTs (n>50) con resultados mayormente positivos, efecto moderado
- Grade C: Pocos RCTs o evidencia preliminar, efecto pequeño o inconsistente
- Grade D: Sin evidencia robusta, solo estudios observacionales o in vitro
- Grade F: Evidencia negativa - estudios muestran NO efecto

GUÍA DE EFFECT SIZE (SÉ PRECISO):
- Very Large: >50% de mejora, Cohen's d >1.2, efecto clínicamente muy significativo
- Large: 30-50% de mejora, Cohen's d 0.8-1.2, efecto clínicamente significativo
- Moderate: 15-30% de mejora, Cohen's d 0.5-0.8, efecto notable
- Small: 5-15% de mejora, Cohen's d 0.2-0.5, efecto detectable
- Minimal: <5% de mejora, Cohen's d <0.2, efecto marginal

GUÍA DE EVIDENCE LEVELS (mechanisms):
- strong: Mecanismo BIEN ESTABLECIDO con múltiples estudios in vitro, in vivo, Y humanos. Consenso científico.
- moderate: Mecanismo propuesto con evidencia parcial en humanos, respaldado por estudios preclínicos
- weak: Mecanismo teórico con evidencia limitada, principalmente estudios in vitro
- preliminary: Hipótesis sin confirmación robusta, especulativo

IMPORTANTE - CALIDAD SOBRE CANTIDAD:
- Si no conoces con certeza un PMID, OMITE ese campo
- Si no hay suficientes estudios para "keyStudies", devuelve array vacío []
- Si algo no está documentado, mejor OMITIR que inventar
- Redondea studyCount a números realistas (si hay poca evidencia, pon 1-3, no 0)
- PRIORIZA NÚMEROS Y DATOS ESPECÍFICOS en todas las descripciones
- Incluye RANGOS cuando sea apropiado (ej: "8-15%", "300-600mg")

🚨 REGLAS CRÍTICAS DE JSON - CUMPLIMIENTO OBLIGATORIO:
1. TODOS los valores numéricos DEBEN ser números válidos (no símbolos como >, <, ~)
   ❌ INCORRECTO: "totalParticipants": >1000
   ✅ CORRECTO: "totalParticipants": 1000
   ✅ CORRECTO (si impreciso): "totalParticipants": 1500 (y explicar en "notes": "Aproximadamente >1000")

2. NUNCA uses valores no-JSON como N/A, null sin comillas, undefined
   ❌ INCORRECTO: "totalParticipants": N/A
   ❌ INCORRECTO: "totalParticipants": null
   ✅ CORRECTO: "totalParticipants": 0 (y explicar en "notes": "No reportado")
   ✅ CORRECTO: Omitir el campo completamente si es opcional

3. TODOS los strings DEBEN estar entre comillas dobles, sin truncar
   ❌ INCORRECTO: "notes": "no reportad
   ✅ CORRECTO: "notes": "no reportado"

4. NUNCA uses comas finales antes de } o ]
   ❌ INCORRECTO: {"key": "value",}
   ✅ CORRECTO: {"key": "value"}

5. Todos los campos string deben estar COMPLETOS (no truncados)
   ❌ INCORRECTO: "description": "Este suplemento ayuda a
   ✅ CORRECTO: "description": "Este suplemento ayuda a mejorar la función cognitiva"

6. Si un número es aproximado, usa el número entero MÁS CERCANO y explica en "notes"
   ✅ EJEMPLO: "totalParticipants": 1500, "notes": "Aproximadamente >1000 participantes combinados"

7. Verifica que TODO el JSON esté bien formado antes de responder
   - Verifica que todas las comillas estén cerradas
   - Verifica que todos los corchetes [] y llaves {} estén balanceados
   - Verifica que NO haya caracteres especiales sin escapar

RECUERDA: Este análisis será usado por personas para tomar decisiones de salud. SÉ PRECISO, DETALLADO Y HONESTO.

Responde ÚNICAMENTE con el JSON VÁLIDO, sin texto antes o después, sin markdown code blocks.`;

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
Autores: ${(study.authors || []).slice(0, 3).join(', ')}${(study.authors || []).length > 3 ? ' et al.' : ''}

Abstract:
${(study.abstract || 'No disponible').substring(0, 1000)}${(study.abstract || '').length > 1000 ? '...' : ''}

URL: ${study.pubmedUrl}
`;
  }).join('\n---\n');

  return `
ESTUDIOS CIENTÍFICOS REALES DE PUBMED (${studies.length} estudios):

Tienes acceso a ${studies.length} estudios científicos REALES y VERIFICABLES desde PubMed.
Usa estos estudios como REFERENCIA PRINCIPAL, pero TAMBIÉN usa tu base de conocimiento para:
1. COMPLETAR hasta 5 items mínimo en worksFor (si los estudios solo cubren 2-3 beneficios, agrega más basándote en literatura científica conocida)
2. COMPLETAR hasta 5 items mínimo en doesntWorkFor (incluye usos populares SIN evidencia)
3. COMPLETAR hasta 3 items mínimo en limitedEvidence

⚠️ IMPORTANTE: Los requisitos de MÍNIMO 5 items son OBLIGATORIOS aunque los estudios proporcionados sean limitados.

${studiesText}
`;
}

/**
 * Benefit-specific enrichment prompt template
 * Used when user searches for a specific benefit (e.g., "creatine for muscle growth")
 */
export const BENEFIT_SPECIFIC_PROMPT_TEMPLATE = `Actúa como un experto en farmacología y evidencia científica.

Tu tarea es analizar ESPECÍFICAMENTE los efectos de "{supplementName}" para: "{benefitQuery}"

IMPORTANTE: ENFÓCATE ÚNICAMENTE EN ESTE BENEFICIO ESPECÍFICO. Ignora otros usos.

{studiesContext}

INSTRUCCIONES CRÍTICAS:
1. Analiza SOLO la evidencia relacionada con "{benefitQuery}"

2. Para cada beneficio en "worksFor", incluye en "notes":
   ✅ DATOS CUANTITATIVOS (OBLIGATORIO):
   - Magnitud del efecto con NÚMEROS: "Aumenta en X%", "Mejora en X kg", "Reduce en X puntos"
   - Tiempo hasta ver resultados: "Efectos visibles en X semanas"
   - Condiciones óptimas: "Más efectivo con entrenamiento", "Mejor en ayunas", etc.

   Ejemplo de "notes" BUENO:
   "Aumenta fuerza muscular 8-15% en 4-8 semanas. Más efectivo combinado con entrenamiento de resistencia 3-4x/semana. Personas sin consumo de carne ven mayores beneficios (+20%). Requiere consistencia diaria."

   Ejemplo MALO (muy vago):
   "Mejora la fuerza muscular. Efectivo con ejercicio."

3. Incluye números ESPECÍFICOS de los estudios:
   - studyCount: Número REAL de estudios sobre este beneficio específico
   - totalParticipants: Suma total de participantes
   - rctCount: Cuántos fueron RCTs (Randomized Controlled Trials)

4. Estructura tu respuesta:
   - "worksFor": 1-3 items SOLO sobre {benefitQuery} con DATOS CUANTITATIVOS en notes
   - "doesntWorkFor": 1-2 items si la evidencia es negativa para {benefitQuery}
   - "limitedEvidence": 1-2 items si la evidencia es mixta
   - "dosage": Dosis ESPECÍFICA para {benefitQuery} (no genérica)
   - "safety": Seguridad específica para este uso

5. {studiesInstruction}

RECUERDA: Incluye NÚMEROS CONCRETOS en cada "notes". NO seas vago.
NO incluyas beneficios generales que no sean "{benefitQuery}".`;

/**
 * Build prompt with supplement-specific data and optional studies
 */
export function buildEnrichmentPrompt(
  supplementName: string,
  category: string = 'general',
  studies?: PubMedStudy[],
  benefitQuery?: string
): string {
  const hasStudies = studies && studies.length > 0;

  const studiesContext = hasStudies
    ? buildStudiesContext(studies!)
    : 'NOTA: No se proporcionaron estudios específicos de PubMed. Usa tu conocimiento general basado en la literatura científica publicada.';

  const studiesInstruction = hasStudies
    ? `IMPORTANTE: Tienes ${studies!.length} estudios reales de PubMed arriba. DEBES basar tu análisis ÚNICAMENTE en estos estudios. Cita los PMIDs en keyStudies.`
    : 'Usa tu conocimiento de la literatura científica, pero sé conservador en tus afirmaciones.';

  // Use benefit-specific template if benefitQuery is provided
  if (benefitQuery) {
    return BENEFIT_SPECIFIC_PROMPT_TEMPLATE
      .replace(/{supplementName}/g, supplementName)
      .replace(/{benefitQuery}/g, benefitQuery)
      .replace(/{studiesContext}/g, studiesContext)
      .replace(/{studiesInstruction}/g, studiesInstruction);
  }

  // Default: use general enrichment template
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
