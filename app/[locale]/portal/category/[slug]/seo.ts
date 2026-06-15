export type CategorySeoContent = {
  intro: string;
  highlights: string[];
  priorityTopics?: Array<{
    title: string;
    description: string;
    supplementSlug: string;
    searchLabel: string;
  }>;
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
  supplementLinksHeading: string;
};

export function buildCategorySeoCopy({
  slug,
  categoryName,
  categoryDescription,
  locale,
}: {
  slug: string;
  categoryName: string;
  categoryDescription: string;
  locale: 'es' | 'en';
}) {
  const targetedCopy: Record<string, Record<'es' | 'en', { title: string; description: string }>> = {
    'cholesterol-triglycerides': {
      es: {
        title: 'Suplementos para triglicéridos: omega-3, psyllium y LDL',
        description:
          'Compara omega-3, psyllium, esteroles y CoQ10 para triglicéridos, colesterol LDL y salud cardiovascular con evidencia prudente.',
      },
      en: {
        title: 'Cholesterol and triglyceride supplements: psyllium and omega-3',
        description:
          'Compare psyllium fiber, omega-3, plant sterols, and garlic by evidence, safety, and fit for LDL or triglyceride goals.',
      },
    },
    sleep: {
      es: {
        title: 'Suplementos para dormir: evidencia, seguridad y opciones',
        description:
          'Compara melatonina, magnesio, lavanda y valeriana para dormir mejor con evidencia, seguridad y uso responsable.',
      },
      en: {
        title: 'Sleep supplements compared: melatonin, magnesium, lavender',
        description:
          'Compare melatonin, magnesium, lavender, and valerian by evidence, safety, and fit for sleep quality or timing issues.',
      },
    },
    'heart-health': {
      es: {
        title: 'Suplementos cardiovasculares: omega-3, CoQ10 y seguridad',
        description:
          'Compara omega-3, coenzima Q10, ajo y fibra para salud cardiovascular, triglicéridos, interacciones y uso responsable.',
      },
      en: {
        title: 'Supplements for heart health: evidence, safety, and options',
        description:
          'Review omega-3, coenzyme Q10, and garlic for heart health with evidence level, safety context, and responsible-use guidance.',
      },
    },
    energy: {
      es: {
        title: 'Suplementos para energía y fatiga: cafeína, rhodiola y B12',
        description:
          'Compara cafeína, rhodiola, creatina y nutrientes como B12 o hierro según contexto de cansancio, sueño, dieta, entrenamiento y seguridad.',
      },
      en: {
        title: 'Energy and fatigue supplements: caffeine, rhodiola, B12',
        description:
          'Compare caffeine, rhodiola, creatine, and nutrients such as B12 or iron by fatigue context, sleep, diet, training, and safety.',
      },
    },
    'anxiety': {
      es: {
        title: 'Suplementos para estrés y calma: ashwagandha, teanina y manzanilla',
        description: 'Compara ashwagandha, L-teanina y manzanilla por evidencia, tolerancia, somnolencia, medicamentos y contexto de estrés cotidiano.'
      },
      en: {
        title: 'Stress and calm supplements: ashwagandha, theanine, chamomile',
        description: 'Compare ashwagandha, L-theanine, and chamomile by evidence, tolerability, drowsiness, medications, and everyday stress context.'
      }
    },
    'muscle-gain': {
      es: {
        title: 'Suplementos para músculo y fuerza: proteína, creatina y beta-alanina',
        description: 'Compara proteína de suero, creatina y beta-alanina según entrenamiento, ingesta de proteína, tolerancia digestiva y objetivos de fuerza.'
      },
      en: {
        title: 'Muscle and strength supplements: protein, creatine, beta-alanine',
        description: 'Compare whey protein, creatine, and beta-alanine by training context, protein intake, digestive tolerance, and strength goals.'
      }
    },
    'cognitive-function': {
      es: {
        title: 'Suplementos para memoria y concentración: omega-3, bacopa y ginkgo',
        description: 'Compara omega-3, bacopa y ginkgo por evidencia, edad, carga mental, medicamentos, sueño y seguridad.'
      },
      en: {
        title: 'Memory and focus supplements: omega-3, bacopa, and ginkgo',
        description: 'Compare omega-3, bacopa, and ginkgo by evidence, age, mental-load context, medications, sleep, and safety.'
      }
    },
    'joint-bone-health': {
      es: {
        title: 'Suplementos para articulaciones y huesos: vitamina D, glucosamina y colágeno',
        description: 'Compara vitamina D, glucosamina y colágeno hidrolizado por movilidad, salud ósea, entrenamiento, edad, seguridad y seguimiento.'
      },
      en: {
        title: 'Joint and bone supplements: vitamin D, glucosamine, collagen',
        description: 'Compare vitamin D, glucosamine, and hydrolyzed collagen by mobility, bone health, training, age, safety, and follow-up.'
      }
    },
    'skin-hair-health': {
      es: {
        title: 'Suplementos para piel y cabello: colágeno, biotina y vitamina C',
        description: 'Compara colágeno, biotina y vitamina C según dieta, deficiencias, piel, cabello, uñas, seguridad y expectativas realistas.'
      },
      en: {
        title: 'Skin and hair supplements: collagen, biotin, and vitamin C',
        description: 'Compare collagen, biotin, and vitamin C by diet, deficiencies, skin, hair, nails, safety, and realistic expectations.'
      }
    },
    'immunity': {
      es: {
        title: 'Suplementos para inmunidad: vitamina C, zinc y equinácea',
        description: 'Compara vitamina C, zinc y equinácea por dieta, deficiencias, temporada, medicamentos, tolerancia y uso responsable.'
      },
      en: {
        title: 'Immune support supplements: vitamin C, zinc, and echinacea',
        description: 'Compare vitamin C, zinc, and echinacea by diet, deficiencies, seasonal context, medications, tolerance, and responsible use.'
      }
    },
    'mens-health': {
      es: {
        title: 'Suplementos para salud masculina: próstata, zinc y vitalidad',
        description: 'Compara saw palmetto, zinc y vitamina D por próstata, dieta, deficiencias, medicamentos, edad y señales que requieren evaluación profesional.'
      },
      en: {
        title: 'Men’s health supplements: prostate context, zinc, and vitality',
        description: 'Compare saw palmetto, zinc, and vitamin D by prostate context, diet, deficiencies, medications, age, and signs that need professional review.'
      }
    },
    'womens-health': {
      es: {
        title: 'Suplementos para salud femenina: folato, hierro y calcio',
        description: 'Compara folato, hierro y calcio por ciclo menstrual, embarazo, dieta, laboratorios, salud ósea y señales que requieren evaluación profesional.'
      },
      en: {
        title: 'Women’s health supplements: folate, iron, and calcium',
        description: 'Compare folate, iron, and calcium by menstrual cycle, pregnancy context, diet, labs, bone health, and signs that need professional review.'
      }
    },
    'blood-sugar': {
      es: {
        title: 'Suplementos para glucosa: berberina, psyllium y canela',
        description: 'Compara berberina, psyllium, canela y magnesio por glucosa, comidas, laboratorios, medicamentos, tolerancia y seguridad.'
      },
      en: {
        title: 'Blood sugar supplements: berberine, psyllium, and cinnamon',
        description: 'Compare berberine, psyllium, cinnamon, and magnesium by glucose context, meals, labs, medications, tolerance, and safety.'
      }
    },
    'inflammation': {
      es: {
        title: 'Suplementos para inflamación: curcumina, omega-3 y boswellia',
        description: 'Compara curcumina, omega-3, jengibre y boswellia por dolor, recuperación, marcadores, medicamentos, cirugía y seguridad.'
      },
      en: {
        title: 'Inflammation supplements: curcumin, omega-3, and boswellia',
        description: 'Compare curcumin, omega-3, ginger, and boswellia by pain context, recovery, markers, medications, surgery, and safety.'
      }
    },
    'sports-performance': {
      es: {
        title: 'Suplementos para rendimiento deportivo: creatina y cafeína',
        description: 'Compara creatina, cafeína, beta-alanina y citrulina por fuerza, resistencia, timing, tolerancia, entrenamiento y seguridad.'
      },
      en: {
        title: 'Sports performance supplements: creatine and caffeine',
        description: 'Compare creatine, caffeine, beta-alanine, and citrulline by strength, endurance, timing, tolerance, training, and safety.'
      }
    },
    'hormonal-health': {
      es: {
        title: 'Suplementos para salud hormonal: inositol, vitamina D y zinc',
        description: 'Compara inositol, vitamina D, zinc y magnesio por ciclo, SOP, dieta, laboratorios, síntomas y seguridad.'
      },
      en: {
        title: 'Hormonal health supplements: inositol, vitamin D, and zinc',
        description: 'Compare inositol, vitamin D, zinc, and magnesium by cycle context, PCOS, diet, labs, symptoms, and safety.'
      }
    },
    'migraine-headache': {
      es: {
        title: 'Suplementos en contexto de migraña: magnesio, B2 y CoQ10',
        description: 'Compara magnesio, riboflavina, CoQ10 y melatonina por patrón de dolor, sueño, deficiencias, medicamentos y señales de alarma.'
      },
      en: {
        title: 'Migraine context supplements: magnesium, B2, and CoQ10',
        description: 'Compare magnesium, riboflavin, CoQ10, and melatonin by headache pattern, sleep, deficiencies, medications, and warning signs.'
      }
    },
    'common-deficiencies': {
      es: {
        title: 'Deficiencias comunes: vitamina D, hierro, B12, folato y zinc',
        description:
          'Compara vitamina D, hierro, B12, folato y zinc cuando se sospecha una deficiencia: qué se evalúa con análisis, señales frecuentes y cuándo consultar a un profesional.',
      },
      en: {
        title: 'Common deficiencies: vitamin D, iron, B12, folate, and zinc',
        description:
          'Compare vitamin D, iron, B12, folate, and zinc when a deficiency is suspected: what labs assess, common signs, and when to talk to a professional.',
      },
    },
  };

  const targeted = targetedCopy[slug]?.[locale];

  if (targeted) {
    return targeted;
  }

  return locale === 'es'
    ? {
      title: `Suplementos para ${categoryName.toLowerCase()} con evidencia científica`,
      description: `${categoryDescription} Compara suplementos por nivel de evidencia, estudios y uso responsable en México.`,
    }
    : {
      title: `Evidence-based supplements for ${categoryName}`,
      description: `${categoryDescription} Compare supplements by evidence level, studies, and responsible use.`,
    };
}

export function buildCategorySeoContent(slug: string, locale: 'es' | 'en'): CategorySeoContent | null {
  const content: Record<string, Record<'es' | 'en', CategorySeoContent>> = {
    sleep: {
      es: {
        intro:
          'Esta guía compara suplementos estudiados para calidad del sueño, latencia para dormir y descanso nocturno. El objetivo no es prometer resultados, sino ordenar las opciones por evidencia, seguridad y contexto de uso responsable.',
        highlights: [
          'Melatonina suele ser más relevante cuando el problema tiene relación con horario, jet lag o trabajo por turnos.',
          'Magnesio puede tener más sentido cuando hay ingesta baja, calambres o datos compatibles con deficiencia.',
          'Lavanda y valeriana se revisan como opciones herbales, con evidencia más variable y efectos que dependen de la preparación.',
        ],
        faqHeading: 'Preguntas frecuentes sobre suplementos para dormir',
        faqs: [
          {
            question: '¿Cuál es el suplemento con mejor evidencia para dormir?',
            answer:
              'Depende del problema principal. Melatonina tiene mejor soporte para ritmo circadiano; magnesio puede ser útil cuando hay ingesta baja o deficiencia. Para insomnio persistente conviene evaluar causas médicas, hábitos de sueño y medicamentos.',
          },
          {
            question: '¿Estos suplementos sustituyen un tratamiento para insomnio?',
            answer:
              'No. Esta página ayuda a comparar evidencia publicada, pero no reemplaza evaluación clínica, terapia cognitivo-conductual para insomnio ni tratamiento indicado por un profesional.',
          },
          {
            question: '¿Qué debo revisar antes de combinar suplementos para sueño?',
            answer:
              'Revisa somnolencia diurna, alcohol, sedantes, antidepresivos, embarazo, lactancia y condiciones neurológicas. Si hay ronquidos fuertes o pausas respiratorias, primero hay que descartar apnea del sueño.',
          },
        ],
        supplementLinksHeading: 'Guías de suplementos para sueño',
      },
      en: {
        intro:
          'This guide compares supplements studied for sleep quality, time to fall asleep, and overnight rest. The goal is not to promise outcomes, but to organize options by evidence, safety context, and responsible use.',
        highlights: [
          'Melatonin is usually most relevant when the issue is related to timing, jet lag, or shift work.',
          'Magnesium may be more relevant when intake is low, cramps are present, or deficiency is plausible.',
          'Lavender and valerian are reviewed as herbal options, with more variable evidence and preparation-dependent effects.',
        ],
        faqHeading: 'Frequently asked questions about sleep supplements',
        faqs: [
          {
            question: 'Which supplement has the strongest evidence for sleep?',
            answer:
              'It depends on the main sleep issue. Melatonin has better support for circadian rhythm problems, while magnesium may matter more when intake is low or deficiency is present. Persistent insomnia deserves review of medical causes, sleep habits, and medications.',
          },
          {
            question: 'Do these supplements replace insomnia treatment?',
            answer:
              'No. This page helps compare published evidence, but it does not replace clinical evaluation, cognitive behavioral therapy for insomnia, or treatment recommended by a professional.',
          },
          {
            question: 'What should I check before combining sleep supplements?',
            answer:
              'Check daytime sleepiness, alcohol use, sedatives, antidepressants, pregnancy, breastfeeding, and neurologic conditions. Loud snoring or breathing pauses should be evaluated for sleep apnea first.',
          },
        ],
        supplementLinksHeading: 'Sleep supplement guides',
      },
    },
    'cholesterol-triglycerides': {
      es: {
        intro:
          'Esta página responde a búsquedas reales sobre suplementos para triglicéridos, omega 3 triglycerides y colesterol. Compara omega-3, psyllium, esteroles vegetales, ajo y CoQ10 por intención de búsqueda, laboratorio objetivo y seguridad, sin prometer resultados clínicos.',
        highlights: [
          'Si buscas "suplementos triglicéridos", omega-3 EPA/DHA suele ser la opción con intención más directa.',
          'Psyllium y esteroles vegetales se revisan sobre todo cuando el foco es colesterol LDL.',
          'CoQ10 pertenece más al cluster cardiovascular general; no reemplaza la comparación específica de LDL o triglicéridos.',
          'La decisión debe partir de LDL, triglicéridos, no-HDL, dieta, riesgo cardiovascular y medicamentos actuales.',
          'Ajo puede tener efectos pequeños y variables; la preparación y la dosis cambian mucho el resultado.',
        ],
        priorityTopics: [
          {
            title: 'Psyllium fiber para LDL',
            description:
              'Fibra soluble estudiada para LDL cuando se usa con constancia, dieta adecuada y seguimiento de laboratorios.',
            supplementSlug: 'fiber-psyllium',
            searchLabel: 'Ver guía de psyllium fiber',
          },
          {
            title: 'Omega-3 para triglicéridos',
            description:
              'EPA/DHA tiene mejor encaje cuando el objetivo principal son triglicéridos; conviene revisar dosis, medicamentos y riesgo cardiovascular.',
            supplementSlug: 'omega-3',
            searchLabel: 'Ver guía de omega-3',
          },
          {
            title: 'Esteroles vegetales para LDL',
            description:
              'Opción enfocada en absorción intestinal de colesterol, con efectos moderados y dependientes de uso consistente.',
            supplementSlug: 'plant-sterols',
            searchLabel: 'Ver guía de esteroles vegetales',
          },
        ],
        relatedLinks: [
          {
            title: 'Cluster cardiovascular',
            description:
              'Conecta triglicéridos, presión arterial y riesgo cardiovascular con opciones como omega-3, coenzima Q10 y ajo.',
            href: '/portal/category/heart-health',
            label: 'Ver suplementos cardiovasculares',
          },
          {
            title: 'Coenzima Q10 cardiovascular',
            description:
              'Útil para usuarios que llegan buscando apoyo cardiovascular y quieren entender energía celular, estatinas e interacciones.',
            href: '/portal/supplement/coenzyme-q10?benefit=heart-health',
            label: 'Revisar CoQ10',
          },
          {
            title: 'Omega-3 EPA/DHA',
            description:
              'Guía específica para usuarios que llegan por omega 3 triglycerides y quieren separar EPA/DHA, dosis y seguridad.',
            href: '/portal/supplement/omega-3?benefit=cholesterol-triglycerides',
            label: 'Revisar omega-3',
          },
          {
            title: 'Ajo y lípidos',
            description:
              'Opción de evidencia variable que conviene comparar con psyllium, omega-3 y esteroles vegetales.',
            href: '/portal/supplement/garlic?benefit=cholesterol-triglycerides',
            label: 'Revisar ajo',
          },
        ],
        faqHeading: 'Preguntas frecuentes sobre colesterol y triglicéridos',
        faqs: [
          {
            question: '¿Qué suplemento revisar primero para triglicéridos altos?',
            answer:
              'Omega-3 EPA/DHA tiene soporte consistente en estudios de triglicéridos, especialmente en dosis clínicas. Debe revisarse con un profesional si ya se usan anticoagulantes, estatinas u otros medicamentos.',
          },
          {
            question: '¿Qué opciones se enfocan más en colesterol LDL?',
            answer:
              'Psyllium y esteroles vegetales tienen evidencia para cambios modestos en LDL cuando se usan de forma constante junto con dieta adecuada.',
          },
          {
            question: '¿Cómo elegir entre psyllium, omega-3 y esteroles vegetales?',
            answer:
              'Empieza por el laboratorio que quieres interpretar: LDL, triglicéridos, HDL y no-HDL. Psyllium y esteroles se revisan más por LDL; omega-3 por triglicéridos. Medicamentos, dieta y riesgo cardiovascular cambian la decisión.',
          },
          {
            question: '¿Omega-3 es la primera opción cuando busco omega 3 triglycerides?',
            answer:
              'Es la guía más directa para esa intención de búsqueda, pero conviene revisar EPA/DHA, dosis, anticoagulantes, LDL, consumo de pescado y seguimiento médico si los triglicéridos están muy elevados.',
          },
          {
            question: '¿Qué significa buscar suplementos para triglicéridos?',
            answer:
              'Normalmente significa que hay un resultado de laboratorio o una preocupación cardiometabólica. Antes de elegir un suplemento conviene revisar alcohol, azúcares, peso, dieta, medicamentos y si el valor requiere manejo médico.',
          },
          {
            question: '¿Puedo usar suplementos en lugar de medicamento para colesterol?',
            answer:
              'No conviene tomar esa decisión sin seguimiento médico. Los suplementos pueden apoyar hábitos y marcadores, pero no sustituyen estatinas u otros tratamientos cuando están indicados por riesgo cardiovascular.',
          },
        ],
        supplementLinksHeading: 'Guías de suplementos para lípidos',
      },
      en: {
        intro:
          'This page compares supplements researched for LDL cholesterol, triglycerides, and other lipid markers. It gives psyllium fiber, omega-3, and plant sterols clearer context without promising clinical outcomes.',
        highlights: [
          'Psyllium and plant sterols are more focused on modest LDL cholesterol reductions.',
          'Omega-3 EPA/DHA has stronger evidence for triglycerides than for lowering LDL cholesterol.',
          'Garlic may have small and variable effects; preparation and dose can change results substantially.',
        ],
        priorityTopics: [
          {
            title: 'Psyllium fiber for LDL',
            description:
              'Soluble fiber with evidence for modest LDL reductions when used consistently alongside diet changes and lab follow-up.',
            supplementSlug: 'fiber-psyllium',
            searchLabel: 'Open the psyllium fiber guide',
          },
          {
            title: 'Omega-3 for triglycerides',
            description:
              'EPA/DHA is a better fit when triglycerides are the main target; dose, medications, and cardiovascular risk matter.',
            supplementSlug: 'omega-3',
            searchLabel: 'Open the omega-3 guide',
          },
          {
            title: 'Plant sterols for LDL',
            description:
              'A cholesterol-absorption focused option with moderate, consistency-dependent effects.',
            supplementSlug: 'plant-sterols',
            searchLabel: 'Open the plant sterols guide',
          },
        ],
        relatedLinks: [
          {
            title: 'Heart health cluster',
            description:
              'Connect triglycerides, blood pressure, and cardiovascular risk context with omega-3, coenzyme Q10, and garlic.',
            href: '/portal/category/heart-health',
            label: 'Open heart health supplements',
          },
          {
            title: 'Coenzyme Q10 heart context',
            description:
              'Useful for users comparing cellular energy, statin context, and cardiovascular support claims.',
            href: '/portal/supplement/coenzyme-q10?benefit=heart-health',
            label: 'Review CoQ10',
          },
          {
            title: 'Omega-3 EPA/DHA',
            description:
              'A focused guide for omega-3 triglycerides intent, separating EPA/DHA, dose context, and safety.',
            href: '/portal/supplement/omega-3?benefit=cholesterol-triglycerides',
            label: 'Review omega-3',
          },
          {
            title: 'Garlic and lipid markers',
            description:
              'A variable-evidence option to compare with psyllium, omega-3, and plant sterols.',
            href: '/portal/supplement/garlic?benefit=cholesterol-triglycerides',
            label: 'Review garlic',
          },
        ],
        faqHeading: 'Frequently asked questions about cholesterol and triglycerides',
        faqs: [
          {
            question: 'Which supplement has the best evidence for triglycerides?',
            answer:
              'Omega-3 EPA/DHA has consistent support for lowering triglycerides, especially at clinical doses. It should be reviewed with a professional if you use anticoagulants, statins, or other medications.',
          },
          {
            question: 'Which options are more focused on LDL cholesterol?',
            answer:
              'Psyllium and plant sterols have evidence for modest LDL reductions when used consistently alongside an appropriate diet.',
          },
          {
            question: 'Can supplements replace cholesterol medication?',
            answer:
              'That decision should not be made without medical follow-up. Supplements can support habits and markers, but they do not replace statins or other therapies when cardiovascular risk makes them appropriate.',
          },
        ],
        supplementLinksHeading: 'Lipid supplement guides',
      },
    },
    'heart-health': {
      es: {
        intro:
          'Esta guía responde a búsquedas reales de suplementos cardiovasculares y suplemento cardiovascular. Ordena omega-3, coenzima Q10, ajo, psyllium y esteroles por intención, evidencia, seguridad e interacciones como punto de partida educativo, no como diagnóstico.',
        highlights: [
          'Omega-3 EPA/DHA destaca cuando la intención cardiovascular viene de triglicéridos o lípidos alterados.',
          'Coenzima Q10 se estudia por energía celular y contextos cardiovasculares particulares.',
          'Ajo puede apoyar modestamente presión arterial o colesterol, pero los resultados son variables.',
          'Psyllium y esteroles vegetales ayudan a conectar salud cardiovascular con preguntas más específicas de colesterol LDL.',
          'Si la búsqueda viene de un resultado de laboratorio, conviene distinguir LDL, triglicéridos, presión arterial y medicamentos actuales.',
        ],
        priorityTopics: [
          {
            title: 'Omega-3 para triglicéridos',
            description:
              'Opción con evidencia más consistente cuando el marcador principal son triglicéridos, especialmente con revisión de dosis y medicamentos.',
            supplementSlug: 'omega-3',
            searchLabel: 'Ver guía de omega-3',
          },
          {
            title: 'Coenzima Q10 cardiovascular',
            description:
              'Suplemento estudiado en energía celular y escenarios cardiovasculares concretos; requiere contexto clínico y expectativas prudentes.',
            supplementSlug: 'coenzyme-q10',
            searchLabel: 'Ver guía de coenzima Q10',
          },
          {
            title: 'Ajo y marcadores cardiovasculares',
            description:
              'Puede tener efectos modestos y variables en presión arterial o colesterol según preparación, dosis y tolerancia.',
            supplementSlug: 'garlic',
            searchLabel: 'Ver guía de ajo',
          },
        ],
        relatedLinks: [
          {
            title: 'Colesterol y triglicéridos',
            description:
              'Cluster específico para usuarios que buscan suplementos para triglicéridos, psyllium, omega-3 y LDL.',
            href: '/portal/category/cholesterol-triglycerides',
            label: 'Comparar lípidos',
          },
          {
            title: 'Psyllium para colesterol',
            description:
              'Fibra soluble estudiada para perfiles de lípidos y tolerancia digestiva, con seguimiento de laboratorios.',
            href: '/portal/supplement/fiber-psyllium?benefit=cholesterol-triglycerides',
            label: 'Revisar psyllium',
          },
          {
            title: 'Omega-3 para triglicéridos',
            description:
              'Página específica para usuarios que buscan omega-3, EPA/DHA y triglicéridos dentro del cluster cardiovascular.',
            href: '/portal/supplement/omega-3?benefit=heart-health',
            label: 'Revisar omega-3',
          },
          {
            title: 'Esteroles vegetales',
            description:
              'Opción enfocada en absorción intestinal de colesterol para comparar con fibra soluble y omega-3.',
            href: '/portal/supplement/plant-sterols?benefit=cholesterol-triglycerides',
            label: 'Revisar esteroles',
          },
        ],
        faqHeading: 'Preguntas frecuentes sobre salud cardiovascular',
        faqs: [
          {
            question: '¿Qué suplemento cardiovascular revisar primero?',
            answer:
              'Omega-3 EPA/DHA suele tener la evidencia más consistente para triglicéridos. La mejor opción depende de los laboratorios, riesgo cardiovascular, dieta y medicamentos actuales.',
          },
          {
            question: '¿La coenzima Q10 es para todos?',
            answer:
              'No necesariamente. Puede ser relevante en contextos específicos, pero su utilidad depende del objetivo, diagnóstico, tratamiento actual y tolerancia.',
          },
          {
            question: '¿Qué significa buscar un suplemento cardiovascular?',
            answer:
              'Puede significar varias cosas: triglicéridos, presión arterial, colesterol, energía celular, inflamación o uso junto con estatinas. Por eso conviene partir de laboratorios y antecedentes, no de una etiqueta general.',
          },
          {
            question: '¿Qué diferencia hay entre suplementos cardiovasculares y suplementos para triglicéridos?',
            answer:
              'La búsqueda cardiovascular es amplia; puede incluir presión, lípidos, energía celular o uso con medicamentos. La búsqueda de triglicéridos es más específica y suele llevar primero a omega-3 EPA/DHA y revisión de laboratorios.',
          },
          {
            question: '¿Qué precauciones importan antes de usar suplementos cardiovasculares?',
            answer:
              'Revisa anticoagulantes, antihipertensivos, estatinas, cirugía programada, embarazo y antecedentes cardíacos. En riesgo cardiovascular alto, el seguimiento médico es prioritario.',
          },
        ],
        supplementLinksHeading: 'Guías de suplementos cardiovasculares',
      },
      en: {
        intro:
          'This guide organizes supplements studied for cardiovascular markers such as triglycerides, blood pressure, inflammation, and cellular energy function. Use it as an educational starting point, not as a diagnosis.',
        highlights: [
          'Omega-3 EPA/DHA stands out for triglycerides and cardiometabolic health in specific contexts.',
          'Coenzyme Q10 is studied for cellular energy and particular cardiovascular contexts.',
          'Garlic may modestly support blood pressure or cholesterol, but results are variable.',
        ],
        priorityTopics: [
          {
            title: 'Omega-3 for triglycerides',
            description:
              'A more consistently supported option when triglycerides are the main marker, especially with dose and medication review.',
            supplementSlug: 'omega-3',
            searchLabel: 'Open the omega-3 guide',
          },
          {
            title: 'Coenzyme Q10 and heart context',
            description:
              'Studied for cellular energy and specific cardiovascular scenarios; clinical context and careful expectations matter.',
            supplementSlug: 'coenzyme-q10',
            searchLabel: 'Open the coenzyme Q10 guide',
          },
          {
            title: 'Garlic and cardiovascular markers',
            description:
              'May have modest and variable effects on blood pressure or cholesterol depending on preparation, dose, and tolerance.',
            supplementSlug: 'garlic',
            searchLabel: 'Open the garlic guide',
          },
        ],
        relatedLinks: [
          {
            title: 'Cholesterol and triglycerides',
            description:
              'A more specific cluster for triglyceride supplements, psyllium, omega-3, and LDL context.',
            href: '/portal/category/cholesterol-triglycerides',
            label: 'Compare lipid options',
          },
          {
            title: 'Psyllium for cholesterol',
            description:
              'Soluble fiber studied for lipid profiles and digestive tolerance with lab follow-up.',
            href: '/portal/supplement/fiber-psyllium?benefit=cholesterol-triglycerides',
            label: 'Review psyllium',
          },
          {
            title: 'Omega-3 for triglycerides',
            description:
              'A focused page for users comparing omega-3, EPA/DHA, and triglycerides inside the heart-health cluster.',
            href: '/portal/supplement/omega-3?benefit=heart-health',
            label: 'Review omega-3',
          },
          {
            title: 'Plant sterols',
            description:
              'A cholesterol-absorption focused option to compare with soluble fiber and omega-3.',
            href: '/portal/supplement/plant-sterols?benefit=cholesterol-triglycerides',
            label: 'Review sterols',
          },
        ],
        faqHeading: 'Frequently asked questions about heart health supplements',
        faqs: [
          {
            question: 'Which heart health supplement has the strongest overall evidence?',
            answer:
              'Omega-3 EPA/DHA often has the most consistent evidence for triglycerides. The best option depends on lab results, cardiovascular risk, diet, and current medications.',
          },
          {
            question: 'Is coenzyme Q10 useful for everyone?',
            answer:
              'Not necessarily. It may be relevant in specific contexts, but usefulness depends on the goal, diagnosis, current treatment, and tolerance.',
          },
          {
            question: 'What precautions matter before using cardiovascular supplements?',
            answer:
              'Review anticoagulants, blood pressure medications, statins, planned surgery, pregnancy, and cardiac history. With high cardiovascular risk, medical follow-up is the priority.',
          },
        ],
        supplementLinksHeading: 'Heart health supplement guides',
      },
    },
    energy: {
      es: {
        intro:
          'Esta guía organiza suplementos que suelen buscarse por energía, enfoque o fatiga. El punto de partida es separar cansancio por sueño, estrés, entrenamiento, dieta o posible deficiencia; no promete resolver fatiga persistente.',
        highlights: [
          'Cafeína encaja mejor cuando se busca alerta de corto plazo, pero timing, tolerancia, ansiedad y sueño pueden cambiar el resultado.',
          'Rhodiola se revisa sobre todo cuando el cansancio se relaciona con estrés o carga mental; el extracto y la dosis importan.',
          'B12, hierro y vitamina D pertenecen al cluster de deficiencias: conviene confirmarlos con análisis cuando hay cansancio persistente o dieta restrictiva.',
          'Creatina puede ser más relevante si la intención viene de entrenamiento, fuerza o rendimiento, no como explicación única de fatiga.',
        ],
        priorityTopics: [
          {
            title: 'Cafeína para alerta y timing',
            description:
              'Opción de efecto agudo donde la dosis total, el horario, sueño, ansiedad y presión arterial deben revisarse antes de aumentar consumo.',
            supplementSlug: 'caffeine',
            searchLabel: 'Abrir la guía de cafeína',
          },
          {
            title: 'Rhodiola y fatiga por carga mental',
            description:
              'Se revisa cuando la fatiga aparece junto con estrés o demanda mental; no todos los extractos ni productos son equivalentes.',
            supplementSlug: 'rhodiola-rosea',
            searchLabel: 'Abrir la guía de rhodiola',
          },
          {
            title: 'Creatina y contexto de entrenamiento',
            description:
              'Más útil para comparar energía muscular, fuerza y rendimiento que para explicar cansancio persistente sin evaluación de base.',
            supplementSlug: 'creatine',
            searchLabel: 'Abrir la guía de creatina',
          },
        ],
        relatedLinks: [
          {
            title: 'Deficiencias comunes',
            description:
              'Cuando el cansancio persiste, conviene revisar vitamina D, hierro, B12 y folato con laboratorios y contexto dietario.',
            href: '/portal/category/common-deficiencies',
            label: 'Revisar deficiencias',
          },
          {
            title: 'Sueño y descanso',
            description:
              'Si la energía baja viene de mal descanso, compara primero melatonina, magnesio y hábitos de sueño.',
            href: '/portal/category/sleep',
            label: 'Revisar sueño',
          },
          {
            title: 'Cafeína',
            description:
              'Contrasta uso para alerta, enfoque y rendimiento con precauciones sobre sueño, ansiedad y tolerancia.',
            href: '/portal/supplement/caffeine?benefit=energy',
            label: 'Comparar cafeína',
          },
          {
            title: 'Rhodiola rosea',
            description:
              'Útil para comparar intención de fatiga ligada a estrés, carga mental y diferencias entre extractos.',
            href: '/portal/supplement/rhodiola-rosea?benefit=energy',
            label: 'Comparar rhodiola',
          },
        ],
        faqHeading: 'Preguntas frecuentes sobre energía y fatiga',
        faqs: [
          {
            question: '¿Qué suplemento revisar primero si tengo cansancio?',
            answer:
              'Depende del contexto. Si el cansancio es reciente y puntual, cafeína puede ser la comparación más directa. Si es persistente, conviene revisar sueño, estrés, dieta, medicamentos y posibles deficiencias antes de elegir un suplemento.',
          },
          {
            question: '¿Cuándo conviene revisar B12, hierro o vitamina D?',
            answer:
              'Cuando hay fatiga persistente, dieta vegana o vegetariana, menstruación abundante, embarazo, malabsorción o poca exposición solar. Esos nutrientes se interpretan mejor con análisis y seguimiento profesional.',
          },
          {
            question: '¿Rhodiola y cafeína son lo mismo?',
            answer:
              'No. Cafeína suele buscarse por alerta rápida; rhodiola se revisa más en fatiga asociada con estrés o carga mental. Seguridad, sueño y tolerancia deben revisarse en ambos casos.',
          },
          {
            question: '¿Qué señales ameritan consulta?',
            answer:
              'Fatiga que dura semanas, falta de aire, palpitaciones, pérdida de peso, somnolencia intensa, ánimo muy bajo, dolor torácico o cambios importantes en rendimiento requieren evaluación profesional.',
          },
        ],
        supplementLinksHeading: 'Guías de suplementos para energía',
      },
      en: {
        intro:
          'This guide organizes supplements users often search for energy, focus, or fatigue. The starting point is separating tiredness related to sleep, stress, training, diet, or possible deficiency; it does not promise to resolve persistent fatigue.',
        highlights: [
          'Caffeine fits best when users want short-term alertness, but timing, tolerance, anxiety, and sleep can change the outcome.',
          'Rhodiola is usually reviewed when tiredness is tied to stress or mental load; extract type and dose matter.',
          'B12, iron, and vitamin D belong in the deficiency cluster: labs are useful when fatigue is persistent or diet is restrictive.',
          'Creatine is more relevant when intent comes from training, strength, or performance, not as a single explanation for fatigue.',
        ],
        priorityTopics: [
          {
            title: 'Caffeine for alertness and timing',
            description:
              'An acute-effect option where total dose, timing, sleep, anxiety, and blood pressure should be reviewed before increasing intake.',
            supplementSlug: 'caffeine',
            searchLabel: 'Open the caffeine guide',
          },
          {
            title: 'Rhodiola and mental-load fatigue',
            description:
              'Reviewed when fatigue appears alongside stress or mental demand; not all extracts or products are equivalent.',
            supplementSlug: 'rhodiola-rosea',
            searchLabel: 'Open the rhodiola guide',
          },
          {
            title: 'Creatine and training context',
            description:
              'More useful for comparing muscle energy, strength, and performance than explaining persistent fatigue without baseline review.',
            supplementSlug: 'creatine',
            searchLabel: 'Open the creatine guide',
          },
        ],
        relatedLinks: [
          {
            title: 'Common deficiencies',
            description:
              'When tiredness persists, vitamin D, iron, B12, and folate are better reviewed with labs and diet context.',
            href: '/portal/category/common-deficiencies',
            label: 'Review deficiencies',
          },
          {
            title: 'Sleep and rest',
            description:
              'If low energy starts with poor rest, compare melatonin, magnesium, and sleep habits first.',
            href: '/portal/category/sleep',
            label: 'Review sleep',
          },
          {
            title: 'Caffeine',
            description:
              'Compare use for alertness, focus, and performance with sleep, anxiety, and tolerance precautions.',
            href: '/portal/supplement/caffeine?benefit=energy',
            label: 'Compare caffeine',
          },
          {
            title: 'Rhodiola rosea',
            description:
              'Useful for comparing fatigue intent tied to stress, mental load, and extract differences.',
            href: '/portal/supplement/rhodiola-rosea?benefit=energy',
            label: 'Compare rhodiola',
          },
        ],
        faqHeading: 'Frequently asked questions about energy and fatigue',
        faqs: [
          {
            question: 'Which supplement should I review first for tiredness?',
            answer:
              'It depends on context. For recent and occasional tiredness, caffeine may be the most direct comparison. For persistent fatigue, sleep, stress, diet, medications, and possible deficiencies should be reviewed before choosing a supplement.',
          },
          {
            question: 'When should B12, iron, or vitamin D be reviewed?',
            answer:
              'When fatigue is persistent, diet is vegan or vegetarian, periods are heavy, pregnancy is relevant, malabsorption is possible, or sun exposure is low. These nutrients are interpreted best with labs and professional follow-up.',
          },
          {
            question: 'Are rhodiola and caffeine the same kind of option?',
            answer:
              'No. Caffeine is usually searched for quick alertness; rhodiola is reviewed more for fatigue associated with stress or mental load. Safety, sleep, and tolerance matter for both.',
          },
          {
            question: 'What signs deserve professional review?',
            answer:
              'Fatigue lasting weeks, shortness of breath, palpitations, weight loss, intense sleepiness, very low mood, chest pain, or major performance changes deserve professional evaluation.',
          },
        ],
        supplementLinksHeading: 'Energy supplement guides',
      },
    },
    'anxiety': {
      es: {
        intro: 'Esta guía compara suplementos buscados para estrés cotidiano, sensación de calma y descanso mental. No reemplaza evaluación profesional: organiza ashwagandha, L-teanina y manzanilla por evidencia, seguridad, somnolencia e interacciones posibles.',
        highlights: [
          'Ashwagandha se revisa más cuando la intención principal es estrés percibido o carga mental sostenida; la preparación y la dosis cambian el contexto.',
          'L-teanina suele interesar cuando se busca relajación sin mucha somnolencia, especialmente si también se consume cafeína.',
          'Manzanilla encaja como opción herbal suave, con evidencia más variable y precauciones si hay alergias o uso de sedantes.'
        ],
        priorityTopics: [
          {
            title: 'Ashwagandha y estrés percibido',
            description: 'Opción adaptógena estudiada en estrés cotidiano; conviene revisar extracto, dosis, tiroides, embarazo, hígado y medicamentos.',
            supplementSlug: 'ashwagandha',
            searchLabel: 'Abrir la guía de ashwagandha'
          },
          {
            title: 'L-teanina para calma diurna',
            description: 'Aminoácido del té verde revisado para relajación y foco tranquilo; el contexto cambia si se combina con cafeína.',
            supplementSlug: 'l-theanine',
            searchLabel: 'Abrir la guía de L-teanina'
          },
          {
            title: 'Manzanilla como opción herbal',
            description: 'Opción tradicional para descanso y calma, con evidencia más modesta; revisar alergias, sedantes y embarazo.',
            supplementSlug: 'chamomile',
            searchLabel: 'Abrir la guía de manzanilla'
          }
        ],
        relatedLinks: [
          {
            title: 'Sueño y descanso',
            description: 'Si el estrés se mezcla con mal descanso, compara melatonina, magnesio, lavanda y hábitos de sueño antes de apilar suplementos.',
            href: '/portal/category/sleep',
            label: 'Revisar sueño'
          },
          {
            title: 'Energía y fatiga',
            description: 'Cuando la carga mental se siente como cansancio, revisa sueño, cafeína, rhodiola y posibles deficiencias.',
            href: '/portal/category/energy',
            label: 'Revisar energía'
          },
          {
            title: 'Ashwagandha',
            description: 'Guía específica para comparar evidencia, seguridad hepática rara, tiroides, embarazo y diferencias de extracto.',
            href: '/portal/supplement/ashwagandha?benefit=anxiety',
            label: 'Comparar ashwagandha'
          },
          {
            title: 'L-teanina',
            description: 'Útil para usuarios que quieren separar calma diurna, cafeína, foco y somnolencia.',
            href: '/portal/supplement/l-theanine?benefit=anxiety',
            label: 'Comparar L-teanina'
          }
        ],
        faqHeading: 'Preguntas frecuentes sobre suplementos para estrés y calma',
        faqs: [
          {
            question: '¿Qué suplemento revisar primero para estrés cotidiano?',
            answer: 'Depende del contexto. Ashwagandha se compara más para estrés percibido sostenido; L-teanina para calma diurna; manzanilla para una opción herbal suave. Sueño, cafeína, alcohol y medicamentos cambian la decisión.'
          },
          {
            question: '¿Puedo combinar ashwagandha, teanina y manzanilla?',
            answer: 'Conviene evitar combinaciones sin revisar somnolencia, sedantes, alcohol, embarazo, lactancia, hígado, tiroides y medicamentos. Comparar una opción a la vez facilita entender tolerancia.'
          },
          {
            question: '¿Cuándo buscar apoyo profesional?',
            answer: 'Si hay crisis de pánico, pensamientos de autolesión, síntomas intensos, insomnio persistente, uso de benzodiacepinas o antidepresivos, o deterioro funcional, la evaluación profesional tiene prioridad.'
          },
          {
            question: '¿El estrés puede venir de sueño o deficiencias?',
            answer: 'Sí. Falta de sueño, exceso de cafeína, alcohol, baja ingesta, anemia u otros factores pueden influir. Por eso conviene revisar hábitos, laboratorios y contexto antes de elegir suplementos.'
          }
        ],
        supplementLinksHeading: 'Guías de suplementos para estrés'
      },
      en: {
        intro: 'This guide compares supplements searched for everyday stress, a calmer state, and mental rest. It does not replace professional evaluation: it organizes ashwagandha, L-theanine, and chamomile by evidence, safety, drowsiness, and possible interactions.',
        highlights: [
          'Ashwagandha is usually reviewed when the main intent is perceived stress or sustained mental load; extract and dose change the context.',
          'L-theanine is often considered when people want relaxation without much drowsiness, especially when caffeine is also used.',
          'Chamomile fits as a gentle herbal option, with more variable evidence and precautions around allergies or sedatives.'
        ],
        priorityTopics: [
          {
            title: 'Ashwagandha and perceived stress',
            description: 'An adaptogen option studied in everyday stress; review extract, dose, thyroid, pregnancy, liver context, and medications.',
            supplementSlug: 'ashwagandha',
            searchLabel: 'Open the ashwagandha guide'
          },
          {
            title: 'L-theanine for daytime calm',
            description: 'A green-tea amino acid reviewed for relaxation and calm focus; context changes when it is paired with caffeine.',
            supplementSlug: 'l-theanine',
            searchLabel: 'Open the L-theanine guide'
          },
          {
            title: 'Chamomile as a herbal option',
            description: 'A traditional option for rest and calm, with more modest evidence; review allergies, sedatives, and pregnancy.',
            supplementSlug: 'chamomile',
            searchLabel: 'Open the chamomile guide'
          }
        ],
        relatedLinks: [
          {
            title: 'Sleep and rest',
            description: 'If stress overlaps with poor rest, compare melatonin, magnesium, lavender, and sleep habits before stacking supplements.',
            href: '/portal/category/sleep',
            label: 'Review sleep'
          },
          {
            title: 'Energy and fatigue',
            description: 'When mental load feels like tiredness, review sleep, caffeine, rhodiola, and possible deficiencies.',
            href: '/portal/category/energy',
            label: 'Review energy'
          },
          {
            title: 'Ashwagandha',
            description: 'A specific guide for evidence, rare liver safety signals, thyroid context, pregnancy, and extract differences.',
            href: '/portal/supplement/ashwagandha?benefit=anxiety',
            label: 'Compare ashwagandha'
          },
          {
            title: 'L-theanine',
            description: 'Useful for separating daytime calm, caffeine pairing, focus, and drowsiness.',
            href: '/portal/supplement/l-theanine?benefit=anxiety',
            label: 'Compare L-theanine'
          }
        ],
        faqHeading: 'Frequently asked questions about stress and calm supplements',
        faqs: [
          {
            question: 'Which supplement should I review first for everyday stress?',
            answer: 'It depends on context. Ashwagandha is compared more for sustained perceived stress; L-theanine for daytime calm; chamomile as a gentle herbal option. Sleep, caffeine, alcohol, and medications change the decision.'
          },
          {
            question: 'Can I combine ashwagandha, theanine, and chamomile?',
            answer: 'Avoid combinations without reviewing drowsiness, sedatives, alcohol, pregnancy, breastfeeding, liver context, thyroid context, and medications. Comparing one option at a time makes tolerability easier to interpret.'
          },
          {
            question: 'When should I seek professional support?',
            answer: 'Panic attacks, self-harm thoughts, intense symptoms, persistent insomnia, benzodiazepine or antidepressant use, or functional impairment deserve professional evaluation first.'
          },
          {
            question: 'Can stress be related to sleep or deficiencies?',
            answer: 'Yes. Poor sleep, too much caffeine, alcohol, low intake, anemia, or other factors can contribute. That is why habits, labs, and context should be reviewed before choosing supplements.'
          }
        ],
        supplementLinksHeading: 'Stress supplement guides'
      }
    },
    'muscle-gain': {
      es: {
        intro: 'Esta guía compara suplementos usados alrededor del entrenamiento de fuerza, recuperación y composición corporal. El punto de partida no es apilar productos, sino revisar entrenamiento, proteína total, descanso, tolerancia y consistencia.',
        highlights: [
          'La proteína de suero encaja mejor cuando la ingesta diaria de proteína no llega al objetivo estimado para entrenamiento.',
          'Creatina tiene un rol distinto: se revisa por fuerza, potencia y volumen de entrenamiento, con hidratación y función renal en contexto.',
          'Beta-alanina se compara más para esfuerzos intensos de duración intermedia; el hormigueo es un efecto esperado y dependiente de dosis.'
        ],
        priorityTopics: [
          {
            title: 'Proteína de suero e ingesta diaria',
            description: 'Útil para cubrir proteína cuando la dieta no alcanza el objetivo; revisar tolerancia a lactosa, digestión y distribución de comidas.',
            supplementSlug: 'whey-protein',
            searchLabel: 'Abrir la guía de proteína de suero'
          },
          {
            title: 'Creatina y fuerza',
            description: 'Opción estudiada para rendimiento de fuerza y potencia; revisar dosis, constancia, hidratación y contexto renal si aplica.',
            supplementSlug: 'creatine',
            searchLabel: 'Abrir la guía de creatina'
          },
          {
            title: 'Beta-alanina y esfuerzos intensos',
            description: 'Se compara cuando el entrenamiento incluye series intensas de duración intermedia; revisar parestesia, dosis divididas y tolerancia.',
            supplementSlug: 'beta-alanine',
            searchLabel: 'Abrir la guía de beta-alanina'
          }
        ],
        relatedLinks: [
          {
            title: 'Rendimiento deportivo',
            description: 'Para objetivos de potencia, resistencia o pre-entreno, compara creatina, cafeína, beta-alanina y citrulina.',
            href: '/portal/category/sports-performance',
            label: 'Revisar rendimiento'
          },
          {
            title: 'Energía y fatiga',
            description: 'Si el obstáculo principal es cansancio o baja energía, revisa sueño, cafeína, creatina y posibles deficiencias.',
            href: '/portal/category/energy',
            label: 'Revisar energía'
          },
          {
            title: 'Creatina',
            description: 'Guía específica para separar fuerza, potencia, carga, mantenimiento y seguridad práctica.',
            href: '/portal/supplement/creatine?benefit=muscle-gain',
            label: 'Comparar creatina'
          },
          {
            title: 'Proteína de suero',
            description: 'Útil para decidir si conviene ajustar alimentos, porciones o usar proteína en polvo por practicidad.',
            href: '/portal/supplement/whey-protein?benefit=muscle-gain',
            label: 'Comparar proteína'
          }
        ],
        faqHeading: 'Preguntas frecuentes sobre suplementos para músculo y fuerza',
        faqs: [
          {
            question: '¿Qué revisar antes de elegir un suplemento para músculo?',
            answer: 'Primero entrenamiento progresivo, proteína total, calorías, sueño y constancia. Los suplementos ayudan a comparar opciones prácticas, pero no compensan una base incompleta.'
          },
          {
            question: '¿Proteína de suero y creatina cumplen el mismo papel?',
            answer: 'No. La proteína de suero ayuda a cubrir ingesta proteica; creatina se revisa por fuerza, potencia y volumen de entrenamiento. Pueden coexistir, pero responden a necesidades distintas.'
          },
          {
            question: '¿Beta-alanina es necesaria para todos?',
            answer: 'No necesariamente. Tiene más sentido cuando el deporte incluye esfuerzos intensos de duración intermedia. Si el foco es fuerza máxima o proteína insuficiente, otras comparaciones pueden ser más directas.'
          },
          {
            question: '¿Cuándo conviene consultar a un profesional?',
            answer: 'Si hay enfermedad renal, embarazo, adolescencia, trastornos alimentarios, lesiones, uso de medicamentos o cambios de peso no intencionales, conviene revisar el plan con un profesional.'
          }
        ],
        supplementLinksHeading: 'Guías de suplementos para músculo'
      },
      en: {
        intro: 'This guide compares supplements used around strength training, recovery, and body composition. The starting point is not stacking products, but reviewing training, total protein intake, sleep, tolerance, and consistency.',
        highlights: [
          'Whey protein fits best when daily protein intake does not meet the estimated target for training.',
          'Creatine has a different role: it is reviewed for strength, power, and training volume, with hydration and kidney context considered when relevant.',
          'Beta-alanine is compared more for intense efforts of intermediate duration; tingling is an expected dose-related effect.'
        ],
        priorityTopics: [
          {
            title: 'Whey protein and daily intake',
            description: 'Useful for covering protein when diet falls short; review lactose tolerance, digestion, and meal distribution.',
            supplementSlug: 'whey-protein',
            searchLabel: 'Open the whey protein guide'
          },
          {
            title: 'Creatine and strength',
            description: 'An option studied for strength and power performance; review dose, consistency, hydration, and kidney context if relevant.',
            supplementSlug: 'creatine',
            searchLabel: 'Open the creatine guide'
          },
          {
            title: 'Beta-alanine and intense efforts',
            description: 'Compared when training includes intense sets of intermediate duration; review tingling, divided doses, and tolerance.',
            supplementSlug: 'beta-alanine',
            searchLabel: 'Open the beta-alanine guide'
          }
        ],
        relatedLinks: [
          {
            title: 'Sports performance',
            description: 'For power, endurance, or pre-workout goals, compare creatine, caffeine, beta-alanine, and citrulline.',
            href: '/portal/category/sports-performance',
            label: 'Review performance'
          },
          {
            title: 'Energy and fatigue',
            description: 'If tiredness or low energy is the main barrier, review sleep, caffeine, creatine, and possible deficiencies.',
            href: '/portal/category/energy',
            label: 'Review energy'
          },
          {
            title: 'Creatine',
            description: 'A specific guide for separating strength, power, loading, maintenance, and practical safety.',
            href: '/portal/supplement/creatine?benefit=muscle-gain',
            label: 'Compare creatine'
          },
          {
            title: 'Whey protein',
            description: 'Useful for deciding whether to adjust foods, portions, or use protein powder for convenience.',
            href: '/portal/supplement/whey-protein?benefit=muscle-gain',
            label: 'Compare protein'
          }
        ],
        faqHeading: 'Frequently asked questions about muscle and strength supplements',
        faqs: [
          {
            question: 'What should I review before choosing a muscle supplement?',
            answer: 'Start with progressive training, total protein, calories, sleep, and consistency. Supplements help compare practical options, but they do not compensate for an incomplete base.'
          },
          {
            question: 'Do whey protein and creatine do the same thing?',
            answer: 'No. Whey protein helps cover protein intake; creatine is reviewed for strength, power, and training volume. They can coexist, but they answer different needs.'
          },
          {
            question: 'Is beta-alanine necessary for everyone?',
            answer: 'Not necessarily. It makes more sense when the sport includes intense efforts of intermediate duration. If the focus is maximal strength or insufficient protein, other comparisons may be more direct.'
          },
          {
            question: 'When should I consult a professional?',
            answer: 'Kidney disease, pregnancy, adolescence, eating disorders, injuries, medication use, or unintentional weight changes are reasons to review the plan with a professional.'
          }
        ],
        supplementLinksHeading: 'Muscle supplement guides'
      }
    },
    'cognitive-function': {
      es: {
        intro: 'Esta guía compara suplementos buscados para memoria, concentración y carga mental. La lectura prudente empieza por sueño, estrés, edad, medicamentos y objetivos reales antes de elegir una opción.',
        highlights: [
          'Omega-3 se revisa por contexto general de dieta, salud cardiovascular y DHA; no todos los objetivos cognitivos tienen la misma evidencia.',
          'Bacopa se compara más cuando la intención es memoria o aprendizaje, con efectos que dependen de extracto, dosis y tiempo de uso.',
          'Ginkgo requiere especial cuidado con anticoagulantes, cirugía, edad avanzada y preparación específica; no debe leerse como una promesa genérica.'
        ],
        priorityTopics: [
          {
            title: 'Omega-3 y DHA',
            description: 'Opción relevante cuando la ingesta de pescado es baja o se revisa DHA; conviene separar salud general, lípidos y objetivos cognitivos.',
            supplementSlug: 'omega-3',
            searchLabel: 'Abrir la guía de omega-3'
          },
          {
            title: 'Bacopa y memoria',
            description: 'Se compara para memoria y aprendizaje con atención a extracto, dosis, tiempo de uso, digestión y somnolencia.',
            supplementSlug: 'bacopa-monnieri',
            searchLabel: 'Abrir la guía de bacopa'
          },
          {
            title: 'Ginkgo y seguridad',
            description: 'Revisar preparación, edad, anticoagulantes, cirugía y riesgo de sangrado antes de considerarlo.',
            supplementSlug: 'ginkgo-biloba',
            searchLabel: 'Abrir la guía de ginkgo'
          }
        ],
        relatedLinks: [
          {
            title: 'Energía y fatiga',
            description: 'Si la concentración baja se mezcla con cansancio, revisa sueño, cafeína, creatina y posibles deficiencias.',
            href: '/portal/category/energy',
            label: 'Revisar energía'
          },
          {
            title: 'Deficiencias comunes',
            description: 'B12, hierro, folato y vitamina D pueden importar cuando hay dieta restrictiva, cansancio o laboratorios pendientes.',
            href: '/portal/category/common-deficiencies',
            label: 'Revisar deficiencias'
          },
          {
            title: 'Bacopa monnieri',
            description: 'Guía específica para comparar memoria, aprendizaje, extractos, tiempo de uso y tolerancia.',
            href: '/portal/supplement/bacopa-monnieri?benefit=cognitive-function',
            label: 'Comparar bacopa'
          },
          {
            title: 'Ginkgo biloba',
            description: 'Útil para revisar preparación, interacciones y límites de la evidencia antes de usarlo.',
            href: '/portal/supplement/ginkgo-biloba?benefit=cognitive-function',
            label: 'Comparar ginkgo'
          }
        ],
        faqHeading: 'Preguntas frecuentes sobre memoria y concentración',
        faqs: [
          {
            question: '¿Qué revisar antes de elegir un suplemento cognitivo?',
            answer: 'Sueño, estrés, cafeína, medicamentos, dieta, edad y cambios recientes suelen explicar más que un suplemento aislado. La comparación es más útil cuando el objetivo está definido.'
          },
          {
            question: '¿Bacopa y ginkgo son equivalentes?',
            answer: 'No. Bacopa se revisa más por memoria y aprendizaje con uso sostenido; ginkgo requiere más atención a preparación, edad e interacciones. Conviene compararlos por contexto, no por nombre comercial.'
          },
          {
            question: '¿Cuándo conviene revisar B12 o hierro?',
            answer: 'Cuando hay cansancio, dieta vegana o vegetariana, menstruación abundante, malabsorción o síntomas persistentes. Es mejor confirmar con análisis y seguimiento profesional.'
          },
          {
            question: '¿Qué señales requieren evaluación profesional?',
            answer: 'Pérdida de memoria progresiva, confusión, cambios neurológicos, dolor de cabeza nuevo, depresión intensa o deterioro funcional deben revisarse con un profesional.'
          }
        ],
        supplementLinksHeading: 'Guías de suplementos para memoria'
      },
      en: {
        intro: 'This guide compares supplements searched for memory, focus, and mental load. A prudent review starts with sleep, stress, age, medications, and realistic goals before choosing an option.',
        highlights: [
          'Omega-3 is reviewed through diet, cardiovascular context, and DHA; not every cognitive goal has the same evidence.',
          'Bacopa is compared more when the intent is memory or learning, with effects depending on extract, dose, and duration of use.',
          'Ginkgo requires special attention to anticoagulants, surgery, older age, and specific preparation; it should not be read as a generic promise.'
        ],
        priorityTopics: [
          {
            title: 'Omega-3 and DHA',
            description: 'Relevant when fish intake is low or DHA is being reviewed; separate general health, lipid, and cognitive goals.',
            supplementSlug: 'omega-3',
            searchLabel: 'Open the omega-3 guide'
          },
          {
            title: 'Bacopa and memory',
            description: 'Compared for memory and learning with attention to extract, dose, duration, digestion, and drowsiness.',
            supplementSlug: 'bacopa-monnieri',
            searchLabel: 'Open the bacopa guide'
          },
          {
            title: 'Ginkgo and safety',
            description: 'Review preparation, age, anticoagulants, surgery, and bleeding risk before considering it.',
            supplementSlug: 'ginkgo-biloba',
            searchLabel: 'Open the ginkgo guide'
          }
        ],
        relatedLinks: [
          {
            title: 'Energy and fatigue',
            description: 'If low focus overlaps with tiredness, review sleep, caffeine, creatine, and possible deficiencies.',
            href: '/portal/category/energy',
            label: 'Review energy'
          },
          {
            title: 'Common deficiencies',
            description: 'B12, iron, folate, and vitamin D may matter when diet is restrictive, tiredness is present, or labs are pending.',
            href: '/portal/category/common-deficiencies',
            label: 'Review deficiencies'
          },
          {
            title: 'Bacopa monnieri',
            description: 'A specific guide for comparing memory, learning, extracts, duration of use, and tolerance.',
            href: '/portal/supplement/bacopa-monnieri?benefit=cognitive-function',
            label: 'Compare bacopa'
          },
          {
            title: 'Ginkgo biloba',
            description: 'Useful for reviewing preparation, interactions, and evidence limits before using it.',
            href: '/portal/supplement/ginkgo-biloba?benefit=cognitive-function',
            label: 'Compare ginkgo'
          }
        ],
        faqHeading: 'Frequently asked questions about memory and focus',
        faqs: [
          {
            question: 'What should I review before choosing a cognitive supplement?',
            answer: 'Sleep, stress, caffeine, medications, diet, age, and recent changes often explain more than an isolated supplement. Comparison is more useful when the goal is defined.'
          },
          {
            question: 'Are bacopa and ginkgo equivalent?',
            answer: 'No. Bacopa is reviewed more for memory and learning with sustained use; ginkgo needs more attention to preparation, age, and interactions. Compare them by context, not by product name.'
          },
          {
            question: 'When should B12 or iron be reviewed?',
            answer: 'When tiredness, vegan or vegetarian diet, heavy periods, malabsorption, or persistent symptoms are relevant. Lab confirmation and professional follow-up are better.'
          },
          {
            question: 'What signs need professional evaluation?',
            answer: 'Progressive memory loss, confusion, neurologic changes, a new headache pattern, intense depression, or functional decline should be reviewed with a professional.'
          }
        ],
        supplementLinksHeading: 'Memory supplement guides'
      }
    },
    'joint-bone-health': {
      es: {
        intro: 'Esta guía compara suplementos buscados para articulaciones, movilidad y salud ósea. La elección depende de edad, entrenamiento, dieta, dolor persistente, análisis, medicamentos y evaluación profesional cuando hay señales de alarma.',
        highlights: [
          'Vitamina D se revisa mejor con análisis de 25-OH vitamina D, ingesta de calcio, exposición solar y riesgo óseo.',
          'Glucosamina se compara más por molestias articulares y movilidad, con evidencia variable y atención a alergias o anticoagulantes.',
          'Colágeno hidrolizado se revisa por tendones, piel o articulaciones, pero conviene separar proteína total, entrenamiento y expectativas.'
        ],
        priorityTopics: [
          {
            title: 'Vitamina D y hueso',
            description: 'Relevante cuando hay baja exposición solar, riesgo de deficiencia o seguimiento óseo; la dosis prudente depende de análisis.',
            supplementSlug: 'vitamin-d',
            searchLabel: 'Abrir la guía de vitamina D'
          },
          {
            title: 'Glucosamina y movilidad',
            description: 'Opción comparada para articulaciones con respuesta variable; revisar alergias a mariscos, anticoagulantes y tiempo de prueba.',
            supplementSlug: 'glucosamine',
            searchLabel: 'Abrir la guía de glucosamina'
          },
          {
            title: 'Colágeno hidrolizado',
            description: 'Se revisa para articulaciones, tendones y piel; el contexto incluye proteína total, vitamina C, entrenamiento y constancia.',
            supplementSlug: 'hydrolyzed-collagen',
            searchLabel: 'Abrir la guía de colágeno'
          }
        ],
        relatedLinks: [
          {
            title: 'Deficiencias comunes',
            description: 'Vitamina D y calcio se interpretan mejor con laboratorios, dieta y etapa de vida.',
            href: '/portal/category/common-deficiencies',
            label: 'Revisar deficiencias'
          },
          {
            title: 'Rendimiento deportivo',
            description: 'Si el objetivo es entrenamiento, potencia o recuperación, compara creatina, cafeína, beta-alanina y citrulina.',
            href: '/portal/category/sports-performance',
            label: 'Revisar rendimiento'
          },
          {
            title: 'Vitamina D',
            description: 'Guía específica para revisar laboratorio, dosis, calcio, salud ósea e interacciones.',
            href: '/portal/supplement/vitamin-d?benefit=joint-bone-health',
            label: 'Comparar vitamina D'
          },
          {
            title: 'Glucosamina',
            description: 'Útil para comparar preparación, duración de uso, seguridad y expectativas realistas.',
            href: '/portal/supplement/glucosamine?benefit=joint-bone-health',
            label: 'Comparar glucosamina'
          }
        ],
        faqHeading: 'Preguntas frecuentes sobre articulaciones y huesos',
        faqs: [
          {
            question: '¿Qué revisar antes de elegir un suplemento articular?',
            answer: 'Ubicación del dolor, duración, lesión previa, entrenamiento, peso, medicamentos, edad y señales de alarma. Dolor persistente o limitación funcional merece evaluación profesional.'
          },
          {
            question: '¿Vitamina D se decide por síntomas?',
            answer: 'Lo prudente es revisarla con análisis de 25-OH vitamina D y contexto de calcio, sol, dieta y salud ósea. Los síntomas por sí solos no confirman deficiencia.'
          },
          {
            question: '¿Glucosamina y colágeno son intercambiables?',
            answer: 'No. Glucosamina se compara más por articulaciones; colágeno hidrolizado por tejido conectivo, tendones o piel. El encaje depende del objetivo y tolerancia.'
          },
          {
            question: '¿Cuándo buscar atención profesional?',
            answer: 'Dolor intenso, inflamación marcada, fiebre, pérdida de fuerza, trauma, dolor nocturno, deformidad o dificultad para caminar requieren evaluación profesional.'
          }
        ],
        supplementLinksHeading: 'Guías de suplementos para articulaciones'
      },
      en: {
        intro: 'This guide compares supplements searched for joints, mobility, and bone health. Choice depends on age, training, diet, persistent pain, labs, medications, and professional evaluation when warning signs are present.',
        highlights: [
          'Vitamin D is best reviewed with a 25-OH vitamin D test, calcium intake, sun exposure, and bone-risk context.',
          'Glucosamine is compared more for joint discomfort and mobility, with variable evidence and attention to allergies or anticoagulants.',
          'Hydrolyzed collagen is reviewed for tendons, skin, or joints, but total protein, training, and expectations should be separated.'
        ],
        priorityTopics: [
          {
            title: 'Vitamin D and bone context',
            description: 'Relevant when sun exposure is low, deficiency risk is present, or bone follow-up matters; prudent dosing depends on labs.',
            supplementSlug: 'vitamin-d',
            searchLabel: 'Open the vitamin D guide'
          },
          {
            title: 'Glucosamine and mobility',
            description: 'A joint option with variable response; review shellfish allergy, anticoagulants, and trial duration.',
            supplementSlug: 'glucosamine',
            searchLabel: 'Open the glucosamine guide'
          },
          {
            title: 'Hydrolyzed collagen',
            description: 'Reviewed for joints, tendons, and skin; context includes total protein, vitamin C, training, and consistency.',
            supplementSlug: 'hydrolyzed-collagen',
            searchLabel: 'Open the collagen guide'
          }
        ],
        relatedLinks: [
          {
            title: 'Common deficiencies',
            description: 'Vitamin D and calcium are interpreted better with labs, diet, and life-stage context.',
            href: '/portal/category/common-deficiencies',
            label: 'Review deficiencies'
          },
          {
            title: 'Sports performance',
            description: 'If the goal is training, power, or recovery, compare creatine, caffeine, beta-alanine, and citrulline.',
            href: '/portal/category/sports-performance',
            label: 'Review performance'
          },
          {
            title: 'Vitamin D',
            description: 'A specific guide for labs, dose, calcium, bone health, and interactions.',
            href: '/portal/supplement/vitamin-d?benefit=joint-bone-health',
            label: 'Compare vitamin D'
          },
          {
            title: 'Glucosamine',
            description: 'Useful for comparing preparation, duration of use, safety, and realistic expectations.',
            href: '/portal/supplement/glucosamine?benefit=joint-bone-health',
            label: 'Compare glucosamine'
          }
        ],
        faqHeading: 'Frequently asked questions about joints and bones',
        faqs: [
          {
            question: 'What should I review before choosing a joint supplement?',
            answer: 'Pain location, duration, previous injury, training, weight, medications, age, and warning signs. Persistent pain or functional limitation deserves professional evaluation.'
          },
          {
            question: 'Is vitamin D decided by symptoms?',
            answer: 'A 25-OH vitamin D lab test plus calcium, sun, diet, and bone context is the prudent route. Symptoms alone do not confirm deficiency.'
          },
          {
            question: 'Are glucosamine and collagen interchangeable?',
            answer: 'No. Glucosamine is compared more for joints; hydrolyzed collagen for connective tissue, tendons, or skin. Fit depends on the goal and tolerance.'
          },
          {
            question: 'When should I seek professional care?',
            answer: 'Intense pain, marked swelling, fever, loss of strength, trauma, night pain, deformity, or difficulty walking require professional evaluation.'
          }
        ],
        supplementLinksHeading: 'Joint supplement guides'
      }
    },
    'skin-hair-health': {
      es: {
        intro: 'Esta guía compara suplementos buscados para piel, cabello y uñas. La lectura prudente separa deficiencias reales, proteína total, edad, dieta, medicamentos, caída de cabello persistente y expectativas cosméticas.',
        highlights: [
          'Colágeno se revisa por piel, articulaciones o tendones, pero conviene considerar proteína total, vitamina C y constancia.',
          'Biotina tiene más sentido cuando hay riesgo de deficiencia; dosis altas pueden interferir con algunos análisis de laboratorio.',
          'Vitamina C participa en síntesis de colágeno, pero su utilidad depende de dieta, ingesta total y contexto de deficiencia.'
        ],
        priorityTopics: [
          {
            title: 'Colágeno y proteína total',
            description: 'Se compara para piel y tejido conectivo; revisar ingesta de proteína, vitamina C, expectativas y tolerancia digestiva.',
            supplementSlug: 'collagen',
            searchLabel: 'Abrir la guía de colágeno'
          },
          {
            title: 'Biotina y laboratorios',
            description: 'Relevante cuando hay deficiencia plausible; dosis altas pueden alterar pruebas de tiroides, hormonas o corazón.',
            supplementSlug: 'biotin',
            searchLabel: 'Abrir la guía de biotina'
          },
          {
            title: 'Vitamina C y colágeno',
            description: 'Cofactor nutricional para síntesis de colágeno; revisar dieta, frutas, verduras y tolerancia gastrointestinal.',
            supplementSlug: 'vitamin-c',
            searchLabel: 'Abrir la guía de vitamina C'
          }
        ],
        relatedLinks: [
          {
            title: 'Deficiencias comunes',
            description: 'Hierro, zinc, B12 y folato pueden importar cuando hay caída de cabello, fatiga o dietas restrictivas.',
            href: '/portal/category/common-deficiencies',
            label: 'Revisar deficiencias'
          },
          {
            title: 'Articulaciones y huesos',
            description: 'Si el interés por colágeno también incluye articulaciones o tendones, revisa el cluster musculoesquelético.',
            href: '/portal/category/joint-bone-health',
            label: 'Revisar articulaciones'
          },
          {
            title: 'Colágeno',
            description: 'Guía específica para revisar péptidos, dosis, proteína total, vitamina C y expectativas.',
            href: '/portal/supplement/collagen?benefit=skin-hair-health',
            label: 'Comparar colágeno'
          },
          {
            title: 'Biotina',
            description: 'Útil para separar deficiencia, dosis altas, interferencia con laboratorios y expectativas.',
            href: '/portal/supplement/biotin?benefit=skin-hair-health',
            label: 'Comparar biotina'
          }
        ],
        faqHeading: 'Preguntas frecuentes sobre piel, cabello y uñas',
        faqs: [
          {
            question: '¿Qué revisar antes de elegir un suplemento para cabello?',
            answer: 'Dieta, hierro, zinc, B12, folato, tiroides, estrés, medicamentos y duración de la caída. Si la caída es marcada o persistente, conviene evaluación profesional.'
          },
          {
            question: '¿Biotina es necesaria si no hay deficiencia?',
            answer: 'No siempre. La biotina puede ser relevante si hay deficiencia plausible, pero dosis altas pueden interferir con análisis. Conviene avisar al laboratorio y al profesional.'
          },
          {
            question: '¿Colágeno y vitamina C se revisan juntos?',
            answer: 'Vitamina C participa en síntesis de colágeno, pero eso no implica que todos necesiten suplemento. Dieta, proteína total y objetivo concreto importan más.'
          },
          {
            question: '¿Cuándo buscar evaluación profesional?',
            answer: 'Caída en parches, pérdida rápida, lesiones en piel, uñas muy frágiles, fatiga intensa, embarazo, posparto o cambios hormonales merecen revisión profesional.'
          }
        ],
        supplementLinksHeading: 'Guías de suplementos para piel y cabello'
      },
      en: {
        intro: 'This guide compares supplements searched for skin, hair, and nails. A prudent review separates real deficiencies, total protein, age, diet, medications, persistent hair loss, and cosmetic expectations.',
        highlights: [
          'Collagen is reviewed for skin, joints, or tendons, but total protein, vitamin C, and consistency should be considered.',
          'Biotin makes more sense when deficiency risk is plausible; high doses can interfere with some lab tests.',
          'Vitamin C participates in collagen synthesis, but usefulness depends on diet, total intake, and deficiency context.'
        ],
        priorityTopics: [
          {
            title: 'Collagen and total protein',
            description: 'Compared for skin and connective tissue; review protein intake, vitamin C, expectations, and digestive tolerance.',
            supplementSlug: 'collagen',
            searchLabel: 'Open the collagen guide'
          },
          {
            title: 'Biotin and lab tests',
            description: 'Relevant when deficiency is plausible; high doses can alter thyroid, hormone, or heart-related lab tests.',
            supplementSlug: 'biotin',
            searchLabel: 'Open the biotin guide'
          },
          {
            title: 'Vitamin C and collagen',
            description: 'A nutritional cofactor for collagen synthesis; review diet, fruits, vegetables, and gastrointestinal tolerance.',
            supplementSlug: 'vitamin-c',
            searchLabel: 'Open the vitamin C guide'
          }
        ],
        relatedLinks: [
          {
            title: 'Common deficiencies',
            description: 'Iron, zinc, B12, and folate may matter when hair shedding, fatigue, or restrictive diets are relevant.',
            href: '/portal/category/common-deficiencies',
            label: 'Review deficiencies'
          },
          {
            title: 'Joints and bones',
            description: 'If collagen interest also includes joints or tendons, review the musculoskeletal cluster.',
            href: '/portal/category/joint-bone-health',
            label: 'Review joints'
          },
          {
            title: 'Collagen',
            description: 'A specific guide for peptides, dose, total protein, vitamin C, and expectations.',
            href: '/portal/supplement/collagen?benefit=skin-hair-health',
            label: 'Compare collagen'
          },
          {
            title: 'Biotin',
            description: 'Useful for separating deficiency, high doses, lab interference, and expectations.',
            href: '/portal/supplement/biotin?benefit=skin-hair-health',
            label: 'Compare biotin'
          }
        ],
        faqHeading: 'Frequently asked questions about skin, hair, and nails',
        faqs: [
          {
            question: 'What should I review before choosing a hair supplement?',
            answer: 'Diet, iron, zinc, B12, folate, thyroid, stress, medications, and duration of shedding. Marked or persistent hair loss deserves professional evaluation.'
          },
          {
            question: 'Is biotin necessary without a deficiency?',
            answer: 'Not always. Biotin may be relevant if deficiency is plausible, but high doses can interfere with lab tests. Tell the lab and your professional.'
          },
          {
            question: 'Are collagen and vitamin C reviewed together?',
            answer: 'Vitamin C participates in collagen synthesis, but that does not mean everyone needs a supplement. Diet, total protein, and the specific goal matter more.'
          },
          {
            question: 'When should I seek professional evaluation?',
            answer: 'Patchy hair loss, rapid shedding, skin lesions, very brittle nails, intense fatigue, pregnancy, postpartum changes, or hormonal changes deserve professional review.'
          }
        ],
        supplementLinksHeading: 'Skin and hair supplement guides'
      }
    },
    'immunity': {
      es: {
        intro: 'Esta guía compara suplementos buscados para apoyo inmunitario y temporada de resfriados. La lectura prudente separa dieta, deficiencias, sueño, vacunas, medicamentos y señales que requieren evaluación profesional.',
        highlights: [
          'Vitamina C se revisa mejor desde ingesta dietaria, tolerancia gastrointestinal y contexto de uso, no como promesa aislada.',
          'Zinc puede ser relevante cuando la dieta es baja o hay riesgo de deficiencia; dosis altas sostenidas pueden afectar cobre y tolerancia.',
          'Equinácea es una opción herbal con evidencia variable y precauciones en alergias, autoinmunidad, embarazo y medicamentos.'
        ],
        priorityTopics: [
          {
            title: 'Vitamina C y dieta',
            description: 'Comparar ingesta de frutas y verduras, dosis, tolerancia digestiva y expectativas antes de suplementar.',
            supplementSlug: 'vitamin-c',
            searchLabel: 'Abrir la guía de vitamina C'
          },
          {
            title: 'Zinc y deficiencia',
            description: 'Revisar dieta, dosis, duración, náusea, cobre e interacciones antes de usar dosis altas.',
            supplementSlug: 'zinc',
            searchLabel: 'Abrir la guía de zinc'
          },
          {
            title: 'Equinácea herbal',
            description: 'Opción herbal con resultados variables; revisar alergias a Asteraceae, autoinmunidad y medicamentos.',
            supplementSlug: 'echinacea',
            searchLabel: 'Abrir la guía de equinácea'
          }
        ],
        relatedLinks: [
          {
            title: 'Deficiencias comunes',
            description: 'Vitamina D, zinc, hierro y B12 se interpretan mejor con dieta, laboratorios y etapa de vida.',
            href: '/portal/category/common-deficiencies',
            label: 'Revisar deficiencias'
          },
          {
            title: 'Sueño y descanso',
            description: 'Dormir mal puede influir en cómo se percibe el bienestar general; revisa el cluster de sueño si aplica.',
            href: '/portal/category/sleep',
            label: 'Revisar sueño'
          },
          {
            title: 'Vitamina C',
            description: 'Guía específica para separar dieta, dosis, tolerancia y contexto estacional.',
            href: '/portal/supplement/vitamin-c?benefit=immunity',
            label: 'Comparar vitamina C'
          },
          {
            title: 'Zinc',
            description: 'Útil para revisar dosis, duración, cobre, náusea y dieta.',
            href: '/portal/supplement/zinc?benefit=immunity',
            label: 'Comparar zinc'
          }
        ],
        faqHeading: 'Preguntas frecuentes sobre suplementos e inmunidad',
        faqs: [
          {
            question: '¿Qué revisar antes de elegir un suplemento para inmunidad?',
            answer: 'Dieta, sueño, estrés, vacunas, medicamentos, enfermedades autoinmunes, embarazo y deficiencias posibles. Los suplementos no sustituyen atención médica cuando hay síntomas importantes.'
          },
          {
            question: '¿Vitamina C y zinc se usan igual?',
            answer: 'No. Vitamina C depende mucho de dieta y tolerancia; zinc requiere más cuidado con dosis, duración, náusea y cobre. Conviene revisar cada caso por separado.'
          },
          {
            question: '¿Equinácea es adecuada para todos?',
            answer: 'No siempre. Hay que revisar alergias a plantas relacionadas, autoinmunidad, embarazo, lactancia y medicamentos antes de usarla.'
          },
          {
            question: '¿Cuándo buscar atención profesional?',
            answer: 'Fiebre alta, dificultad para respirar, dolor intenso, síntomas persistentes, inmunosupresión, embarazo o enfermedades crónicas requieren orientación profesional.'
          }
        ],
        supplementLinksHeading: 'Guías de suplementos para inmunidad'
      },
      en: {
        intro: 'This guide compares supplements searched for immune support and cold-season context. A prudent review separates diet, deficiencies, sleep, vaccines, medications, and signs that need professional evaluation.',
        highlights: [
          'Vitamin C is best reviewed through dietary intake, gastrointestinal tolerance, and use context, not as an isolated promise.',
          'Zinc may be relevant when diet is low or deficiency risk is present; sustained high doses can affect copper and tolerance.',
          'Echinacea is a herbal option with variable evidence and precautions around allergies, autoimmunity, pregnancy, and medications.'
        ],
        priorityTopics: [
          {
            title: 'Vitamin C and diet',
            description: 'Compare fruit and vegetable intake, dose, digestive tolerance, and expectations before supplementing.',
            supplementSlug: 'vitamin-c',
            searchLabel: 'Open the vitamin C guide'
          },
          {
            title: 'Zinc and deficiency',
            description: 'Review diet, dose, duration, nausea, copper, and interactions before using high doses.',
            supplementSlug: 'zinc',
            searchLabel: 'Open the zinc guide'
          },
          {
            title: 'Echinacea herbal option',
            description: 'A herbal option with variable results; review Asteraceae allergies, autoimmunity, and medications.',
            supplementSlug: 'echinacea',
            searchLabel: 'Open the echinacea guide'
          }
        ],
        relatedLinks: [
          {
            title: 'Common deficiencies',
            description: 'Vitamin D, zinc, iron, and B12 are interpreted better with diet, labs, and life-stage context.',
            href: '/portal/category/common-deficiencies',
            label: 'Review deficiencies'
          },
          {
            title: 'Sleep and rest',
            description: 'Poor sleep can shape perceived well-being; review the sleep cluster when relevant.',
            href: '/portal/category/sleep',
            label: 'Review sleep'
          },
          {
            title: 'Vitamin C',
            description: 'A specific guide for separating diet, dose, tolerance, and seasonal context.',
            href: '/portal/supplement/vitamin-c?benefit=immunity',
            label: 'Compare vitamin C'
          },
          {
            title: 'Zinc',
            description: 'Useful for reviewing dose, duration, copper, nausea, and diet.',
            href: '/portal/supplement/zinc?benefit=immunity',
            label: 'Compare zinc'
          }
        ],
        faqHeading: 'Frequently asked questions about supplements and immunity',
        faqs: [
          {
            question: 'What should I review before choosing an immune supplement?',
            answer: 'Diet, sleep, stress, vaccines, medications, autoimmune disease, pregnancy, and possible deficiencies. Supplements do not replace medical care when symptoms are important.'
          },
          {
            question: 'Are vitamin C and zinc used the same way?',
            answer: 'No. Vitamin C depends heavily on diet and tolerance; zinc needs more care around dose, duration, nausea, and copper. Review each case separately.'
          },
          {
            question: 'Is echinacea appropriate for everyone?',
            answer: 'Not always. Related plant allergies, autoimmunity, pregnancy, breastfeeding, and medications should be reviewed before use.'
          },
          {
            question: 'When should I seek professional care?',
            answer: 'High fever, breathing difficulty, intense pain, persistent symptoms, immunosuppression, pregnancy, or chronic disease require professional guidance.'
          }
        ],
        supplementLinksHeading: 'Immune support supplement guides'
      }
    },
    'mens-health': {
      es: {
        intro: 'Esta guía compara suplementos buscados para salud masculina, próstata, vitalidad y estado nutricional. La lectura prudente separa síntomas urinarios, edad, medicamentos, dieta, laboratorios y señales que requieren revisión profesional.',
        highlights: [
          'Saw palmetto se revisa mejor con síntomas urinarios, diagnóstico prostático, medicamentos y expectativas acotadas.',
          'Zinc depende de dieta, deficiencia probable, dosis y duración; usar dosis altas por largo tiempo puede afectar cobre y tolerancia.',
          'Vitamina D y otros nutrientes tienen más sentido cuando hay baja exposición solar, dieta limitada o laboratorios que orientan la decisión.'
        ],
        priorityTopics: [
          {
            title: 'Saw palmetto y próstata',
            description: 'Revisar síntomas urinarios, edad, antígeno prostático, medicamentos y seguimiento profesional antes de usarlo.',
            supplementSlug: 'saw-palmetto',
            searchLabel: 'Abrir la guía de saw palmetto'
          },
          {
            title: 'Zinc y estado nutricional',
            description: 'Comparar dieta, laboratorios, dosis, duración, náusea y cobre antes de suplementar de forma sostenida.',
            supplementSlug: 'zinc',
            searchLabel: 'Abrir la guía de zinc'
          },
          {
            title: 'Vitamina D y contexto general',
            description: 'Útil para revisar exposición solar, dieta, análisis y salud ósea como parte del panorama general.',
            supplementSlug: 'vitamin-d',
            searchLabel: 'Abrir la guía de vitamina D'
          }
        ],
        relatedLinks: [
          {
            title: 'Deficiencias comunes',
            description: 'Zinc, vitamina D, B12 e hierro se interpretan mejor con dieta, etapa de vida y análisis cuando aplica.',
            href: '/portal/category/common-deficiencies',
            label: 'Revisar deficiencias'
          },
          {
            title: 'Salud cardiovascular',
            description: 'Presión, lípidos, edad y medicamentos pueden cambiar cómo se priorizan los suplementos.',
            href: '/portal/category/heart-health',
            label: 'Revisar salud cardíaca'
          },
          {
            title: 'Saw palmetto',
            description: 'Guía específica para revisar próstata, síntomas urinarios y límites de la evidencia.',
            href: '/portal/supplement/saw-palmetto?benefit=mens-health',
            label: 'Comparar saw palmetto'
          },
          {
            title: 'Zinc',
            description: 'Útil para revisar dieta, dosis, duración, cobre, náusea y tolerancia.',
            href: '/portal/supplement/zinc?benefit=mens-health',
            label: 'Comparar zinc'
          }
        ],
        faqHeading: 'Preguntas frecuentes sobre suplementos y salud masculina',
        faqs: [
          {
            question: '¿Qué revisar antes de usar saw palmetto?',
            answer: 'Síntomas urinarios, edad, evaluación prostática, antígeno prostático cuando corresponda, medicamentos y señales como sangre en orina o retención urinaria. Esas señales requieren atención profesional.'
          },
          {
            question: '¿Zinc aumenta testosterona?',
            answer: 'La relación depende sobre todo del estado nutricional. Si ya hay ingesta suficiente, más zinc no implica necesariamente mejor función hormonal y puede causar náusea o alterar cobre.'
          },
          {
            question: '¿Tiene sentido combinar varios suplementos?',
            answer: 'Conviene empezar por objetivo, dieta, sueño, ejercicio, medicamentos y análisis disponibles. Combinar productos sin revisar dosis aumenta el riesgo de duplicar minerales.'
          },
          {
            question: '¿Cuándo consultar a un profesional?',
            answer: 'Dolor, fiebre, sangre en orina, pérdida de peso, síntomas urinarios nuevos, infertilidad, uso de anticoagulantes o enfermedades crónicas ameritan orientación profesional.'
          }
        ],
        supplementLinksHeading: 'Guías de suplementos para salud masculina'
      },
      en: {
        intro: 'This guide compares supplements searched for men’s health, prostate context, vitality, and nutrition status. A prudent review separates urinary symptoms, age, medications, diet, labs, and signs that need professional review.',
        highlights: [
          'Saw palmetto is best reviewed through urinary symptoms, prostate evaluation, medications, and scoped expectations.',
          'Zinc depends on diet, plausible deficiency, dose, and duration; long-term high dosing can affect copper and tolerance.',
          'Vitamin D and other nutrients make more sense when sun exposure is low, diet is limited, or labs guide the decision.'
        ],
        priorityTopics: [
          {
            title: 'Saw palmetto and prostate context',
            description: 'Review urinary symptoms, age, prostate-specific antigen context, medications, and professional follow-up before use.',
            supplementSlug: 'saw-palmetto',
            searchLabel: 'Open the saw palmetto guide'
          },
          {
            title: 'Zinc and nutrition status',
            description: 'Compare diet, labs, dose, duration, nausea, and copper before sustained supplementation.',
            supplementSlug: 'zinc',
            searchLabel: 'Open the zinc guide'
          },
          {
            title: 'Vitamin D and general context',
            description: 'Useful for reviewing sun exposure, diet, labs, and bone health as part of the broader picture.',
            supplementSlug: 'vitamin-d',
            searchLabel: 'Open the vitamin D guide'
          }
        ],
        relatedLinks: [
          {
            title: 'Common deficiencies',
            description: 'Zinc, vitamin D, B12, and iron are interpreted better with diet, life stage, and labs when relevant.',
            href: '/portal/category/common-deficiencies',
            label: 'Review deficiencies'
          },
          {
            title: 'Heart health',
            description: 'Blood pressure, lipids, age, and medications can change how supplements are prioritized.',
            href: '/portal/category/heart-health',
            label: 'Review heart health'
          },
          {
            title: 'Saw palmetto',
            description: 'A specific guide for reviewing prostate context, urinary symptoms, and evidence limits.',
            href: '/portal/supplement/saw-palmetto?benefit=mens-health',
            label: 'Compare saw palmetto'
          },
          {
            title: 'Zinc',
            description: 'Useful for reviewing diet, dose, duration, copper, and tolerance.',
            href: '/portal/supplement/zinc?benefit=mens-health',
            label: 'Compare zinc'
          }
        ],
        faqHeading: 'Frequently asked questions about supplements and men’s health',
        faqs: [
          {
            question: 'What should I review before using saw palmetto?',
            answer: 'Urinary symptoms, age, prostate evaluation, prostate-specific antigen when relevant, medications, and signs such as blood in urine or urinary retention. Those signs need professional care.'
          },
          {
            question: 'Does zinc increase testosterone?',
            answer: 'The relationship depends mostly on nutrition status. If intake is already sufficient, more zinc does not necessarily mean better hormone function and may cause nausea or affect copper.'
          },
          {
            question: 'Does it make sense to combine several supplements?',
            answer: 'Start with the goal, diet, sleep, exercise, medications, and available labs. Combining products without reviewing doses increases the risk of duplicating minerals.'
          },
          {
            question: 'When should I talk to a professional?',
            answer: 'Pain, fever, blood in urine, weight loss, new urinary symptoms, fertility concerns, anticoagulant use, or chronic disease warrant professional guidance.'
          }
        ],
        supplementLinksHeading: 'Men’s health supplement guides'
      }
    },
    'womens-health': {
      es: {
        intro: 'Esta guía compara suplementos buscados para salud femenina, ciclo menstrual, embarazo, energía y salud ósea. La lectura responsable separa etapa de vida, dieta, laboratorios, medicamentos y señales que requieren evaluación profesional.',
        highlights: [
          'Folato se interpreta por etapa reproductiva, embarazo posible o planeado, dieta y seguimiento profesional.',
          'Hierro debe revisarse con ferritina, hemoglobina, pérdidas menstruales, tolerancia digestiva e interacciones.',
          'Calcio y vitamina D pertenecen al contexto de salud ósea, ingesta dietaria, edad y riesgo individual.'
        ],
        priorityTopics: [
          {
            title: 'Folato y etapa reproductiva',
            description: 'Revisar embarazo posible o planeado, dieta, medicamentos y dosis con orientación profesional.',
            supplementSlug: 'folic-acid',
            searchLabel: 'Abrir la guía de folato'
          },
          {
            title: 'Hierro guiado por análisis',
            description: 'Comparar ferritina, hemoglobina, menstruación, tolerancia digestiva e interacciones antes de suplementar.',
            supplementSlug: 'iron',
            searchLabel: 'Abrir la guía de hierro'
          },
          {
            title: 'Calcio y salud ósea',
            description: 'Revisar ingesta dietaria, vitamina D, edad, menopausia y antecedentes antes de elegir dosis.',
            supplementSlug: 'calcium',
            searchLabel: 'Abrir la guía de calcio'
          }
        ],
        relatedLinks: [
          {
            title: 'Deficiencias comunes',
            description: 'Hierro, folato, B12, vitamina D y zinc se interpretan mejor con dieta, etapa de vida y análisis.',
            href: '/portal/category/common-deficiencies',
            label: 'Revisar deficiencias'
          },
          {
            title: 'Salud articular y ósea',
            description: 'Calcio, vitamina D, colágeno y glucosamina se comparan mejor dentro del contexto óseo y articular.',
            href: '/portal/category/joint-bone-health',
            label: 'Revisar salud ósea'
          },
          {
            title: 'Folato',
            description: 'Guía específica para revisar etapa reproductiva, dieta, dosis y seguimiento.',
            href: '/portal/supplement/folic-acid?benefit=womens-health',
            label: 'Comparar folato'
          },
          {
            title: 'Hierro',
            description: 'Útil para revisar laboratorio, tolerancia digestiva, dieta e interacciones.',
            href: '/portal/supplement/iron?benefit=womens-health',
            label: 'Comparar hierro'
          }
        ],
        faqHeading: 'Preguntas frecuentes sobre suplementos y salud femenina',
        faqs: [
          {
            question: '¿Qué revisar antes de usar hierro?',
            answer: 'Ferritina, hemoglobina, pérdidas menstruales, dieta, embarazo, tolerancia digestiva y medicamentos. El hierro no debería elegirse solo por cansancio sin contexto.'
          },
          {
            question: '¿Folato y ácido fólico son lo mismo?',
            answer: 'Se relacionan, pero la forma, dosis y momento importan. En embarazo posible o planeado conviene revisar la decisión con un profesional.'
          },
          {
            question: '¿Calcio siempre debe suplementarse?',
            answer: 'No. Primero conviene estimar ingesta dietaria, vitamina D, edad, menopausia, antecedentes y medicamentos para evitar dosis innecesarias.'
          },
          {
            question: '¿Cuándo buscar atención profesional?',
            answer: 'Sangrado abundante, dolor intenso, embarazo, lactancia, anemia, fatiga persistente, mareos, pérdida de peso o enfermedades crónicas requieren orientación profesional.'
          }
        ],
        supplementLinksHeading: 'Guías de suplementos para salud femenina'
      },
      en: {
        intro: 'This guide compares supplements searched for women’s health, menstrual cycle context, pregnancy context, energy, and bone health. Responsible review separates life stage, diet, labs, medications, and signs that need professional review.',
        highlights: [
          'Folate is interpreted through reproductive stage, possible or planned pregnancy, diet, and professional follow-up.',
          'Iron should be reviewed with ferritin, hemoglobin, menstrual losses, digestive tolerance, and interactions.',
          'Calcium and vitamin D belong in the bone-health context, including dietary intake, age, and individual risk.'
        ],
        priorityTopics: [
          {
            title: 'Folate and reproductive stage',
            description: 'Review possible or planned pregnancy, diet, medications, and dose with professional guidance.',
            supplementSlug: 'folic-acid',
            searchLabel: 'Open the folate guide'
          },
          {
            title: 'Iron guided by labs',
            description: 'Compare ferritin, hemoglobin, menstruation, digestive tolerance, and interactions before supplementing.',
            supplementSlug: 'iron',
            searchLabel: 'Open the iron guide'
          },
          {
            title: 'Calcium and bone health',
            description: 'Review dietary intake, vitamin D, age, menopause, and history before choosing a dose.',
            supplementSlug: 'calcium',
            searchLabel: 'Open the calcium guide'
          }
        ],
        relatedLinks: [
          {
            title: 'Common deficiencies',
            description: 'Iron, folate, B12, vitamin D, and zinc are interpreted better with diet, life stage, and labs.',
            href: '/portal/category/common-deficiencies',
            label: 'Review deficiencies'
          },
          {
            title: 'Joint and bone health',
            description: 'Calcium, vitamin D, collagen, and glucosamine compare better inside bone and joint context.',
            href: '/portal/category/joint-bone-health',
            label: 'Review bone health'
          },
          {
            title: 'Folate',
            description: 'A specific guide for reviewing reproductive stage, diet, dose, and follow-up.',
            href: '/portal/supplement/folic-acid?benefit=womens-health',
            label: 'Compare folate'
          },
          {
            title: 'Iron',
            description: 'Useful for reviewing labs, digestive tolerance, diet, and interactions.',
            href: '/portal/supplement/iron?benefit=womens-health',
            label: 'Compare iron'
          }
        ],
        faqHeading: 'Frequently asked questions about supplements and women’s health',
        faqs: [
          {
            question: 'What should I review before using iron?',
            answer: 'Ferritin, hemoglobin, menstrual losses, diet, pregnancy, digestive tolerance, and medications. Iron should not be chosen based on tiredness alone without context.'
          },
          {
            question: 'Are folate and folic acid the same?',
            answer: 'They are related, but form, dose, and timing matter. With possible or planned pregnancy, review the decision with a professional.'
          },
          {
            question: 'Should calcium always be supplemented?',
            answer: 'No. First estimate dietary intake, vitamin D, age, menopause, history, and medications to avoid unnecessary dosing.'
          },
          {
            question: 'When should I seek professional care?',
            answer: 'Heavy bleeding, intense pain, pregnancy, breastfeeding, anemia, persistent fatigue, dizziness, weight loss, or chronic disease warrant professional guidance.'
          }
        ],
        supplementLinksHeading: 'Women’s health supplement guides'
      }
    },
    'blood-sugar': {
      es: {
        intro: 'Esta guía compara suplementos buscados para glucosa, comidas, sensibilidad a la insulina y salud metabólica. La lectura responsable separa dieta, actividad física, laboratorios, medicamentos y seguimiento profesional.',
        highlights: [
          'Berberina se revisa con especial cuidado si hay medicamentos para diabetes, embarazo, lactancia o problemas gastrointestinales.',
          'Psyllium es una fibra soluble que se compara mejor por comidas, saciedad, tolerancia digestiva y separación de medicamentos.',
          'Canela tiene evidencia variable y depende del tipo de extracto; conviene revisar dosis, calidad y seguridad hepática.',
          'Magnesio pertenece más al contexto de deficiencia o ingesta baja que a una promesa directa sobre glucosa.'
        ],
        priorityTopics: [
          {
            title: 'Berberina y medicamentos',
            description: 'Revisar glucosa, medicamentos, embarazo, lactancia, tolerancia digestiva e interacciones antes de usarla.',
            supplementSlug: 'berberine',
            searchLabel: 'Abrir la guía de berberina'
          },
          {
            title: 'Psyllium con comidas',
            description: 'Comparar fibra soluble, saciedad, agua, tolerancia digestiva y separación de medicamentos.',
            supplementSlug: 'fiber-psyllium',
            searchLabel: 'Abrir la guía de psyllium'
          },
          {
            title: 'Canela y extracto',
            description: 'Revisar tipo de canela, extracto, dosis, variabilidad de evidencia y seguridad antes de usarla.',
            supplementSlug: 'cinnamon',
            searchLabel: 'Abrir la guía de canela'
          }
        ],
        relatedLinks: [
          {
            title: 'Deficiencias comunes',
            description: 'Magnesio, vitamina D y otros nutrientes se interpretan mejor con dieta, laboratorios y contexto metabólico.',
            href: '/portal/category/common-deficiencies',
            label: 'Revisar deficiencias'
          },
          {
            title: 'Salud cardiovascular',
            description: 'Glucosa, lípidos y presión arterial suelen revisarse juntos dentro del riesgo cardiometabólico.',
            href: '/portal/category/heart-health',
            label: 'Revisar salud cardíaca'
          },
          {
            title: 'Berberina',
            description: 'Guía específica para revisar medicamentos, tolerancia digestiva y límites de evidencia.',
            href: '/portal/supplement/berberine?benefit=blood-sugar',
            label: 'Comparar berberina'
          },
          {
            title: 'Psyllium',
            description: 'Útil para revisar comidas, fibra soluble, agua, saciedad e interacciones por horario.',
            href: '/portal/supplement/fiber-psyllium?benefit=blood-sugar',
            label: 'Comparar psyllium'
          }
        ],
        faqHeading: 'Preguntas frecuentes sobre suplementos y glucosa',
        faqs: [
          {
            question: '¿Qué revisar antes de usar berberina?',
            answer: 'Medicamentos para glucosa, embarazo, lactancia, función hepática o renal, tolerancia digestiva y seguimiento profesional. No debe sustituir controles ni tratamiento indicado.'
          },
          {
            question: '¿Psyllium se usa igual que berberina?',
            answer: 'No. Psyllium es fibra soluble y depende mucho de comida, agua y tolerancia digestiva. Berberina requiere más cuidado con medicamentos e interacciones.'
          },
          {
            question: '¿Canela tiene evidencia consistente?',
            answer: 'La evidencia es variable y depende del producto, extracto y dosis. También conviene revisar seguridad hepática y uso con otros suplementos.'
          },
          {
            question: '¿Cuándo buscar orientación profesional?',
            answer: 'Glucosa alta, síntomas nuevos, diabetes, embarazo, hipoglucemias, uso de insulina o medicamentos para glucosa requieren orientación profesional.'
          }
        ],
        supplementLinksHeading: 'Guías de suplementos para glucosa'
      },
      en: {
        intro: 'This guide compares supplements searched for glucose context, meals, insulin sensitivity, and metabolic health. Responsible review separates diet, physical activity, labs, medications, and professional follow-up.',
        highlights: [
          'Berberine needs special care when diabetes medications, pregnancy, breastfeeding, or gastrointestinal issues are relevant.',
          'Psyllium is a soluble fiber best compared by meals, satiety, digestive tolerance, and medication timing.',
          'Cinnamon has variable evidence and depends on extract type; dose, quality, and liver safety should be reviewed.',
          'Magnesium fits more in deficiency or low-intake context than as a direct glucose promise.'
        ],
        priorityTopics: [
          {
            title: 'Berberine and medications',
            description: 'Review glucose context, medications, pregnancy, breastfeeding, digestive tolerance, and interactions before use.',
            supplementSlug: 'berberine',
            searchLabel: 'Open the berberine guide'
          },
          {
            title: 'Psyllium with meals',
            description: 'Compare soluble fiber, satiety, water intake, digestive tolerance, and medication timing.',
            supplementSlug: 'fiber-psyllium',
            searchLabel: 'Open the psyllium guide'
          },
          {
            title: 'Cinnamon and extract type',
            description: 'Review cinnamon type, extract, dose, evidence variability, and safety before use.',
            supplementSlug: 'cinnamon',
            searchLabel: 'Open the cinnamon guide'
          }
        ],
        relatedLinks: [
          {
            title: 'Common deficiencies',
            description: 'Magnesium, vitamin D, and other nutrients are interpreted better with diet, labs, and metabolic context.',
            href: '/portal/category/common-deficiencies',
            label: 'Review deficiencies'
          },
          {
            title: 'Heart health',
            description: 'Glucose, lipids, and blood pressure are often reviewed together in cardiometabolic risk.',
            href: '/portal/category/heart-health',
            label: 'Review heart health'
          },
          {
            title: 'Berberine',
            description: 'A specific guide for reviewing medications, digestive tolerance, and evidence limits.',
            href: '/portal/supplement/berberine?benefit=blood-sugar',
            label: 'Compare berberine'
          },
          {
            title: 'Psyllium',
            description: 'Useful for reviewing meals, soluble fiber, water, satiety, and timing interactions.',
            href: '/portal/supplement/fiber-psyllium?benefit=blood-sugar',
            label: 'Compare psyllium'
          }
        ],
        faqHeading: 'Frequently asked questions about supplements and blood sugar',
        faqs: [
          {
            question: 'What should I review before using berberine?',
            answer: 'Glucose medications, pregnancy, breastfeeding, liver or kidney context, digestive tolerance, and professional follow-up. It should not replace monitoring or indicated care.'
          },
          {
            question: 'Is psyllium used the same way as berberine?',
            answer: 'No. Psyllium is soluble fiber and depends heavily on meals, water, and digestive tolerance. Berberine needs more care around medications and interactions.'
          },
          {
            question: 'Is cinnamon evidence consistent?',
            answer: 'Evidence is variable and depends on product, extract, and dose. Liver safety and use with other supplements should also be reviewed.'
          },
          {
            question: 'When should I seek professional guidance?',
            answer: 'High glucose, new symptoms, diabetes, pregnancy, hypoglycemia, insulin use, or glucose medications warrant professional guidance.'
          }
        ],
        supplementLinksHeading: 'Blood sugar supplement guides'
      }
    },
    'inflammation': {
      es: {
        intro: 'Esta guía compara suplementos buscados por inflamación, dolor articular, recuperación y marcadores inflamatorios. La lectura responsable separa causa, diagnóstico, medicamentos, cirugía, dosis y seguridad.',
        highlights: [
          'Curcumina depende mucho de formulación, absorción, dosis y uso con anticoagulantes o medicamentos.',
          'Omega-3 se interpreta mejor por EPA/DHA, dosis, lípidos, salud cardiovascular y riesgo de sangrado.',
          'Boswellia y jengibre son opciones herbales donde importan extracto, tolerancia digestiva y contexto articular.'
        ],
        priorityTopics: [
          {
            title: 'Curcumina y formulación',
            description: 'Comparar extracto, biodisponibilidad, dosis, tolerancia digestiva y medicamentos antes de elegir producto.',
            supplementSlug: 'curcumin',
            searchLabel: 'Abrir la guía de curcumina'
          },
          {
            title: 'Omega-3 y contexto cardiovascular',
            description: 'Revisar EPA/DHA, dosis, lípidos, anticoagulantes, cirugía y objetivo principal antes de suplementar.',
            supplementSlug: 'omega-3',
            searchLabel: 'Abrir la guía de omega-3'
          },
          {
            title: 'Boswellia y articulaciones',
            description: 'Opción herbal a revisar por extracto, tolerancia digestiva, medicamentos y tipo de molestia articular.',
            supplementSlug: 'boswellia-serrata',
            searchLabel: 'Abrir la guía de boswellia'
          }
        ],
        relatedLinks: [
          {
            title: 'Salud articular y ósea',
            description: 'Si la intención principal es articulación, compara vitamina D, glucosamina, colágeno y contexto óseo.',
            href: '/portal/category/joint-bone-health',
            label: 'Revisar articulaciones'
          },
          {
            title: 'Salud cardiovascular',
            description: 'Omega-3, lípidos, presión arterial y medicamentos se revisan mejor dentro del contexto cardiovascular.',
            href: '/portal/category/heart-health',
            label: 'Revisar salud cardíaca'
          },
          {
            title: 'Curcumina',
            description: 'Guía específica para revisar formulación, absorción, dosis y seguridad.',
            href: '/portal/supplement/curcumin?benefit=inflammation',
            label: 'Comparar curcumina'
          },
          {
            title: 'Omega-3',
            description: 'Útil para revisar EPA/DHA, dosis, lípidos, anticoagulantes y cirugía.',
            href: '/portal/supplement/omega-3?benefit=inflammation',
            label: 'Comparar omega-3'
          }
        ],
        faqHeading: 'Preguntas frecuentes sobre suplementos e inflamación',
        faqs: [
          {
            question: '¿Qué revisar antes de usar curcumina?',
            answer: 'Formulación, absorción, dosis, tolerancia digestiva, anticoagulantes, cirugía programada, embarazo y medicamentos. La causa del dolor o inflamación debe estar clara.'
          },
          {
            question: '¿Omega-3 y curcumina se comparan igual?',
            answer: 'No. Omega-3 suele revisarse por EPA/DHA, lípidos y salud cardiovascular; curcumina depende más de formulación y absorción. Ambos requieren revisar seguridad.'
          },
          {
            question: '¿Boswellia aplica para cualquier molestia?',
            answer: 'No conviene generalizar. La utilidad depende del tipo de molestia, extracto, dosis, tolerancia y medicamentos.'
          },
          {
            question: '¿Cuándo buscar atención profesional?',
            answer: 'Dolor intenso, fiebre, hinchazón marcada, pérdida de peso, lesión, enfermedad autoinmune, cirugía próxima o uso de anticoagulantes requieren orientación profesional.'
          }
        ],
        supplementLinksHeading: 'Guías de suplementos para inflamación'
      },
      en: {
        intro: 'This guide compares supplements searched for inflammation, joint discomfort, recovery, and inflammatory markers. Responsible review separates cause, diagnosis, medications, surgery, dose, and safety.',
        highlights: [
          'Curcumin depends heavily on formulation, absorption, dose, and use with anticoagulants or medications.',
          'Omega-3 is interpreted better by EPA/DHA, dose, lipids, heart-health context, and bleeding risk.',
          'Boswellia and ginger are herbal options where extract, digestive tolerance, and joint context matter.'
        ],
        priorityTopics: [
          {
            title: 'Curcumin and formulation',
            description: 'Compare extract, bioavailability, dose, digestive tolerance, and medications before choosing a product.',
            supplementSlug: 'curcumin',
            searchLabel: 'Open the curcumin guide'
          },
          {
            title: 'Omega-3 and heart context',
            description: 'Review EPA/DHA, dose, lipids, anticoagulants, surgery, and main goal before supplementing.',
            supplementSlug: 'omega-3',
            searchLabel: 'Open the omega-3 guide'
          },
          {
            title: 'Boswellia and joints',
            description: 'A herbal option to review by extract, digestive tolerance, medications, and type of joint discomfort.',
            supplementSlug: 'boswellia-serrata',
            searchLabel: 'Open the boswellia guide'
          }
        ],
        relatedLinks: [
          {
            title: 'Joint and bone health',
            description: 'If the main intent is joint context, compare vitamin D, glucosamine, collagen, and bone context.',
            href: '/portal/category/joint-bone-health',
            label: 'Review joints'
          },
          {
            title: 'Heart health',
            description: 'Omega-3, lipids, blood pressure, and medications are reviewed better inside cardiovascular context.',
            href: '/portal/category/heart-health',
            label: 'Review heart health'
          },
          {
            title: 'Curcumin',
            description: 'A specific guide for reviewing formulation, absorption, dose, and safety.',
            href: '/portal/supplement/curcumin?benefit=inflammation',
            label: 'Compare curcumin'
          },
          {
            title: 'Omega-3',
            description: 'Useful for reviewing EPA/DHA, dose, lipids, anticoagulants, and surgery.',
            href: '/portal/supplement/omega-3?benefit=inflammation',
            label: 'Compare omega-3'
          }
        ],
        faqHeading: 'Frequently asked questions about supplements and inflammation',
        faqs: [
          {
            question: 'What should I review before using curcumin?',
            answer: 'Formulation, absorption, dose, digestive tolerance, anticoagulants, planned surgery, pregnancy, and medications. The cause of pain or inflammation should be clear.'
          },
          {
            question: 'Are omega-3 and curcumin compared the same way?',
            answer: 'No. Omega-3 is usually reviewed by EPA/DHA, lipids, and heart-health context; curcumin depends more on formulation and absorption. Both require safety review.'
          },
          {
            question: 'Is boswellia appropriate for any discomfort?',
            answer: 'Avoid generalizing. Usefulness depends on discomfort type, extract, dose, tolerance, and medications.'
          },
          {
            question: 'When should I seek professional care?',
            answer: 'Intense pain, fever, marked swelling, weight loss, injury, autoimmune disease, upcoming surgery, or anticoagulant use warrant professional guidance.'
          }
        ],
        supplementLinksHeading: 'Inflammation supplement guides'
      }
    },
    'sports-performance': {
      es: {
        intro: 'Esta guía compara suplementos buscados para rendimiento deportivo, fuerza, potencia, resistencia y recuperación. La lectura útil empieza por objetivo de entrenamiento, timing, dosis, tolerancia, sueño y reglas de competencia.',
        highlights: [
          'Creatina se revisa por fuerza, potencia, entrenamiento y consistencia de uso, con atención a hidratación y contexto renal individual.',
          'Cafeína encaja mejor por timing, alerta, potencia o resistencia, pero tolerancia, ansiedad, presión arterial y sueño importan.',
          'Beta-alanina y citrulina dependen del tipo de esfuerzo, duración, dosis, parestesia o tolerancia gastrointestinal.'
        ],
        priorityTopics: [
          {
            title: 'Creatina para fuerza y potencia',
            description: 'Comparar objetivo, dosis diaria, timing flexible, hidratación, entrenamiento y contexto renal individual.',
            supplementSlug: 'creatine',
            searchLabel: 'Abrir la guía de creatina'
          },
          {
            title: 'Cafeína y timing',
            description: 'Revisar dosis, horario, tolerancia, ansiedad, presión arterial, sueño y reglas de competencia.',
            supplementSlug: 'caffeine',
            searchLabel: 'Abrir la guía de cafeína'
          },
          {
            title: 'Beta-alanina para esfuerzos intensos',
            description: 'Comparar duración del esfuerzo, dosis dividida, parestesia y consistencia antes de usarla.',
            supplementSlug: 'beta-alanine',
            searchLabel: 'Abrir la guía de beta-alanina'
          }
        ],
        relatedLinks: [
          {
            title: 'Ganancia muscular',
            description: 'Si el objetivo principal es músculo, compara creatina, proteína de suero y beta-alanina en ese contexto.',
            href: '/portal/category/muscle-gain',
            label: 'Revisar músculo'
          },
          {
            title: 'Energía y fatiga',
            description: 'Si la intención es cansancio o alerta diaria, revisa cafeína, rhodiola, sueño y deficiencias.',
            href: '/portal/category/energy',
            label: 'Revisar energía'
          },
          {
            title: 'Creatina',
            description: 'Guía específica para fuerza, potencia, dosis, hidratación y contexto de entrenamiento.',
            href: '/portal/supplement/creatine?benefit=sports-performance',
            label: 'Comparar creatina'
          },
          {
            title: 'Cafeína',
            description: 'Útil para revisar timing, tolerancia, sueño, ansiedad y presión arterial.',
            href: '/portal/supplement/caffeine?benefit=sports-performance',
            label: 'Comparar cafeína'
          }
        ],
        faqHeading: 'Preguntas frecuentes sobre suplementos y rendimiento deportivo',
        faqs: [
          {
            question: '¿Qué revisar antes de elegir un suplemento deportivo?',
            answer: 'Objetivo, tipo de entrenamiento, sueño, alimentación, cafeína total, medicamentos, condiciones médicas y reglas de competencia.'
          },
          {
            question: '¿Creatina y cafeína se usan igual?',
            answer: 'No. Creatina suele ser de uso consistente y no depende tanto del horario; cafeína depende mucho del timing, tolerancia y sueño.'
          },
          {
            question: '¿Beta-alanina aplica para cualquier ejercicio?',
            answer: 'No necesariamente. Se revisa más para esfuerzos intensos de duración corta a media, y la parestesia puede limitar tolerancia.'
          },
          {
            question: '¿Cuándo buscar orientación profesional?',
            answer: 'Enfermedad renal, hipertensión, arritmias, embarazo, lesiones, uso de medicamentos o competencias reguladas ameritan orientación profesional.'
          }
        ],
        supplementLinksHeading: 'Guías de suplementos para rendimiento deportivo'
      },
      en: {
        intro: 'This guide compares supplements searched for sports performance, strength, power, endurance, and recovery. Useful review starts with training goal, timing, dose, tolerance, sleep, and competition rules.',
        highlights: [
          'Creatine is reviewed by strength, power, training, and consistent use, with attention to hydration and individual kidney context.',
          'Caffeine fits timing, alertness, power, or endurance, but tolerance, anxiety, blood pressure, and sleep matter.',
          'Beta-alanine and citrulline depend on effort type, duration, dose, paresthesia, or gastrointestinal tolerance.'
        ],
        priorityTopics: [
          {
            title: 'Creatine for strength and power',
            description: 'Compare goal, daily dose, flexible timing, hydration, training, and individual kidney context.',
            supplementSlug: 'creatine',
            searchLabel: 'Open the creatine guide'
          },
          {
            title: 'Caffeine and timing',
            description: 'Review dose, timing, tolerance, anxiety, blood pressure, sleep, and competition rules.',
            supplementSlug: 'caffeine',
            searchLabel: 'Open the caffeine guide'
          },
          {
            title: 'Beta-alanine for intense efforts',
            description: 'Compare effort duration, divided dosing, paresthesia, and consistency before use.',
            supplementSlug: 'beta-alanine',
            searchLabel: 'Open the beta-alanine guide'
          }
        ],
        relatedLinks: [
          {
            title: 'Muscle gain',
            description: 'If the main goal is muscle, compare creatine, whey protein, and beta-alanine in that context.',
            href: '/portal/category/muscle-gain',
            label: 'Review muscle'
          },
          {
            title: 'Energy and fatigue',
            description: 'If the intent is tiredness or daily alertness, review caffeine, rhodiola, sleep, and deficiencies.',
            href: '/portal/category/energy',
            label: 'Review energy'
          },
          {
            title: 'Creatine',
            description: 'A specific guide for strength, power, dose, hydration, and training context.',
            href: '/portal/supplement/creatine?benefit=sports-performance',
            label: 'Compare creatine'
          },
          {
            title: 'Caffeine',
            description: 'Useful for reviewing timing, tolerance, sleep, anxiety, and blood pressure.',
            href: '/portal/supplement/caffeine?benefit=sports-performance',
            label: 'Compare caffeine'
          }
        ],
        faqHeading: 'Frequently asked questions about supplements and sports performance',
        faqs: [
          {
            question: 'What should I review before choosing a sports supplement?',
            answer: 'Goal, training type, sleep, nutrition, total caffeine, medications, medical conditions, and competition rules.'
          },
          {
            question: 'Are creatine and caffeine used the same way?',
            answer: 'No. Creatine is usually used consistently and is less timing-dependent; caffeine depends heavily on timing, tolerance, and sleep.'
          },
          {
            question: 'Is beta-alanine relevant for every workout?',
            answer: 'Not necessarily. It is reviewed more for intense efforts of short to moderate duration, and paresthesia may limit tolerance.'
          },
          {
            question: 'When should I seek professional guidance?',
            answer: 'Kidney disease, hypertension, arrhythmias, pregnancy, injuries, medication use, or regulated competitions warrant professional guidance.'
          }
        ],
        supplementLinksHeading: 'Sports performance supplement guides'
      }
    },
    'hormonal-health': {
      es: {
        intro: 'Esta guía compara suplementos buscados para salud hormonal, ciclo menstrual, SOP, metabolismo y síntomas premenstruales. La lectura prudente separa diagnóstico, laboratorios, medicamentos, dieta, sueño y etapa de vida.',
        highlights: [
          'Inositol se revisa sobre todo en contexto de SOP, sensibilidad a la insulina y seguimiento profesional.',
          'Vitamina D pertenece al contexto de deficiencia, salud ósea e inmunidad; conviene interpretarla con análisis.',
          'Zinc y magnesio dependen de dieta, ingesta baja, tolerancia y uso combinado con otros minerales.'
        ],
        priorityTopics: [
          {
            title: 'Inositol y contexto SOP',
            description: 'Revisar diagnóstico, ciclo, metabolismo, medicamentos, embarazo posible y seguimiento profesional.',
            supplementSlug: 'inositol',
            searchLabel: 'Abrir la guía de inositol'
          },
          {
            title: 'Vitamina D y deficiencia',
            description: 'Comparar exposición solar, dieta, análisis 25-OH vitamina D, salud ósea y etapa de vida.',
            supplementSlug: 'vitamin-d',
            searchLabel: 'Abrir la guía de vitamina D'
          },
          {
            title: 'Zinc y magnesio',
            description: 'Revisar dieta, dosis, tolerancia, cobre, sueño y uso de varios minerales al mismo tiempo.',
            supplementSlug: 'zinc',
            searchLabel: 'Abrir la guía de zinc'
          }
        ],
        relatedLinks: [
          {
            title: 'Salud femenina',
            description: 'Folato, hierro, calcio y etapa reproductiva pueden ayudar a ordenar preguntas de ciclo o embarazo.',
            href: '/portal/category/womens-health',
            label: 'Revisar salud femenina'
          },
          {
            title: 'Glucosa y metabolismo',
            description: 'Cuando SOP o sensibilidad a la insulina son parte del contexto, revisa el cluster metabólico.',
            href: '/portal/category/blood-sugar',
            label: 'Revisar glucosa'
          },
          {
            title: 'Inositol',
            description: 'Guía específica para revisar SOP, ciclo, metabolismo, dosis y seguimiento.',
            href: '/portal/supplement/inositol?benefit=hormonal-health',
            label: 'Comparar inositol'
          },
          {
            title: 'Vitamina D',
            description: 'Útil para revisar deficiencia, análisis, dosis y salud ósea.',
            href: '/portal/supplement/vitamin-d?benefit=hormonal-health',
            label: 'Comparar vitamina D'
          }
        ],
        faqHeading: 'Preguntas frecuentes sobre suplementos y salud hormonal',
        faqs: [
          {
            question: '¿Qué revisar antes de usar inositol?',
            answer: 'Diagnóstico, ciclo menstrual, SOP, glucosa, embarazo posible, medicamentos y seguimiento profesional. La decisión no debería basarse solo en síntomas generales.'
          },
          {
            question: '¿Vitamina D cambia hormonas?',
            answer: 'Vitamina D se interpreta mejor como nutriente ligado a deficiencia, huesos e inmunidad. Si hay síntomas hormonales, conviene revisar causa y análisis antes de elegir suplementos.'
          },
          {
            question: '¿Zinc y magnesio se pueden combinar?',
            answer: 'Depende de dosis, dieta, tolerancia y otros productos. Combinar minerales puede duplicar dosis o afectar absorción de otros nutrientes.'
          },
          {
            question: '¿Cuándo buscar orientación profesional?',
            answer: 'Ciclos muy irregulares, sangrado abundante, embarazo, infertilidad, dolor intenso, acné severo, síntomas nuevos o uso de hormonas ameritan orientación profesional.'
          }
        ],
        supplementLinksHeading: 'Guías de suplementos para salud hormonal'
      },
      en: {
        intro: 'This guide compares supplements searched for hormonal health, menstrual cycle context, PCOS, metabolism, and premenstrual symptoms. Prudent review separates diagnosis, labs, medications, diet, sleep, and life stage.',
        highlights: [
          'Inositol is reviewed mostly in PCOS context, insulin sensitivity, and professional follow-up.',
          'Vitamin D belongs in deficiency, bone health, and immune context; labs make interpretation stronger.',
          'Zinc and magnesium depend on diet, low intake, tolerance, and combined mineral use.'
        ],
        priorityTopics: [
          {
            title: 'Inositol and PCOS context',
            description: 'Review diagnosis, cycle, metabolism, medications, possible pregnancy, and professional follow-up.',
            supplementSlug: 'inositol',
            searchLabel: 'Open the inositol guide'
          },
          {
            title: 'Vitamin D and deficiency',
            description: 'Compare sun exposure, diet, 25-OH vitamin D labs, bone health, and life stage.',
            supplementSlug: 'vitamin-d',
            searchLabel: 'Open the vitamin D guide'
          },
          {
            title: 'Zinc and magnesium',
            description: 'Review diet, dose, tolerance, copper, sleep, and using several minerals at the same time.',
            supplementSlug: 'zinc',
            searchLabel: 'Open the zinc guide'
          }
        ],
        relatedLinks: [
          {
            title: 'Women’s health',
            description: 'Folate, iron, calcium, and reproductive stage can help organize cycle or pregnancy questions.',
            href: '/portal/category/womens-health',
            label: 'Review women’s health'
          },
          {
            title: 'Blood sugar and metabolism',
            description: 'When PCOS or insulin sensitivity is part of the context, review the metabolic cluster.',
            href: '/portal/category/blood-sugar',
            label: 'Review glucose'
          },
          {
            title: 'Inositol',
            description: 'A specific guide for reviewing PCOS, cycle context, metabolism, dose, and follow-up.',
            href: '/portal/supplement/inositol?benefit=hormonal-health',
            label: 'Compare inositol'
          },
          {
            title: 'Vitamin D',
            description: 'Useful for reviewing deficiency, labs, dose, and bone health.',
            href: '/portal/supplement/vitamin-d?benefit=hormonal-health',
            label: 'Compare vitamin D'
          }
        ],
        faqHeading: 'Frequently asked questions about supplements and hormonal health',
        faqs: [
          {
            question: 'What should I review before using inositol?',
            answer: 'Diagnosis, menstrual cycle, PCOS, glucose, possible pregnancy, medications, and professional follow-up. The decision should not be based only on general symptoms.'
          },
          {
            question: 'Does vitamin D change hormones?',
            answer: 'Vitamin D is interpreted better as a nutrient tied to deficiency, bones, and immune context. If hormonal symptoms are present, review cause and labs before choosing supplements.'
          },
          {
            question: 'Can zinc and magnesium be combined?',
            answer: 'It depends on dose, diet, tolerance, and other products. Combining minerals can duplicate doses or affect absorption of other nutrients.'
          },
          {
            question: 'When should I seek professional guidance?',
            answer: 'Very irregular cycles, heavy bleeding, pregnancy, fertility concerns, intense pain, severe acne, new symptoms, or hormone use warrant professional guidance.'
          }
        ],
        supplementLinksHeading: 'Hormonal health supplement guides'
      }
    },
    'migraine-headache': {
      es: {
        intro: 'Esta guía compara suplementos buscados en contexto de migraña y dolor de cabeza. La lectura segura separa patrón de dolor, diagnóstico, sueño, medicamentos, deficiencias y señales de alarma antes de elegir una opción.',
        highlights: [
          'Magnesio se revisa mejor con ingesta baja, síntomas compatibles, tolerancia digestiva y función renal.',
          'Riboflavina y CoQ10 se interpretan por protocolo, dosis, constancia y seguimiento, no como respuesta inmediata.',
          'Melatonina pertenece más al contexto de sueño irregular; si el dolor cambia o aparece de forma intensa, se prioriza evaluación profesional.'
        ],
        priorityTopics: [
          {
            title: 'Magnesio y contexto de deficiencia',
            description: 'Comparar dieta, tolerancia digestiva, función renal, medicamentos y patrón de dolor antes de usarlo.',
            supplementSlug: 'magnesium',
            searchLabel: 'Abrir la guía de magnesio'
          },
          {
            title: 'Riboflavina y constancia',
            description: 'Revisar dosis, duración, tolerancia, expectativas y seguimiento cuando se usa dentro de un plan.',
            supplementSlug: 'riboflavin',
            searchLabel: 'Abrir la guía de riboflavina'
          },
          {
            title: 'CoQ10 y energía celular',
            description: 'Comparar dosis, tiempo de uso, medicamentos, costo y contexto de salud general.',
            supplementSlug: 'coenzyme-q10',
            searchLabel: 'Abrir la guía de CoQ10'
          }
        ],
        relatedLinks: [
          {
            title: 'Sueño y descanso',
            description: 'Si el dolor se relaciona con sueño irregular, revisa primero hábitos de sueño y opciones del cluster de sueño.',
            href: '/portal/category/sleep',
            label: 'Revisar sueño'
          },
          {
            title: 'Deficiencias comunes',
            description: 'Magnesio, vitamina D, B12 y hierro se interpretan mejor con dieta, laboratorios y síntomas.',
            href: '/portal/category/common-deficiencies',
            label: 'Revisar deficiencias'
          },
          {
            title: 'Magnesio',
            description: 'Guía específica para revisar ingesta, tolerancia, función renal y medicamentos.',
            href: '/portal/supplement/magnesium?benefit=migraine-headache',
            label: 'Comparar magnesio'
          },
          {
            title: 'Riboflavina',
            description: 'Útil para revisar dosis, duración, tolerancia y expectativas realistas.',
            href: '/portal/supplement/riboflavin?benefit=migraine-headache',
            label: 'Comparar riboflavina'
          }
        ],
        faqHeading: 'Preguntas frecuentes sobre suplementos, migraña y dolor de cabeza',
        faqs: [
          {
            question: '¿Qué revisar antes de usar magnesio?',
            answer: 'Ingesta dietaria, tolerancia digestiva, función renal, medicamentos, embarazo y patrón de dolor. Conviene tener claro el diagnóstico si el dolor es recurrente.'
          },
          {
            question: '¿Riboflavina o CoQ10 funcionan de inmediato?',
            answer: 'No deben plantearse como respuesta inmediata. Se revisan por dosis, constancia, duración y seguimiento dentro de un plan más amplio.'
          },
          {
            question: '¿Melatonina aplica si hay migraña?',
            answer: 'Puede revisarse cuando el sueño irregular es parte del contexto, pero no reemplaza evaluación si el dolor es nuevo, intenso o cambia de patrón.'
          },
          {
            question: '¿Qué señales requieren atención urgente?',
            answer: 'Dolor súbito e intenso, debilidad, confusión, fiebre, rigidez de cuello, pérdida de visión, embarazo, golpe en la cabeza o dolor nuevo después de los 50 años requieren atención médica.'
          }
        ],
        supplementLinksHeading: 'Guías de suplementos para migraña y dolor de cabeza'
      },
      en: {
        intro: 'This guide compares supplements searched in migraine and headache context. Safe review separates headache pattern, diagnosis, sleep, medications, deficiencies, and warning signs before choosing an option.',
        highlights: [
          'Magnesium is reviewed better with low intake, compatible symptoms, digestive tolerance, and kidney function.',
          'Riboflavin and CoQ10 are interpreted by protocol, dose, consistency, and follow-up, not as an immediate answer.',
          'Melatonin belongs more in irregular sleep context; if headache changes or appears intensely, professional evaluation comes first.'
        ],
        priorityTopics: [
          {
            title: 'Magnesium and deficiency context',
            description: 'Compare diet, digestive tolerance, kidney function, medications, and headache pattern before use.',
            supplementSlug: 'magnesium',
            searchLabel: 'Open the magnesium guide'
          },
          {
            title: 'Riboflavin and consistency',
            description: 'Review dose, duration, tolerance, expectations, and follow-up when used inside a plan.',
            supplementSlug: 'riboflavin',
            searchLabel: 'Open the riboflavin guide'
          },
          {
            title: 'CoQ10 and cellular energy',
            description: 'Compare dose, time frame, medications, cost, and general health context.',
            supplementSlug: 'coenzyme-q10',
            searchLabel: 'Open the CoQ10 guide'
          }
        ],
        relatedLinks: [
          {
            title: 'Sleep and rest',
            description: 'If headache is tied to irregular sleep, review sleep habits and the sleep cluster first.',
            href: '/portal/category/sleep',
            label: 'Review sleep'
          },
          {
            title: 'Common deficiencies',
            description: 'Magnesium, vitamin D, B12, and iron are interpreted better with diet, labs, and symptoms.',
            href: '/portal/category/common-deficiencies',
            label: 'Review deficiencies'
          },
          {
            title: 'Magnesium',
            description: 'A specific guide for reviewing intake, tolerance, kidney function, and medications.',
            href: '/portal/supplement/magnesium?benefit=migraine-headache',
            label: 'Compare magnesium'
          },
          {
            title: 'Riboflavin',
            description: 'Useful for reviewing dose, duration, tolerance, and realistic expectations.',
            href: '/portal/supplement/riboflavin?benefit=migraine-headache',
            label: 'Compare riboflavin'
          }
        ],
        faqHeading: 'Frequently asked questions about supplements, migraine, and headache',
        faqs: [
          {
            question: 'What should I review before using magnesium?',
            answer: 'Dietary intake, digestive tolerance, kidney function, medications, pregnancy, and headache pattern. A clear diagnosis matters when headache is recurrent.'
          },
          {
            question: 'Do riboflavin or CoQ10 work immediately?',
            answer: 'They should not be framed as an immediate answer. They are reviewed by dose, consistency, duration, and follow-up inside a broader plan.'
          },
          {
            question: 'Is melatonin relevant when migraine is present?',
            answer: 'It can be reviewed when irregular sleep is part of the context, but it does not replace evaluation when headache is new, intense, or changes pattern.'
          },
          {
            question: 'What signs require urgent attention?',
            answer: 'Sudden intense headache, weakness, confusion, fever, neck stiffness, vision loss, pregnancy, head injury, or new headache after age 50 require medical attention.'
          }
        ],
        supplementLinksHeading: 'Migraine and headache supplement guides'
      }
    },
    'common-deficiencies': {
      es: {
        intro:
          'Esta guía reúne nutrientes que suelen evaluarse por análisis de laboratorio o por contexto dietario, donde la suplementación depende de los niveles, la dieta y la etapa de vida. No promete resultados: ordena las opciones por evidencia, seguridad y cuándo conviene confirmar una deficiencia con un profesional.',
        highlights: [
          'La vitamina D puede asociarse con salud ósea, inmunidad y función muscular; su deficiencia es frecuente y se evalúa con análisis de 25-hidroxivitamina D.',
          'El hierro debe guiarse por laboratorio (ferritina y hemoglobina); suplementar sin confirmar puede ser innecesario o contraproducente.',
          'La vitamina B12 y el folato son especialmente relevantes en dietas veganas o vegetarianas, malabsorción y etapas tempranas del embarazo; conviene confirmarlos con análisis.',
        ],
        priorityTopics: [
          {
            title: 'Vitamina D y deficiencia',
            description:
              'Deficiencia frecuente que se evalúa con análisis (25-OH vitamina D). Puede asociarse con salud ósea, inmunidad y función muscular; la dosis prudente depende del nivel y del contexto.',
            supplementSlug: 'vitamin-d',
            searchLabel: 'Abrir la guía de vitamina D',
          },
          {
            title: 'Hierro guiado por análisis',
            description:
              'La suplementación se decide con ferritina y hemoglobina, no por síntomas aislados. Revisa dosis, tolerancia digestiva e interacciones con un profesional.',
            supplementSlug: 'iron',
            searchLabel: 'Abrir la guía de hierro',
          },
          {
            title: 'Vitamina B12 en dietas y malabsorción',
            description:
              'Relevante en dietas veganas o vegetarianas y en malabsorción. Se confirma con análisis y se ajusta según la causa y los niveles.',
            supplementSlug: 'vitamin-b12',
            searchLabel: 'Abrir la guía de vitamina B12',
          },
        ],
        relatedLinks: [
          {
            title: 'Folato y embarazo',
            description:
              'Importante para la división celular; su uso es clave antes y durante etapas tempranas de la gestación, con seguimiento profesional.',
            href: '/portal/supplement/folic-acid?benefit=common-deficiencies',
            label: 'Revisar folato',
          },
          {
            title: 'Zinc según dieta y contexto',
            description:
              'Mineral para inmunidad, piel y función reproductiva; la suplementación depende de la dieta y del contexto clínico.',
            href: '/portal/supplement/zinc?benefit=common-deficiencies',
            label: 'Revisar zinc',
          },
          {
            title: 'Energía y fatiga',
            description:
              'Cuando el cansancio es el motivo principal, conviene descartar deficiencias (hierro, B12, vitamina D) con análisis antes de elegir suplementos.',
            href: '/portal/category/energy',
            label: 'Abrir suplementos para energía',
          },
        ],
        faqHeading: 'Preguntas frecuentes sobre deficiencias comunes',
        faqs: [
          {
            question: '¿Cómo sé si tengo una deficiencia?',
            answer:
              'Las deficiencias se confirman con análisis de laboratorio (por ejemplo 25-OH vitamina D, ferritina, hemoglobina, B12 y folato), no solo por síntomas. Un profesional interpreta los resultados según tu dieta, etapa de vida y antecedentes.',
          },
          {
            question: '¿Qué análisis conviene pedir?',
            answer:
              'Depende del caso, pero suelen evaluarse vitamina D (25-OH), perfil de hierro (ferritina y hemoglobina), vitamina B12 y folato. Comenta con tu profesional cuáles aplican a tu situación.',
          },
          {
            question: '¿Puedo suplementar sin hacerme análisis?',
            answer:
              'No es lo ideal, sobre todo con hierro: suplementar sin confirmar niveles puede ser innecesario o contraproducente. Lo prudente es evaluar con análisis y consultar a un profesional.',
          },
          {
            question: '¿Cuándo debo hablar con un profesional?',
            answer:
              'Cuando hay síntomas persistentes, embarazo o búsqueda de embarazo, dietas restrictivas, malabsorción o uso de medicamentos. En esos casos la evaluación clínica tiene prioridad sobre la autosuplementación.',
          },
        ],
        supplementLinksHeading: 'Guías de suplementos para deficiencias',
      },
      en: {
        intro:
          'This guide gathers nutrients usually checked through lab tests or dietary context, where supplementation depends on levels, diet, and life stage. It does not promise outcomes: it orders the options by evidence, safety, and when a deficiency should be confirmed with a professional.',
        highlights: [
          'Vitamin D may be associated with bone health, immunity, and muscle function; deficiency is common and is assessed with a 25-hydroxyvitamin D test.',
          'Iron should be guided by labs (ferritin and hemoglobin); supplementing without confirming can be unnecessary or counterproductive.',
          'Vitamin B12 and folate are especially relevant for vegan or vegetarian diets, malabsorption, and early pregnancy; confirming them with labs is advisable.',
        ],
        priorityTopics: [
          {
            title: 'Vitamin D and deficiency',
            description:
              'A common deficiency assessed with a 25-OH vitamin D test. It may be associated with bone health, immunity, and muscle function; a prudent dose depends on the level and context.',
            supplementSlug: 'vitamin-d',
            searchLabel: 'Open the vitamin D guide',
          },
          {
            title: 'Iron guided by labs',
            description:
              'Supplementation is decided with ferritin and hemoglobin, not isolated symptoms. Review dose, digestive tolerance, and interactions with a professional.',
            supplementSlug: 'iron',
            searchLabel: 'Open the iron guide',
          },
          {
            title: 'Vitamin B12 for diets and malabsorption',
            description:
              'Relevant for vegan or vegetarian diets and malabsorption. It is confirmed with labs and adjusted by cause and levels.',
            supplementSlug: 'vitamin-b12',
            searchLabel: 'Open the vitamin B12 guide',
          },
        ],
        relatedLinks: [
          {
            title: 'Folate and pregnancy',
            description:
              'Important for cell division; its use matters before and during early pregnancy, with professional follow-up.',
            href: '/portal/supplement/folic-acid?benefit=common-deficiencies',
            label: 'Review folate',
          },
          {
            title: 'Zinc by diet and context',
            description:
              'A mineral for immunity, skin, and reproductive function; supplementation depends on diet and clinical context.',
            href: '/portal/supplement/zinc?benefit=common-deficiencies',
            label: 'Review zinc',
          },
          {
            title: 'Energy and fatigue',
            description:
              'When tiredness is the main concern, it helps to rule out deficiencies (iron, B12, vitamin D) with labs before choosing supplements.',
            href: '/portal/category/energy',
            label: 'Open energy supplements',
          },
        ],
        faqHeading: 'Frequently asked questions about common deficiencies',
        faqs: [
          {
            question: 'How do I know if I have a deficiency?',
            answer:
              'Deficiencies are confirmed with lab tests (for example 25-OH vitamin D, ferritin, hemoglobin, B12, and folate), not symptoms alone. A professional interprets the results based on your diet, life stage, and history.',
          },
          {
            question: 'Which lab tests are worth requesting?',
            answer:
              'It depends on the case, but vitamin D (25-OH), an iron panel (ferritin and hemoglobin), vitamin B12, and folate are commonly assessed. Discuss with your professional which ones apply to you.',
          },
          {
            question: 'Can I supplement without lab tests?',
            answer:
              'It is not ideal, especially with iron: supplementing without confirming levels can be unnecessary or counterproductive. The prudent path is to assess with labs and consult a professional.',
          },
          {
            question: 'When should I talk to a professional?',
            answer:
              'When there are persistent symptoms, pregnancy or trying to conceive, restrictive diets, malabsorption, or medication use. In those cases clinical assessment takes priority over self-supplementation.',
          },
        ],
        supplementLinksHeading: 'Deficiency supplement guides',
      },
    },
  };

  return content[slug]?.[locale] || null;
}
