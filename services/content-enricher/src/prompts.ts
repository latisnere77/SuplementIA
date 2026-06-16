/* eslint-disable */
// @ts-nocheck
export {};
"use strict";
/**
 * Prompt templates for Bedrock (Claude)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BENEFIT_SPECIFIC_PROMPT_TEMPLATE = exports.ENRICHMENT_PROMPT_TEMPLATE = void 0;
exports.buildEnrichmentPrompt = buildEnrichmentPrompt;
exports.validateEnrichedContent = validateEnrichedContent;
exports.sanitizeDosageWithPMIDValidation = sanitizeDosageWithPMIDValidation;
exports.ENRICHMENT_PROMPT_TEMPLATE = `Actúa como un experto WORLD-CLASS en farmacología, nutrición y evidencia científica con PhD en estas áreas, especializado en análisis tipo Examine.com.

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
3. 🚨 PROHIBIDO INVENTAR DATOS FARMACOCINÉTICOS:
   - NO inventes porcentajes de absorción (ej: "aumenta absorción 30%") sin citar PMID específico
   - NO inventes claims sobre biodisponibilidad sin estudio publicado
   - NO inventes timing óptimo sin evidencia clínica
   - Si no hay datos, escribe "Sin datos farmacocinéticos específicos publicados"

4. 🔬 MECANISMOS - SOLO EVIDENCIA ESTABLECIDA:
   - Solo incluye mecanismos documentados en literatura científica
   - Indica evidenceLevel honestamente (strong = consenso científico, moderate = evidencia parcial, weak = preliminar)
   - NO inventes vías moleculares o receptores hipotéticos
   - Máximo 3 mecanismos, priorizando los mejor establecidos

5. 🛒 GUÍA DE COMPRA - BASADA EN FUENTES CONFIABLES:
   - Usa información de ConsumerLab, Examine.com, y estudios publicados
   - Para hongos: distinguir cuerpo fructífero vs micelio (cuerpo fructífero tiene 3-5x más beta-glucanos según Journal of Fungi 2020)
   - Para extractos: indicar estandarización basada en estudios clínicos reales
   - avoidFlags: solo alertas documentadas (ej: micelio en grano = principalmente almidón según mycologist Jeff Chilton)
   - NO inventes porcentajes de estandarización sin fuente

6. Para CADA "worksFor", incluye:
   - Effect size EXACTO (ej: "Aumenta fuerza muscular 8-15%", "Reduce cortisol 27.9%")
   - Metodología del estudio (ej: "Meta-análisis de 150+ RCTs", "Estudio doble-ciego con 500 participantes")
   - Número de participantes TOTAL
   - Magnitud del efecto: Small, Moderate, Large, o Very Large
7. NO inventes datos, estudios o referencias
8. Usa terminología clara pero ESPECÍFICA (incluye números y estadísticas)
9. Prioriza meta-análisis y RCTs sobre estudios observacionales
10. Sé conservador pero COMPLETO - mejor subestimar que exagerar, pero incluye TODOS los detalles disponibles
11. Incluye detalles prácticos ESPECÍFICOS: dosis exactas con rangos, duración mínima
12. Menciona efectos secundarios con FRECUENCIA (ej: "10-15% de usuarios", "Raro <1%")
13. {studiesInstruction}

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
      "name": "Nombre ESPECÍFICO del mecanismo ESTABLECIDO (ej: Estimulación de NGF, Modulación de receptores GABA-A)",
      "description": "Explicación de CÓMO funciona basada en ESTUDIOS PUBLICADOS. Incluye receptores, enzimas o vías específicas SOLO si están documentadas. NO inventes mecanismos hipotéticos.",
      "evidenceLevel": "strong|moderate|weak",
      "target": "Receptor/enzima/vía específica (ej: Factor de Crecimiento Nervioso, receptores NMDA, eje HPA)"
    }
  ],

  "buyingGuidance": {
    "preferredForm": "Forma preferida según evidencia (ej: Extracto de cuerpo fructífero, Monohidrato, Citrato). SOLO formas con respaldo en estudios clínicos.",
    "keyCompounds": [
      {
        "name": "Compuesto activo principal (ej: Hericenones, Withanólidos, Creatina)",
        "source": "De dónde proviene (ej: cuerpo fructífero, raíz, síntesis)",
        "lookFor": "Qué buscar en etiqueta (ej: >30% beta-glucanos, 5% withanólidos)"
      }
    ],
    "avoidFlags": [
      "Señal de alerta 1 basada en evidencia (ej: 'Productos de micelio en grano - contienen principalmente almidón')",
      "Señal de alerta 2 (ej: 'Sin pruebas de terceros para metales pesados')"
    ],
    "qualityIndicators": [
      "Indicador de calidad verificable (ej: 'Certificación orgánica USDA')",
      "Indicador 2 (ej: 'Pruebas de laboratorio de terceros disponibles')",
      "Indicador 3 (ej: 'Estandarizado a X% de compuesto activo')"
    ],
    "notes": "Contexto adicional SOLO si está basado en evidencia publicada. NO inventes claims de absorción o biodisponibilidad."
  },

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
    "timing": "CUÁNDO tomar según estudios clínicos publicados. Si NO hay evidencia de timing específico, escribe 'Sin preferencia de horario según estudios clínicos'. NO inventes claims de absorción.",
    "duration": "Duración ESPECÍFICA para ver efectos según estudios (ej: Efectos iniciales en 2-4 semanas, efectos completos en 8-12 semanas, uso continuo seguro hasta 6 meses documentado)",
    "forms": [
      {
        "form": "Nombre EXACTO de la forma (ej: KSM-66®, Sensoril®, Extracto acuoso 10:1, Monohidrato micronizado)",
        "description": "Por qué esta forma es relevante (ej: Estandarizado al 5% withanólidos, usado en mayoría de estudios clínicos). NO inventes porcentajes de biodisponibilidad sin citar estudio.",
        "recommended": true|false,
        "studyCount": número_de_estudios_con_esta_forma
      }
    ],
    "stacksWith": [
      "Nombre de suplemento con sinergia DOCUMENTADA (incluye breve razón, ej: L-Teanina - potencia efectos calmantes sin sedación)"
    ],
    "notes": "SOLO información verificable de estudios clínicos. NO inventes porcentajes de absorción ni claims farmacocinéticos sin PMID. Si no hay datos específicos, escribe 'Seguir indicaciones del fabricante'."
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
function buildStudiesContext(studies) {
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
exports.BENEFIT_SPECIFIC_PROMPT_TEMPLATE = `Actúa como un experto en farmacología y evidencia científica.

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
function buildEnrichmentPrompt(supplementName, category = 'general', studies, benefitQuery) {
    const hasStudies = studies && studies.length > 0;
    const studiesContext = hasStudies
        ? buildStudiesContext(studies)
        : 'NOTA: No se proporcionaron estudios específicos de PubMed. Usa tu conocimiento general basado en la literatura científica publicada.';
    const studiesInstruction = hasStudies
        ? `IMPORTANTE: Tienes ${studies.length} estudios reales de PubMed arriba. DEBES basar tu análisis ÚNICAMENTE en estos estudios. Cita los PMIDs en keyStudies.`
        : 'Usa tu conocimiento de la literatura científica, pero sé conservador en tus afirmaciones.';
    // Use benefit-specific template if benefitQuery is provided
    if (benefitQuery) {
        return exports.BENEFIT_SPECIFIC_PROMPT_TEMPLATE
            .replace(/{supplementName}/g, supplementName)
            .replace(/{benefitQuery}/g, benefitQuery)
            .replace(/{studiesContext}/g, studiesContext)
            .replace(/{studiesInstruction}/g, studiesInstruction);
    }
    // Default: use general enrichment template
    return exports.ENRICHMENT_PROMPT_TEMPLATE
        .replace(/{supplementName}/g, supplementName)
        .replace(/{category}/g, category)
        .replace(/{studiesContext}/g, studiesContext)
        .replace(/{studiesInstruction}/g, studiesInstruction);
}
/**
 * Validate enriched content structure
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateEnrichedContent(data) {
    const errors = [];
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return {
            valid: false,
            errors: ['Enriched content must be an object'],
        };
    }
    const normalizeObjectField = (field) => {
        const value = data[field];
        if (typeof value !== 'string') {
            return value;
        }
        try {
            const parsed = JSON.parse(value);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                data[field] = parsed;
                return parsed;
            }
        }
        catch {
            // Leave the string in place; validation below reports a controlled error.
        }
        return value;
    };
    const dosageValue = normalizeObjectField('dosage');
    const safetyValue = normalizeObjectField('safety');
    // Required fields
    const requiredFields = [
        'whatIsIt',
        'primaryUses',
        'mechanisms',
        'worksFor',
        'dosage',
        'safety',
        'buyingGuidance',
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
    if (dosageValue) {
        if (typeof dosageValue !== 'object' || Array.isArray(dosageValue)) {
            errors.push('dosage must be an object');
        }
        else {
        const dosageRequired = ['standard', 'timing', 'duration'];
        for (const field of dosageRequired) {
            if (!(field in dosageValue)) {
                errors.push(`dosage.${field} is required`);
            }
        }
        }
    }
    // Validate safety structure
    if (safetyValue) {
        if (typeof safetyValue !== 'object' || Array.isArray(safetyValue)) {
            errors.push('safety must be an object');
        }
        else if (!('overallRating' in safetyValue)) {
            errors.push('safety.overallRating is required');
        }
    }
    // Validate mechanisms structure
    if (data.mechanisms && Array.isArray(data.mechanisms)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.mechanisms.forEach((mech, idx) => {
            if (!mech.name || !mech.evidenceLevel) {
                errors.push(`mechanisms[${idx}] must have name and evidenceLevel`);
            }
            // Validate evidenceLevel is one of allowed values
            if (mech.evidenceLevel && !['strong', 'moderate', 'weak'].includes(mech.evidenceLevel)) {
                errors.push(`mechanisms[${idx}].evidenceLevel must be strong, moderate, or weak`);
            }
        });
    }
    // Validate buyingGuidance structure
    if (data.buyingGuidance) {
        if (!data.buyingGuidance.preferredForm) {
            errors.push('buyingGuidance.preferredForm is required');
        }
        if (!Array.isArray(data.buyingGuidance.keyCompounds)) {
            errors.push('buyingGuidance.keyCompounds must be an array');
        }
        if (!Array.isArray(data.buyingGuidance.qualityIndicators)) {
            errors.push('buyingGuidance.qualityIndicators must be an array');
        }
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
/**
 * Sanitize dosage object - stub function for bedrockConverse.ts compatibility
 * @deprecated This function is a placeholder for future PMID validation
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeDosageWithPMIDValidation(dosage) {
    // Passthrough for now - actual PMID validation not yet implemented
    return dosage;
}
