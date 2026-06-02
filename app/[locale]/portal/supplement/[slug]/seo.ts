import type { Metadata } from 'next';
import { getCanonicalSupplementQuery, getAllCategories } from '@/lib/knowledge-base';
import { getLocalizedSupplementName } from '@/lib/i18n/supplement-names';
import { getUniqueSupplements, localizedPath, seoLocales, siteUrl, type SeoLocale } from '@/lib/seo';

export type SupplementSeoData = {
  slug: string;
  canonicalName: string;
  localizedName: string;
  summary: string;
  categories: string[];
};

export type SupplementSeoContent = {
  intro: string;
  highlights: string[];
  relatedLinks?: Array<{
    title: string;
    description: string;
    href: string;
    label: string;
  }>;
  faqHeading: string;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
};

const forbiddenClinicalWording = [
  'sirve para',
  'treats',
  'cures',
  'beneficio comprobado',
  'clinical benefit',
];

export function sanitizeSupplementSeoText(value: string) {
  return forbiddenClinicalWording.reduce(
    (text, phrase) => text.replace(new RegExp(phrase, 'gi'), ''),
    value
  ).replace(/\s+/g, ' ').trim();
}

export function getSupplementSeoData(slug: string, locale: SeoLocale): SupplementSeoData | null {
  const supplement = getUniqueSupplements().find(item => item.slug === slug);

  if (!supplement) {
    return null;
  }

  const canonicalName = getCanonicalSupplementQuery(slug, supplement.name);
  const localizedName = getLocalizedSupplementName(canonicalName, locale);
  const categoryNames = getAllCategories()
    .filter(category => category.supplements.some(item => item.slug === slug))
    .map(category => category.name);

  return {
    slug,
    canonicalName,
    localizedName,
    summary: supplement.summary,
    categories: categoryNames,
  };
}

export function buildSupplementTitle(data: SupplementSeoData, locale: SeoLocale) {
  const targetedTitles: Partial<Record<string, Record<SeoLocale, string>>> = {
    'fiber-psyllium': {
      es: 'Psyllium para colesterol LDL: evidencia, fibra y seguridad',
      en: 'Psyllium fiber: evidence for LDL cholesterol, digestion, and safety',
    },
    'coenzyme-q10': {
      es: 'Coenzima Q10 cardiovascular: evidencia, estatinas y seguridad',
      en: 'Coenzyme Q10: heart health, migraine evidence, and safety',
    },
    'omega-3': {
      es: 'Omega-3 para triglicéridos: evidencia, EPA/DHA y seguridad',
      en: 'Omega-3 for triglycerides: EPA/DHA evidence and safety',
    },
    'plant-sterols': {
      es: 'Esteroles vegetales para colesterol: evidencia y seguridad',
      en: 'Plant sterols for cholesterol: evidence and safety',
    },
    garlic: {
      es: 'Ajo para presión y colesterol: evidencia y precauciones',
      en: 'Garlic for blood pressure and cholesterol: evidence and precautions',
    },
    'hydrolyzed-collagen': {
      es: 'Colágeno hidrolizado: evidencia para articulaciones, piel y seguridad',
      en: 'Hydrolyzed collagen: evidence for joints, skin, and safety',
    },
    'whey-protein': {
      es: 'Proteína whey: evidencia para músculo, ejercicio y seguridad',
      en: 'Whey protein: evidence for muscle, training, and safety',
    },
    caffeine: {
      es: 'Cafeína: evidencia para energía, enfoque y rendimiento',
      en: 'Caffeine: evidence for energy, focus, and performance',
    },
    citrulline: {
      es: 'Citrulina: evidencia para rendimiento, óxido nítrico y seguridad',
      en: 'Citrulline: evidence for performance, nitric oxide, and safety',
    },
    'rhodiola-rosea': {
      es: 'Rhodiola rosea: evidencia para fatiga, estrés y seguridad',
      en: 'Rhodiola rosea: evidence for fatigue, stress, and safety',
    },
    'saw-palmetto': {
      es: 'Saw palmetto: evidencia prostática, seguridad y expectativas',
      en: 'Saw palmetto: prostate evidence, safety, and expectations',
    },
    lavender: {
      es: 'Lavanda: evidencia para sueño, calma y seguridad',
      en: 'Lavender: evidence for sleep, calm, and safety',
    },
    'bacopa-monnieri': {
      es: 'Bacopa monnieri: evidencia para memoria, enfoque y seguridad',
      en: 'Bacopa monnieri: evidence for memory, focus, and safety',
    },
    'vitamin-d': {
      es: 'Vitamina D: evidencia, deficiencia, huesos y seguridad',
      en: 'Vitamin D: evidence, deficiency, bones, and safety',
    },
    'l-theanine': {
      es: 'L-teanina: evidencia para calma, enfoque y sueño',
      en: 'L-theanine: evidence for calm, focus, and sleep',
    },
  };

  const targetedTitle = targetedTitles[data.slug]?.[locale];

  if (targetedTitle) {
    return targetedTitle;
  }

  return locale === 'es'
    ? `${data.localizedName}: evidencia, estudios y seguridad`
    : `${data.localizedName}: evidence, studies, and safety`;
}

export function buildSupplementDescription(data: SupplementSeoData, locale: SeoLocale) {
  const targetedDescriptions: Partial<Record<string, Record<SeoLocale, string>>> = {
    'fiber-psyllium': {
      es: 'Revisa psyllium para colesterol LDL, fibra soluble, triglicéridos, digestión, laboratorios y uso responsable.',
      en: 'Review psyllium fiber for LDL cholesterol, triglycerides, digestion, tolerance, and responsible use alongside diet and lab follow-up.',
    },
    'coenzyme-q10': {
      es: 'Consulta coenzima Q10 cardiovascular: energía celular, estatinas, presión, seguridad, interacciones y evidencia prudente.',
      en: 'Review careful evidence for coenzyme Q10 in heart health, migraine, cellular energy, safety, and interactions.',
    },
    'omega-3': {
      es: 'Revisa omega-3 EPA/DHA para triglicéridos, salud cardiovascular, dosis prudente, interacciones y laboratorios.',
      en: 'Review omega-3 EPA/DHA for triglycerides, heart health, careful dosing, interactions, and lab follow-up.',
    },
    'plant-sterols': {
      es: 'Consulta esteroles vegetales para colesterol LDL, absorción intestinal, dieta, seguridad y expectativas realistas.',
      en: 'Review plant sterols for LDL cholesterol, intestinal absorption, diet context, safety, and realistic expectations.',
    },
    garlic: {
      es: 'Revisa ajo para presión arterial, colesterol, preparación, tolerancia, anticoagulantes y seguridad cardiovascular.',
      en: 'Review garlic for blood pressure, cholesterol, preparation, tolerance, anticoagulants, and cardiovascular safety.',
    },
    'hydrolyzed-collagen': {
      es: 'Compara evidencia de colágeno hidrolizado para articulaciones, piel, tejidos conectivos, seguridad y expectativas realistas.',
      en: 'Compare hydrolyzed collagen evidence for joints, skin, connective tissue, safety, and realistic expectations.',
    },
    'whey-protein': {
      es: 'Revisa proteína whey para entrenamiento, masa muscular, recuperación, proteína diaria, tolerancia y seguridad.',
      en: 'Review whey protein for training, muscle mass, recovery, daily protein intake, tolerance, and safety.',
    },
    caffeine: {
      es: 'Revisa cafeína para energía, enfoque, ejercicio, sueño, tolerancia, dosis prudente e interacciones.',
      en: 'Review caffeine for energy, focus, exercise, sleep, tolerance, careful dosing, and interactions.',
    },
    citrulline: {
      es: 'Consulta citrulina para rendimiento deportivo, flujo sanguíneo, entrenamiento, tolerancia y seguridad.',
      en: 'Review citrulline for sports performance, blood-flow context, training, tolerance, and safety.',
    },
    'rhodiola-rosea': {
      es: 'Revisa rhodiola rosea para fatiga, estrés, rendimiento mental, seguridad y diferencias entre extractos estudiados.',
      en: 'Review rhodiola rosea for fatigue, stress, mental performance, safety, and differences between studied extracts.',
    },
    'saw-palmetto': {
      es: 'Revisa saw palmetto para salud prostática, síntomas urinarios, seguridad, medicamentos y expectativas realistas.',
      en: 'Review saw palmetto for prostate context, urinary symptoms, safety, medications, and realistic expectations.',
    },
    lavender: {
      es: 'Consulta evidencia de lavanda para sueño, ansiedad leve, formas de uso, seguridad y precauciones con sedantes.',
      en: 'Review lavender evidence for sleep, mild anxiety, forms of use, safety, and precautions with sedatives.',
    },
    'bacopa-monnieri': {
      es: 'Revisa Bacopa monnieri para memoria, atención, aprendizaje, tiempo de uso, seguridad y expectativas realistas.',
      en: 'Review Bacopa monnieri for memory, attention, learning, duration of use, safety, and realistic expectations.',
    },
    'vitamin-d': {
      es: 'Consulta vitamina D para deficiencia, salud ósea, inmunidad, análisis de laboratorio, dosis prudente y seguridad.',
      en: 'Review vitamin D for deficiency, bone health, immunity, lab testing, careful dosing, and safety.',
    },
    'l-theanine': {
      es: 'Revisa L-teanina para relajación, enfoque, sueño, uso con cafeína, seguridad y precauciones con sedantes.',
      en: 'Review L-theanine for relaxation, focus, sleep, caffeine pairing, safety, and precautions with sedatives.',
    },
  };

  const targetedDescription = targetedDescriptions[data.slug]?.[locale];

  if (targetedDescription) {
    return sanitizeSupplementSeoText(targetedDescription);
  }

  const description = locale === 'es'
    ? `Consulta un resumen prudente sobre ${data.localizedName}, tipos de evidencia publicada, seguridad y contexto de uso responsable. Incluye analisis dinamico de literatura cuando esta disponible.`
    : `Review a careful summary for ${data.localizedName}, published evidence types, safety context, and responsible use. Includes dynamic literature analysis when available.`;

  return sanitizeSupplementSeoText(description);
}

export function buildSupplementSeoContent(slug: string, locale: SeoLocale): SupplementSeoContent | null {
  const content: Partial<Record<string, Record<SeoLocale, SupplementSeoContent>>> = {
    'fiber-psyllium': {
      es: {
        intro:
          'Psyllium es una fibra soluble que conecta con búsquedas sobre psyllium colesterol, fibra para LDL y suplementos para triglicéridos. Esta guía ayuda a interpretar cuándo revisar psyllium junto con dieta, agua suficiente y laboratorios.',
        highlights: [
          'Tiene más sentido cuando el usuario quiere comparar fibra soluble, LDL y tolerancia digestiva.',
          'Debe separarse de medicamentos y otros suplementos porque puede modificar absorción o tolerancia gastrointestinal.',
          'El seguimiento debe mirar LDL, no-HDL, triglicéridos, dieta total de fibra y respuesta individual.',
        ],
        relatedLinks: [
          {
            title: 'Suplementos para triglicéridos',
            description:
              'Compara psyllium con omega-3, esteroles vegetales y ajo dentro del cluster de lípidos.',
            href: '/portal/category/cholesterol-triglycerides',
            label: 'Ver categoría de lípidos',
          },
          {
            title: 'Omega-3 para triglicéridos',
            description:
              'Opción complementaria cuando la intención de búsqueda se centra más en triglicéridos que en LDL.',
            href: '/portal/supplement/omega-3?benefit=cholesterol-triglycerides',
            label: 'Comparar con omega-3',
          },
          {
            title: 'Esteroles vegetales',
            description:
              'Otra opción enfocada en colesterol LDL para comparar mecanismo, constancia y expectativas.',
            href: '/portal/supplement/plant-sterols?benefit=cholesterol-triglycerides',
            label: 'Comparar esteroles',
          },
        ],
        faqHeading: 'Preguntas frecuentes sobre psyllium y colesterol',
        faqs: [
          {
            question: '¿Psyllium es más relevante para colesterol o triglicéridos?',
            answer:
              'La intención más clara suele ser colesterol LDL y fibra soluble. En triglicéridos puede formar parte de una estrategia dietaria, pero conviene interpretarlo junto con omega-3, carbohidratos, peso, alcohol y laboratorios.',
          },
          {
            question: '¿Qué precauciones revisar con psyllium?',
            answer:
              'Revisa ingesta de agua, estreñimiento, dificultad para tragar, medicamentos orales y tolerancia digestiva. Puede requerir separar horarios con fármacos o suplementos.',
          },
          {
            question: '¿Cómo saber si tiene sentido para mi laboratorio?',
            answer:
              'Compara LDL, no-HDL, triglicéridos y dieta actual. Si hay riesgo cardiovascular alto o tratamiento con estatinas, la decisión debe acompañarse de seguimiento profesional.',
          },
        ],
      },
      en: {
        intro:
          'Psyllium is soluble fiber that maps to searches around LDL cholesterol, fiber, and triglyceride supplement comparisons. This guide helps frame psyllium alongside diet, water intake, and lab follow-up.',
        highlights: [
          'It is most relevant when comparing soluble fiber, LDL, and digestive tolerance.',
          'It should be separated from some medications and supplements because absorption or tolerance can matter.',
          'Follow-up should consider LDL, non-HDL cholesterol, triglycerides, total fiber intake, and individual response.',
        ],
        relatedLinks: [
          {
            title: 'Triglyceride supplement options',
            description:
              'Compare psyllium with omega-3, plant sterols, and garlic in the lipid cluster.',
            href: '/portal/category/cholesterol-triglycerides',
            label: 'Open lipid category',
          },
          {
            title: 'Omega-3 for triglycerides',
            description:
              'A complementary option when the search intent focuses more on triglycerides than LDL.',
            href: '/portal/supplement/omega-3?benefit=cholesterol-triglycerides',
            label: 'Compare omega-3',
          },
          {
            title: 'Plant sterols',
            description:
              'Another LDL-focused option to compare mechanism, consistency, and expectations.',
            href: '/portal/supplement/plant-sterols?benefit=cholesterol-triglycerides',
            label: 'Compare sterols',
          },
        ],
        faqHeading: 'Frequently asked questions about psyllium and cholesterol',
        faqs: [
          {
            question: 'Is psyllium more relevant for cholesterol or triglycerides?',
            answer:
              'The clearest intent is LDL cholesterol and soluble fiber. For triglycerides it may be part of a broader diet strategy, but omega-3, carbohydrate intake, weight, alcohol, and labs also matter.',
          },
          {
            question: 'What precautions matter with psyllium?',
            answer:
              'Review water intake, constipation, swallowing difficulty, oral medications, and digestive tolerance. Timing may need to be separated from drugs or supplements.',
          },
          {
            question: 'How do I know if it fits my lab results?',
            answer:
              'Compare LDL, non-HDL cholesterol, triglycerides, and current diet. With high cardiovascular risk or statin therapy, decisions should include professional follow-up.',
          },
        ],
      },
    },
    'omega-3': {
      es: {
        intro:
          'Omega-3 EPA/DHA conecta directamente con búsquedas sobre omega 3 triglicéridos y suplementos cardiovasculares. Esta página distingue triglicéridos, LDL, dosis clínica, pescado azul, cápsulas e interacciones.',
        highlights: [
          'La intención más fuerte para EPA/DHA suele ser triglicéridos, no promesas generales de salud cardiovascular.',
          'Importan forma, dosis, pureza, tolerancia gastrointestinal y uso de anticoagulantes o cirugía programada.',
          'Si LDL, triglicéridos y riesgo cardiovascular están alterados, conviene revisar resultados con un profesional.',
        ],
        relatedLinks: [
          {
            title: 'Suplementos para triglicéridos',
            description:
              'Compara omega-3 con psyllium, esteroles vegetales y ajo según laboratorio e intención de búsqueda.',
            href: '/portal/category/cholesterol-triglycerides',
            label: 'Ver comparación de lípidos',
          },
          {
            title: 'Psyllium para LDL',
            description:
              'Fibra soluble más enfocada en colesterol LDL y tolerancia digestiva.',
            href: '/portal/supplement/fiber-psyllium?benefit=cholesterol-triglycerides',
            label: 'Comparar psyllium',
          },
          {
            title: 'Suplementos cardiovasculares',
            description:
              'Amplía el contexto hacia CoQ10, ajo, presión arterial y seguridad cardiovascular.',
            href: '/portal/category/heart-health',
            label: 'Ver cluster cardiovascular',
          },
        ],
        faqHeading: 'Preguntas frecuentes sobre omega-3 y triglicéridos',
        faqs: [
          {
            question: '¿Omega-3 se revisa más por triglicéridos o por colesterol LDL?',
            answer:
              'La intención más clara suele ser triglicéridos. Para LDL, el contexto es distinto y puede requerir comparar dieta, estatinas, fibra soluble, esteroles vegetales y riesgo cardiovascular.',
          },
          {
            question: '¿Qué datos importan antes de elegir omega-3?',
            answer:
              'Revisa triglicéridos, LDL, medicamentos, anticoagulantes, antecedentes de sangrado, cirugía programada, consumo de pescado y tolerancia digestiva.',
          },
          {
            question: '¿Puedo combinar omega-3 con otros suplementos cardiovasculares?',
            answer:
              'Puede ser posible, pero conviene revisar duplicidad, dosis total, medicamentos y el marcador objetivo. No todo suplemento cardiovascular apunta al mismo resultado.',
          },
        ],
      },
      en: {
        intro:
          'Omega-3 EPA/DHA maps directly to searches around triglycerides and heart health supplements. This page separates triglycerides, LDL, clinical dose context, fatty fish, capsules, and interactions.',
        highlights: [
          'The strongest intent for EPA/DHA is usually triglycerides, not broad heart-health promises.',
          'Form, dose, purity, digestive tolerance, anticoagulants, and planned surgery matter.',
          'When LDL, triglycerides, and cardiovascular risk are abnormal, professional lab review is important.',
        ],
        relatedLinks: [
          {
            title: 'Triglyceride supplement options',
            description:
              'Compare omega-3 with psyllium, plant sterols, and garlic by lab marker and search intent.',
            href: '/portal/category/cholesterol-triglycerides',
            label: 'Open lipid comparison',
          },
          {
            title: 'Psyllium for LDL',
            description:
              'Soluble fiber more focused on LDL cholesterol and digestive tolerance.',
            href: '/portal/supplement/fiber-psyllium?benefit=cholesterol-triglycerides',
            label: 'Compare psyllium',
          },
          {
            title: 'Heart health supplements',
            description:
              'Expand the context to CoQ10, garlic, blood pressure, and cardiovascular safety.',
            href: '/portal/category/heart-health',
            label: 'Open heart cluster',
          },
        ],
        faqHeading: 'Frequently asked questions about omega-3 and triglycerides',
        faqs: [
          {
            question: 'Is omega-3 more relevant for triglycerides or LDL cholesterol?',
            answer:
              'The clearest intent is usually triglycerides. LDL context is different and may require comparing diet, statins, soluble fiber, plant sterols, and cardiovascular risk.',
          },
          {
            question: 'What data matters before choosing omega-3?',
            answer:
              'Review triglycerides, LDL, medications, anticoagulants, bleeding history, planned surgery, fish intake, and digestive tolerance.',
          },
          {
            question: 'Can omega-3 be combined with other heart supplements?',
            answer:
              'It may be possible, but duplication, total dose, medications, and the target marker should be reviewed. Not every heart supplement points to the same outcome.',
          },
        ],
      },
    },
    'coenzyme-q10': {
      es: {
        intro:
          'Coenzima Q10 aparece dentro de la intención de suplemento cardiovascular, especialmente cuando el usuario compara energía celular, estatinas, presión arterial o insuficiencia cardíaca. Esta guía mantiene expectativas prudentes y separa esos contextos.',
        highlights: [
          'No es una respuesta general para todo riesgo cardiovascular; el contexto clínico cambia mucho la interpretación.',
          'Usuarios con estatinas suelen buscar CoQ10 por molestias musculares o energía, pero conviene revisar evidencia y medicamentos.',
          'Presión arterial, insuficiencia cardíaca, migraña y fatiga tienen preguntas distintas; no deben mezclarse como una sola promesa.',
        ],
        relatedLinks: [
          {
            title: 'Suplementos cardiovasculares',
            description:
              'Compara CoQ10 con omega-3 y ajo según objetivo, medicamentos y laboratorios.',
            href: '/portal/category/heart-health',
            label: 'Ver categoría cardiovascular',
          },
          {
            title: 'Omega-3 para triglicéridos',
            description:
              'Mejor encaje cuando el marcador principal que el usuario quiere interpretar son triglicéridos.',
            href: '/portal/supplement/omega-3?benefit=heart-health',
            label: 'Comparar omega-3',
          },
          {
            title: 'Colesterol y triglicéridos',
            description:
              'Cluster específico para búsquedas de triglicéridos, LDL, psyllium y esteroles vegetales.',
            href: '/portal/category/cholesterol-triglycerides',
            label: 'Ver cluster de lípidos',
          },
        ],
        faqHeading: 'Preguntas frecuentes sobre coenzima Q10 cardiovascular',
        faqs: [
          {
            question: '¿Coenzima Q10 es lo mismo que un suplemento para colesterol?',
            answer:
              'No. CoQ10 se relaciona más con energía celular y contextos cardiovasculares específicos. Para colesterol LDL o triglicéridos conviene revisar otras opciones y laboratorios.',
          },
          {
            question: '¿Por qué se menciona CoQ10 junto con estatinas?',
            answer:
              'Algunos usuarios la revisan por molestias musculares o niveles de CoQ10 durante tratamiento con estatinas. No conviene modificar medicamentos sin seguimiento profesional.',
          },
          {
            question: '¿Qué precauciones revisar antes de usar CoQ10?',
            answer:
              'Revisa anticoagulantes, antihipertensivos, tratamiento cardiovascular, embarazo, cirugía programada y el objetivo específico: presión, migraña, energía o contexto cardíaco.',
          },
        ],
      },
      en: {
        intro:
          'Coenzyme Q10 sits inside heart supplement intent, especially when users compare cellular energy, statins, blood pressure, or heart failure context. This guide keeps expectations careful and separates those contexts.',
        highlights: [
          'It is not a general answer for every cardiovascular risk; clinical context changes interpretation.',
          'Statin users often search CoQ10 for muscle symptoms or energy, but evidence and medications should be reviewed.',
          'Blood pressure, heart failure, migraine, and fatigue are different questions and should not be merged into one promise.',
        ],
        relatedLinks: [
          {
            title: 'Heart health supplements',
            description:
              'Compare CoQ10 with omega-3 and garlic by goal, medications, and lab context.',
            href: '/portal/category/heart-health',
            label: 'Open heart category',
          },
          {
            title: 'Omega-3 for triglycerides',
            description:
              'A better fit when the main marker the user wants to interpret is triglycerides.',
            href: '/portal/supplement/omega-3?benefit=heart-health',
            label: 'Compare omega-3',
          },
          {
            title: 'Cholesterol and triglycerides',
            description:
              'A specific cluster for triglycerides, LDL, psyllium, and plant sterols.',
            href: '/portal/category/cholesterol-triglycerides',
            label: 'Open lipid cluster',
          },
        ],
        faqHeading: 'Frequently asked questions about coenzyme Q10 and heart context',
        faqs: [
          {
            question: 'Is CoQ10 the same as a cholesterol supplement?',
            answer:
              'No. CoQ10 is more related to cellular energy and specific cardiovascular contexts. LDL cholesterol or triglyceride questions need different comparisons and lab context.',
          },
          {
            question: 'Why is CoQ10 mentioned with statins?',
            answer:
              'Some users review it because of muscle symptoms or CoQ10 levels during statin therapy. Medications should not be changed without professional follow-up.',
          },
          {
            question: 'What precautions matter before using CoQ10?',
            answer:
              'Review anticoagulants, blood pressure medications, cardiovascular treatment, pregnancy, planned surgery, and the specific goal: blood pressure, migraine, energy, or heart context.',
          },
        ],
      },
    },
    'bacopa-monnieri': {
      es: {
        intro:
          'Bacopa monnieri aparece en Search Console como una señal temprana de demanda orgánica. Esta guía resume su uso estudiado en memoria, atención y aprendizaje sin tratarla como solución rápida.',
        highlights: [
          'La evidencia suele evaluar extractos estandarizados y uso continuo durante varias semanas, no efectos inmediatos.',
          'El encaje más razonable es cognición, memoria o atención; no sustituye evaluación de problemas neurológicos, sueño o salud mental.',
          'La tolerancia digestiva, sedación leve y combinaciones con otros suplementos deben revisarse antes de usarla.',
        ],
        faqHeading: 'Preguntas frecuentes sobre Bacopa monnieri',
        faqs: [
          {
            question: '¿Bacopa monnieri funciona de inmediato?',
            answer:
              'No suele plantearse como suplemento de efecto inmediato. Los estudios generalmente evalúan uso constante durante semanas, por lo que conviene pensar en expectativas graduales y seguimiento de tolerancia.',
          },
          {
            question: '¿Para qué tipo de objetivo tiene más sentido revisar Bacopa?',
            answer:
              'Tiene más sentido investigarla cuando el objetivo es memoria, aprendizaje o atención. Si hay deterioro cognitivo, ansiedad importante o síntomas nuevos, la prioridad es una evaluación profesional.',
          },
          {
            question: '¿Qué precauciones importan con Bacopa monnieri?',
            answer:
              'Revisa molestias gastrointestinales, somnolencia, embarazo, lactancia, medicamentos sedantes y condiciones neurológicas. También importa distinguir el extracto y la dosis usados en estudios.',
          },
        ],
      },
      en: {
        intro:
          'Bacopa monnieri is an early organic demand signal in Search Console. This guide summarizes its studied use for memory, attention, and learning without framing it as a quick fix.',
        highlights: [
          'Evidence often evaluates standardized extracts and repeated use over several weeks, not immediate effects.',
          'The clearest fit is cognition, memory, or attention; it does not replace evaluation of neurologic, sleep, or mental health issues.',
          'Digestive tolerance, mild sedation, and combinations with other supplements should be reviewed before use.',
        ],
        faqHeading: 'Frequently asked questions about Bacopa monnieri',
        faqs: [
          {
            question: 'Does Bacopa monnieri work immediately?',
            answer:
              'It is not usually positioned as an immediate-effect supplement. Studies generally evaluate consistent use over weeks, so expectations should be gradual and tolerance should be monitored.',
          },
          {
            question: 'Which goal is Bacopa most relevant for?',
            answer:
              'It is most relevant to review for memory, learning, or attention goals. Cognitive decline, significant anxiety, or new symptoms should be evaluated professionally.',
          },
          {
            question: 'What precautions matter with Bacopa monnieri?',
            answer:
              'Review gastrointestinal effects, sleepiness, pregnancy, breastfeeding, sedative medications, and neurologic conditions. The extract and dose studied also matter.',
          },
        ],
      },
    },
    'vitamin-d': {
      es: {
        intro:
          'La búsqueda "suplemento de vitamina d" sugiere intención informativa amplia. Esta página ordena cuándo tiene sentido revisar vitamina D, qué papel tienen los análisis y por qué no conviene asumir deficiencia sin datos.',
        highlights: [
          'La suplementación es más clara cuando hay deficiencia, riesgo de baja exposición solar o indicación basada en laboratorio.',
          'El contexto principal es salud ósea y metabolismo de calcio; otros usos tienen evidencia más dependiente del perfil de la persona.',
          'Dosis altas sin seguimiento pueden elevar riesgos, por lo que los análisis y antecedentes médicos importan.',
        ],
        faqHeading: 'Preguntas frecuentes sobre vitamina D',
        faqs: [
          {
            question: '¿Cuándo tiene más sentido tomar vitamina D?',
            answer:
              'Tiene más sentido cuando hay deficiencia confirmada, poca exposición solar, dieta limitada o recomendación profesional. La decisión mejora cuando se interpreta junto con análisis y factores de riesgo.',
          },
          {
            question: '¿La vitamina D es sólo para huesos?',
            answer:
              'Su papel más establecido es en salud ósea, absorción de calcio y corrección de deficiencia. Otros objetivos se deben revisar con más cautela y contexto individual.',
          },
          {
            question: '¿Qué precauciones importan antes de suplementar?',
            answer:
              'Importan dosis total, calcio, enfermedad renal, antecedentes de cálculos, embarazo, medicamentos y niveles en sangre. Evita megadosis sin seguimiento.',
          },
        ],
      },
      en: {
        intro:
          'Vitamin D searches usually reflect broad informational intent. This page organizes when vitamin D is worth reviewing, why lab testing matters, and why deficiency should not be assumed without context.',
        highlights: [
          'Supplementation is clearest when deficiency, low sun exposure, or lab-guided need is present.',
          'The core context is bone health and calcium metabolism; other uses depend more on the person profile.',
          'High doses without follow-up can raise risks, so labs and medical history matter.',
        ],
        faqHeading: 'Frequently asked questions about vitamin D',
        faqs: [
          {
            question: 'When does vitamin D supplementation make the most sense?',
            answer:
              'It makes the most sense with confirmed deficiency, low sun exposure, limited diet, or professional guidance. Decisions are stronger when interpreted with labs and risk factors.',
          },
          {
            question: 'Is vitamin D only for bones?',
            answer:
              'Its most established role is bone health, calcium absorption, and correcting deficiency. Other goals should be reviewed with more caution and individual context.',
          },
          {
            question: 'What precautions matter before supplementing?',
            answer:
              'Total dose, calcium intake, kidney disease, kidney stone history, pregnancy, medications, and blood levels matter. Avoid high-dose use without follow-up.',
          },
        ],
      },
    },
    'hydrolyzed-collagen': {
      es: {
        intro:
          'Colágeno hidrolizado conecta con búsquedas recientes sobre collagen y collagenin. Esta guía ordena la evidencia para articulaciones, piel, tendones y expectativas realistas sin mezclarlo con promesas estéticas o clínicas fuertes.',
        highlights: [
          'La intención más clara suele ser articulaciones, piel o tejido conectivo; cada objetivo tiene evidencia y tiempos distintos.',
          'Importa distinguir colágeno hidrolizado, péptidos de colágeno y colágeno tipo II, porque no siempre se estudian igual.',
          'Para dolor articular persistente, lesiones o cambios de piel relevantes, la prioridad es evaluación profesional y hábitos base.',
        ],
        relatedLinks: [
          {
            title: 'Salud articular y ósea',
            description:
              'Compara colágeno hidrolizado con vitamina D y glucosamina dentro del cluster articular.',
            href: '/portal/category/joint-bone-health',
            label: 'Ver categoría articular',
          },
          {
            title: 'Proteína whey',
            description:
              'Útil para comparar colágeno con proteína completa cuando la intención es recuperación o masa muscular.',
            href: '/portal/supplement/whey-protein?benefit=muscle-gain',
            label: 'Comparar proteína whey',
          },
          {
            title: 'Vitamina D',
            description:
              'Referencia para usuarios que mezclan salud ósea, articulaciones y análisis de laboratorio.',
            href: '/portal/supplement/vitamin-d?benefit=joint-bone-health',
            label: 'Revisar vitamina D',
          },
        ],
        faqHeading: 'Preguntas frecuentes sobre colágeno hidrolizado',
        faqs: [
          {
            question: '¿Colágeno hidrolizado y péptidos de colágeno son lo mismo?',
            answer:
              'En muchas búsquedas se usan de forma parecida, pero conviene revisar la forma exacta estudiada. Colágeno tipo II, gelatina y péptidos hidrolizados pueden tener objetivos y dosis diferentes.',
          },
          {
            question: '¿Colágeno es más relevante para piel o articulaciones?',
            answer:
              'Depende de la intención. Hay estudios en piel, dolor articular y tejido conectivo, pero los desenlaces y tiempos de seguimiento no son iguales.',
          },
          {
            question: '¿Qué precauciones revisar?',
            answer:
              'Revisa alergias a la fuente del producto, proteína total de la dieta, enfermedad renal, embarazo, lactancia y si el objetivo real es dolor persistente o una lesión.',
          },
        ],
      },
      en: {
        intro:
          'Hydrolyzed collagen maps to recent searches around collagen and collagenin. This guide organizes evidence for joints, skin, tendons, and realistic expectations without broad cosmetic or clinical promises.',
        highlights: [
          'The clearest intent is usually joints, skin, or connective tissue; each goal has different evidence and timelines.',
          'Hydrolyzed collagen, collagen peptides, and type II collagen are not always studied the same way.',
          'Persistent joint pain, injuries, or notable skin changes deserve professional evaluation and basic habit review.',
        ],
        relatedLinks: [
          {
            title: 'Joint and bone health',
            description:
              'Compare hydrolyzed collagen with vitamin D and glucosamine in the joint cluster.',
            href: '/portal/category/joint-bone-health',
            label: 'Open joint category',
          },
          {
            title: 'Whey protein',
            description:
              'Useful when comparing collagen with complete protein for recovery or muscle mass intent.',
            href: '/portal/supplement/whey-protein?benefit=muscle-gain',
            label: 'Compare whey',
          },
          {
            title: 'Vitamin D',
            description:
              'Relevant when users mix bone health, joints, and lab testing questions.',
            href: '/portal/supplement/vitamin-d?benefit=joint-bone-health',
            label: 'Review vitamin D',
          },
        ],
        faqHeading: 'Frequently asked questions about hydrolyzed collagen',
        faqs: [
          {
            question: 'Are hydrolyzed collagen and collagen peptides the same?',
            answer:
              'Many searches use them similarly, but the exact studied form matters. Type II collagen, gelatin, and hydrolyzed peptides can have different goals and doses.',
          },
          {
            question: 'Is collagen more relevant for skin or joints?',
            answer:
              'It depends on intent. Studies exist in skin, joint pain, and connective tissue, but outcomes and follow-up timelines differ.',
          },
          {
            question: 'What precautions should be reviewed?',
            answer:
              'Review product source allergies, total dietary protein, kidney disease, pregnancy, breastfeeding, and whether the real goal is persistent pain or injury.',
          },
        ],
      },
    },
    'whey-protein': {
      es: {
        intro:
          'Proteína whey aparece en búsquedas recientes como proteina whey. Esta guía separa proteína diaria, entrenamiento, recuperación, masa muscular y tolerancia digestiva para usuarios que comparan suplementos deportivos.',
        highlights: [
          'La pregunta principal no es sólo el suplemento, sino si la proteína total diaria ya cubre el objetivo.',
          'Whey suele encajar mejor en entrenamiento, recuperación o conveniencia alimentaria que como solución aislada.',
          'Tolerancia a lactosa, alergia a leche, enfermedad renal y objetivos de peso cambian la decisión.',
        ],
        relatedLinks: [
          {
            title: 'Ganancia de músculo y ejercicio',
            description:
              'Compara whey con creatina y beta-alanina según objetivo de entrenamiento.',
            href: '/portal/category/muscle-gain',
            label: 'Ver categoría de músculo',
          },
          {
            title: 'Colágeno hidrolizado',
            description:
              'Comparación útil cuando la intención mezcla recuperación, articulaciones y proteína.',
            href: '/portal/supplement/hydrolyzed-collagen?benefit=joint-bone-health',
            label: 'Comparar colágeno',
          },
          {
            title: 'Cafeína para rendimiento',
            description:
              'Otra señal deportiva reciente, más enfocada en alerta y desempeño agudo.',
            href: '/portal/supplement/caffeine?benefit=sports-performance',
            label: 'Revisar cafeína',
          },
        ],
        faqHeading: 'Preguntas frecuentes sobre proteína whey',
        faqs: [
          {
            question: '¿Proteína whey es necesaria para ganar músculo?',
            answer:
              'No siempre. Puede ser conveniente si cuesta cubrir proteína diaria con alimentos, pero entrenamiento, calorías, sueño y constancia son determinantes.',
          },
          {
            question: '¿Whey es mejor que colágeno para músculo?',
            answer:
              'Whey es proteína completa y suele encajar mejor para masa muscular. Colágeno se revisa más por tejido conectivo, piel o articulaciones.',
          },
          {
            question: '¿Qué precauciones revisar?',
            answer:
              'Revisa alergia a leche, intolerancia a lactosa, enfermedad renal, proteína total diaria, objetivos de peso y calidad del producto.',
          },
        ],
      },
      en: {
        intro:
          'Whey protein maps to recent search intent around protein powder and training. This guide separates daily protein intake, recovery, muscle mass, and digestive tolerance.',
        highlights: [
          'The main question is whether total daily protein already fits the goal.',
          'Whey is often most useful for training, recovery, or food convenience rather than as an isolated answer.',
          'Lactose tolerance, milk allergy, kidney disease, and weight goals change the decision.',
        ],
        relatedLinks: [
          {
            title: 'Muscle gain and exercise',
            description:
              'Compare whey with creatine and beta-alanine by training goal.',
            href: '/portal/category/muscle-gain',
            label: 'Open muscle category',
          },
          {
            title: 'Hydrolyzed collagen',
            description:
              'Useful when intent mixes recovery, joints, and protein.',
            href: '/portal/supplement/hydrolyzed-collagen?benefit=joint-bone-health',
            label: 'Compare collagen',
          },
          {
            title: 'Caffeine for performance',
            description:
              'Another sports signal, more focused on alertness and acute performance.',
            href: '/portal/supplement/caffeine?benefit=sports-performance',
            label: 'Review caffeine',
          },
        ],
        faqHeading: 'Frequently asked questions about whey protein',
        faqs: [
          {
            question: 'Is whey protein required to gain muscle?',
            answer:
              'Not always. It can be convenient when food protein is hard to reach, but training, calories, sleep, and consistency are key.',
          },
          {
            question: 'Is whey better than collagen for muscle?',
            answer:
              'Whey is a complete protein and usually fits muscle mass goals better. Collagen is more often reviewed for connective tissue, skin, or joints.',
          },
          {
            question: 'What precautions matter?',
            answer:
              'Review milk allergy, lactose intolerance, kidney disease, total daily protein, weight goals, and product quality.',
          },
        ],
      },
    },
    caffeine: {
      es: {
        intro:
          'Cafeína aparece en señales recientes de rendimiento y energía. Esta guía ayuda a comparar cafeína para alerta, enfoque y ejercicio sin ignorar sueño, ansiedad, tolerancia y dosis total.',
        highlights: [
          'Tiene evidencia fuerte para alerta y rendimiento agudo, pero no reemplaza descanso ni corrige fatiga persistente.',
          'El horario importa: usarla tarde puede deteriorar sueño y empeorar el problema que se intenta resolver.',
          'Conviene sumar café, bebidas energéticas, pre-entrenos y cápsulas para entender la dosis total.',
        ],
        relatedLinks: [
          {
            title: 'Rendimiento deportivo',
            description:
              'Compara cafeína con creatina, beta-alanina y citrulina dentro del cluster deportivo.',
            href: '/portal/category/sports-performance',
            label: 'Ver rendimiento deportivo',
          },
          {
            title: 'Energía y fatiga',
            description:
              'Compara cafeína con rhodiola y vitamina B12 según causa probable de fatiga.',
            href: '/portal/category/energy',
            label: 'Ver energía y fatiga',
          },
          {
            title: 'L-teanina',
            description:
              'Relevante para usuarios que buscan foco calmado o combinaciones con cafeína.',
            href: '/portal/supplement/l-theanine?benefit=anxiety',
            label: 'Comparar L-teanina',
          },
        ],
        faqHeading: 'Preguntas frecuentes sobre cafeína',
        faqs: [
          {
            question: '¿Cafeína es mejor para energía o rendimiento deportivo?',
            answer:
              'Puede encajar en ambos contextos, pero son preguntas distintas. Para rendimiento se revisa timing y dosis; para fatiga conviene revisar sueño, estrés y causas persistentes.',
          },
          {
            question: '¿Qué precauciones importan?',
            answer:
              'Revisa ansiedad, insomnio, presión arterial, palpitaciones, embarazo, medicamentos estimulantes y consumo total de cafeína.',
          },
          {
            question: '¿Tiene sentido combinar cafeína con L-teanina?',
            answer:
              'Algunas personas la revisan para enfoque con menor sensación de nerviosismo, pero la tolerancia individual, sueño y dosis siguen siendo importantes.',
          },
        ],
      },
      en: {
        intro:
          'Caffeine maps to recent performance and energy signals. This guide compares caffeine for alertness, focus, and exercise while keeping sleep, anxiety, tolerance, and total dose in view.',
        highlights: [
          'It has strong evidence for alertness and acute performance, but it does not replace rest or explain persistent fatigue.',
          'Timing matters: late use can impair sleep and worsen the problem users are trying to fix.',
          'Coffee, energy drinks, pre-workouts, and capsules should be counted together.',
        ],
        relatedLinks: [
          {
            title: 'Sports performance',
            description:
              'Compare caffeine with creatine, beta-alanine, and citrulline in the sports cluster.',
            href: '/portal/category/sports-performance',
            label: 'Open sports performance',
          },
          {
            title: 'Energy and fatigue',
            description:
              'Compare caffeine with rhodiola and B12 by likely fatigue context.',
            href: '/portal/category/energy',
            label: 'Open energy category',
          },
          {
            title: 'L-theanine',
            description:
              'Relevant for users seeking calm focus or caffeine pairing.',
            href: '/portal/supplement/l-theanine?benefit=anxiety',
            label: 'Compare L-theanine',
          },
        ],
        faqHeading: 'Frequently asked questions about caffeine',
        faqs: [
          {
            question: 'Is caffeine better for energy or sports performance?',
            answer:
              'It can fit both contexts, but they are different questions. Performance focuses on timing and dose; fatigue should also review sleep, stress, and persistent causes.',
          },
          {
            question: 'What precautions matter?',
            answer:
              'Review anxiety, insomnia, blood pressure, palpitations, pregnancy, stimulant medications, and total caffeine intake.',
          },
          {
            question: 'Does caffeine pair well with L-theanine?',
            answer:
              'Some people review the pair for focus with less jitteriness, but individual tolerance, sleep, and dose still matter.',
          },
        ],
      },
    },
    'rhodiola-rosea': {
      es: {
        intro:
          'Rhodiola rosea aparece como señal orgánica temprana en fatiga, estrés y rendimiento mental. Esta guía separa adaptógeno, extracto, tolerancia y expectativas de uso gradual.',
        highlights: [
          'La intención más clara es fatiga relacionada con estrés o carga mental, no cansancio persistente sin explicación.',
          'Los estudios suelen depender del extracto y de la estandarización; no todos los productos son equivalentes.',
          'Sueño, ansiedad, depresión, tiroides, anemia y medicamentos pueden cambiar completamente la lectura.',
        ],
        relatedLinks: [
          {
            title: 'Energía y fatiga',
            description:
              'Compara rhodiola con cafeína, creatina y vitamina B12 según contexto de fatiga.',
            href: '/portal/category/energy',
            label: 'Ver energía y fatiga',
          },
          {
            title: 'Cafeína',
            description:
              'Contraste útil cuando el usuario busca efecto agudo de alerta frente a apoyo gradual.',
            href: '/portal/supplement/caffeine?benefit=energy',
            label: 'Comparar cafeína',
          },
          {
            title: 'L-teanina',
            description:
              'Opción relacionada cuando la intención mezcla estrés, enfoque y calma.',
            href: '/portal/supplement/l-theanine?benefit=anxiety',
            label: 'Revisar L-teanina',
          },
        ],
        faqHeading: 'Preguntas frecuentes sobre rhodiola rosea',
        faqs: [
          {
            question: '¿Rhodiola rosea es para fatiga o estrés?',
            answer:
              'Se revisa en ambos contextos, sobre todo cuando la fatiga se relaciona con estrés o carga mental. Fatiga persistente requiere revisar causas médicas y hábitos base.',
          },
          {
            question: '¿Importa el tipo de extracto?',
            answer:
              'Sí. La evidencia suele usar extractos estandarizados; comparar productos sin revisar extracto, concentración y dosis puede ser confuso.',
          },
          {
            question: '¿Qué precauciones revisar?',
            answer:
              'Revisa ansiedad, insomnio, trastorno bipolar, embarazo, lactancia, estimulantes, antidepresivos y medicamentos que afecten presión o sueño.',
          },
        ],
      },
      en: {
        intro:
          'Rhodiola rosea is an early organic signal around fatigue, stress, and mental performance. This guide separates adaptogen intent, extract type, tolerance, and gradual expectations.',
        highlights: [
          'The clearest intent is stress-related or mental-load fatigue, not unexplained persistent tiredness.',
          'Studies often depend on extract and standardization; not all products are equivalent.',
          'Sleep, anxiety, depression, thyroid status, anemia, and medications can change interpretation.',
        ],
        relatedLinks: [
          {
            title: 'Energy and fatigue',
            description:
              'Compare rhodiola with caffeine, creatine, and B12 by fatigue context.',
            href: '/portal/category/energy',
            label: 'Open energy category',
          },
          {
            title: 'Caffeine',
            description:
              'Useful contrast when users want acute alertness rather than gradual support.',
            href: '/portal/supplement/caffeine?benefit=energy',
            label: 'Compare caffeine',
          },
          {
            title: 'L-theanine',
            description:
              'Related when intent mixes stress, focus, and calm.',
            href: '/portal/supplement/l-theanine?benefit=anxiety',
            label: 'Review L-theanine',
          },
        ],
        faqHeading: 'Frequently asked questions about rhodiola rosea',
        faqs: [
          {
            question: 'Is rhodiola more relevant for fatigue or stress?',
            answer:
              'It is reviewed in both contexts, especially when fatigue is tied to stress or mental load. Persistent fatigue deserves medical and lifestyle review.',
          },
          {
            question: 'Does extract type matter?',
            answer:
              'Yes. Evidence often uses standardized extracts; comparing products without checking extract, concentration, and dose can be misleading.',
          },
          {
            question: 'What precautions matter?',
            answer:
              'Review anxiety, insomnia, bipolar disorder, pregnancy, breastfeeding, stimulants, antidepressants, and medications affecting blood pressure or sleep.',
          },
        ],
      },
    },
    citrulline: {
      es: {
        intro:
          'Citrulina aparece como señal reciente de intención deportiva. Esta guía explica su relación con óxido nítrico, flujo sanguíneo, entrenamiento y tolerancia sin presentarla como respuesta universal para rendimiento.',
        highlights: [
          'La intención principal suele ser rendimiento deportivo o sensación de bombeo durante entrenamiento.',
          'Citrulina y citrulina malato se usan en contextos parecidos, pero dosis y formulación pueden variar.',
          'Presión arterial, medicamentos vasodilatadores y entrenamiento real cambian la interpretación.',
        ],
        relatedLinks: [
          {
            title: 'Rendimiento deportivo',
            description:
              'Compara citrulina con creatina, cafeína y beta-alanina por objetivo de entrenamiento.',
            href: '/portal/category/sports-performance',
            label: 'Ver rendimiento deportivo',
          },
          {
            title: 'Cafeína',
            description:
              'Más enfocada en alerta y rendimiento agudo que en flujo sanguíneo.',
            href: '/portal/supplement/caffeine?benefit=sports-performance',
            label: 'Comparar cafeína',
          },
          {
            title: 'Proteína whey',
            description:
              'Complementa la intención deportiva cuando el foco es recuperación o músculo.',
            href: '/portal/supplement/whey-protein?benefit=muscle-gain',
            label: 'Revisar whey',
          },
        ],
        faqHeading: 'Preguntas frecuentes sobre citrulina',
        faqs: [
          {
            question: '¿Citrulina es más relevante para rendimiento o salud cardiovascular?',
            answer:
              'En el portal encaja principalmente con rendimiento deportivo y flujo sanguíneo durante entrenamiento. La lectura cardiovascular requiere más contexto médico.',
          },
          {
            question: '¿Citrulina y citrulina malato son iguales?',
            answer:
              'Se relacionan, pero no son idénticas. La formulación puede cambiar dosis, tolerancia y comparación con estudios.',
          },
          {
            question: '¿Qué precauciones revisar?',
            answer:
              'Revisa presión arterial baja, antihipertensivos, nitratos, cirugía programada, enfermedad cardiovascular y tolerancia gastrointestinal.',
          },
        ],
      },
      en: {
        intro:
          'Citrulline maps to recent sports-intent signals. This guide explains nitric oxide, blood-flow context, training, and tolerance without framing it as a universal performance answer.',
        highlights: [
          'The main intent is usually sports performance or pump sensation during training.',
          'Citrulline and citrulline malate are used in related contexts, but dose and formulation can differ.',
          'Blood pressure, vasodilator medications, and actual training context change interpretation.',
        ],
        relatedLinks: [
          {
            title: 'Sports performance',
            description:
              'Compare citrulline with creatine, caffeine, and beta-alanine by training goal.',
            href: '/portal/category/sports-performance',
            label: 'Open sports performance',
          },
          {
            title: 'Caffeine',
            description:
              'More focused on alertness and acute performance than blood-flow context.',
            href: '/portal/supplement/caffeine?benefit=sports-performance',
            label: 'Compare caffeine',
          },
          {
            title: 'Whey protein',
            description:
              'Complements sports intent when recovery or muscle is the focus.',
            href: '/portal/supplement/whey-protein?benefit=muscle-gain',
            label: 'Review whey',
          },
        ],
        faqHeading: 'Frequently asked questions about citrulline',
        faqs: [
          {
            question: 'Is citrulline more relevant for performance or heart health?',
            answer:
              'In this portal it fits primarily with sports performance and blood-flow context during training. Cardiovascular interpretation needs more medical context.',
          },
          {
            question: 'Are citrulline and citrulline malate the same?',
            answer:
              'They are related but not identical. Formulation can change dose, tolerance, and comparison with studies.',
          },
          {
            question: 'What precautions matter?',
            answer:
              'Review low blood pressure, blood pressure medications, nitrates, planned surgery, cardiovascular disease, and digestive tolerance.',
          },
        ],
      },
    },
    'saw-palmetto': {
      es: {
        intro:
          'Saw palmetto apareció como señal de Search Console en las últimas 24 horas. Esta guía lo ubica en salud prostática y síntomas urinarios, con expectativas prudentes y revisión de medicamentos.',
        highlights: [
          'La intención suele ser próstata, síntomas urinarios o comparación con opciones para hombres.',
          'No debe usarse para ignorar síntomas nuevos, dolor, sangre en orina o cambios importantes.',
          'Medicamentos hormonales, anticoagulantes y cirugía programada cambian la seguridad.',
        ],
        relatedLinks: [
          {
            title: 'Salud masculina',
            description:
              'Compara saw palmetto con zinc y otros temas de vitalidad masculina.',
            href: '/portal/category/mens-health',
            label: 'Ver salud masculina',
          },
          {
            title: 'Zinc',
            description:
              'Opción relacionada cuando la búsqueda se mueve hacia fertilidad, testosterona o deficiencia.',
            href: '/portal/supplement/zinc?benefit=mens-health',
            label: 'Revisar zinc',
          },
          {
            title: 'Vitamina D',
            description:
              'Referencia transversal si el usuario busca hormonas, huesos o deficiencia.',
            href: '/portal/supplement/vitamin-d?benefit=hormonal-health',
            label: 'Revisar vitamina D',
          },
        ],
        faqHeading: 'Preguntas frecuentes sobre saw palmetto',
        faqs: [
          {
            question: '¿Saw palmetto se revisa por próstata?',
            answer:
              'Sí, la intención más común es salud prostática o síntomas urinarios. Eso no reemplaza evaluación médica si hay síntomas nuevos o relevantes.',
          },
          {
            question: '¿Qué señales requieren evaluación antes de suplementar?',
            answer:
              'Dolor, fiebre, sangre en orina, dificultad importante para orinar o cambios rápidos deben revisarse con un profesional.',
          },
          {
            question: '¿Qué precauciones importan?',
            answer:
              'Revisa anticoagulantes, medicamentos hormonales, cirugía programada, antecedentes prostáticos y seguimiento de laboratorio cuando aplique.',
          },
        ],
      },
      en: {
        intro:
          'Saw palmetto appeared as a recent Search Console signal. This guide places it in prostate and urinary-symptom context with careful expectations and medication review.',
        highlights: [
          'Intent is usually prostate, urinary symptoms, or men’s health comparison.',
          'It should not be used to ignore new symptoms, pain, blood in urine, or major changes.',
          'Hormonal medications, anticoagulants, and planned surgery change safety context.',
        ],
        relatedLinks: [
          {
            title: 'Men’s health',
            description:
              'Compare saw palmetto with zinc and other men’s health topics.',
            href: '/portal/category/mens-health',
            label: 'Open men’s health',
          },
          {
            title: 'Zinc',
            description:
              'Related when searches move toward fertility, testosterone, or deficiency.',
            href: '/portal/supplement/zinc?benefit=mens-health',
            label: 'Review zinc',
          },
          {
            title: 'Vitamin D',
            description:
              'Cross-reference when users search hormones, bones, or deficiency.',
            href: '/portal/supplement/vitamin-d?benefit=hormonal-health',
            label: 'Review vitamin D',
          },
        ],
        faqHeading: 'Frequently asked questions about saw palmetto',
        faqs: [
          {
            question: 'Is saw palmetto mainly reviewed for prostate context?',
            answer:
              'Yes, the common intent is prostate health or urinary symptoms. That does not replace medical evaluation when symptoms are new or relevant.',
          },
          {
            question: 'Which signs should be evaluated before supplementing?',
            answer:
              'Pain, fever, blood in urine, major difficulty urinating, or rapid changes should be reviewed with a professional.',
          },
          {
            question: 'What precautions matter?',
            answer:
              'Review anticoagulants, hormonal medications, planned surgery, prostate history, and lab follow-up when relevant.',
          },
        ],
      },
    },
    'l-theanine': {
      es: {
        intro:
          'L-teanina aparece en el catálogo y conecta con búsquedas sobre "theanine" y relajación. Esta guía la presenta como aminoácido estudiado para calma, enfoque y sueño ligero, con expectativas prudentes.',
        highlights: [
          'Puede ser más relevante para calma sin somnolencia intensa que para insomnio clínico.',
          'Con cafeína se suele revisar por enfoque calmado; para sueño conviene separar horario, dosis y sedantes.',
          'La evidencia y tolerancia dependen del objetivo: ansiedad leve, enfoque o calidad subjetiva del descanso.',
        ],
        faqHeading: 'Preguntas frecuentes sobre L-teanina',
        faqs: [
          {
            question: '¿L-teanina es lo mismo que theanine?',
            answer:
              'En búsquedas comunes suelen referirse al mismo ingrediente. L-teanina es la forma más usada para describir este aminoácido presente en el té.',
          },
          {
            question: '¿L-teanina es más relevante para sueño o enfoque?',
            answer:
              'Depende del contexto. Algunas personas la revisan para calma y enfoque, especialmente con cafeína; otras para relajación nocturna. No sustituye evaluación de insomnio persistente o ansiedad importante.',
          },
          {
            question: '¿Qué precauciones revisar?',
            answer:
              'Revisa sedantes, alcohol, embarazo, lactancia, presión arterial baja, somnolencia diurna y combinaciones con cafeína u otros suplementos.',
          },
        ],
      },
      en: {
        intro:
          'L-theanine is in the catalog and maps to searches around "theanine" and relaxation. This guide frames it as an amino acid studied for calm, focus, and light sleep support with careful expectations.',
        highlights: [
          'It may be more relevant for calm without heavy sleepiness than for clinical insomnia.',
          'With caffeine, it is often reviewed for calm focus; for sleep, timing, dose, and sedatives matter.',
          'Evidence and tolerance depend on the goal: mild anxiety, focus, or subjective sleep quality.',
        ],
        faqHeading: 'Frequently asked questions about L-theanine',
        faqs: [
          {
            question: 'Is L-theanine the same as theanine?',
            answer:
              'In common searches they usually refer to the same ingredient. L-theanine is the more specific name for this amino acid found in tea.',
          },
          {
            question: 'Is L-theanine more relevant for sleep or focus?',
            answer:
              'It depends on context. Some people review it for calm focus, especially with caffeine; others for nighttime relaxation. It does not replace evaluation of persistent insomnia or significant anxiety.',
          },
          {
            question: 'What precautions should be reviewed?',
            answer:
              'Review sedatives, alcohol, pregnancy, breastfeeding, low blood pressure, daytime sleepiness, and combinations with caffeine or other supplements.',
          },
        ],
      },
    },
  };

  return content[slug]?.[locale] || null;
}

export function localizedSupplementAlternates(path: string) {
  return {
    es: localizedPath('es', path),
    en: localizedPath('en', path),
    'x-default': localizedPath('es', path),
  };
}

export function buildSupplementStructuredData(data: SupplementSeoData, locale: SeoLocale) {
  const path = `/portal/supplement/${data.slug}`;
  const pageUrl = localizedPath(locale, path);
  const inLanguage = locale === 'es' ? 'es-MX' : 'en';
  const pageName = buildSupplementTitle(data, locale);
  const description = buildSupplementDescription(data, locale);

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'MedicalWebPage',
      '@id': `${pageUrl}#webpage`,
      name: pageName,
      description,
      url: pageUrl,
      inLanguage,
      isPartOf: {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
      },
      about: {
        '@type': 'Thing',
        name: data.localizedName,
        alternateName: data.canonicalName === data.localizedName ? undefined : data.canonicalName,
        description: sanitizeSupplementSeoText(data.summary),
      },
      audience: {
        '@type': 'Audience',
        audienceType: locale === 'es' ? 'Personas investigando suplementos' : 'People researching supplements',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'SuplementAI',
          item: localizedPath(locale, '/portal'),
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Portal',
          item: localizedPath(locale, '/portal'),
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: data.localizedName,
          item: pageUrl,
        },
      ],
    },
  ];
}

export function generateSupplementStaticParams() {
  return seoLocales.flatMap((locale) =>
    getUniqueSupplements().map((supplement) => ({
      locale,
      slug: supplement.slug,
    }))
  );
}

export function generateSupplementMetadata(locale: string, slug: string): Metadata {
  const seoLocale: SeoLocale = locale === 'en' ? 'en' : 'es';
  const data = getSupplementSeoData(slug, seoLocale);

  if (!data) {
    return {};
  }

  const path = `/portal/supplement/${slug}`;
  const title = buildSupplementTitle(data, seoLocale);
  const description = buildSupplementDescription(data, seoLocale);

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical: localizedPath(seoLocale, path),
      languages: localizedSupplementAlternates(path),
    },
    openGraph: {
      type: 'article',
      locale: seoLocale === 'es' ? 'es_MX' : 'en_US',
      url: localizedPath(seoLocale, path),
      title,
      description,
      siteName: 'SuplementAI',
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: ['/icon.svg'],
    },
  };
}
