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
    'hormonal-health': {
      es: {
        title: 'Suplementos para salud hormonal: inositol, vitamina D y zinc',
        description:
          'Compara inositol, vitamina D, zinc y magnesio por ciclo, SOP, dieta, laboratorios, síntomas y seguridad.',
      },
      en: {
        title: 'Hormonal health supplements: inositol, vitamin D, and zinc',
        description:
          'Compare inositol, vitamin D, zinc, and magnesium by cycle context, PCOS, diet, labs, symptoms, and safety.',
      },
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
    'hormonal-health': {
      es: {
        intro:
          'Esta guía compara suplementos buscados para salud hormonal, ciclo menstrual, SOP, metabolismo y síntomas premenstruales. La lectura prudente separa diagnóstico, laboratorios, medicamentos, dieta, sueño y etapa de vida.',
        highlights: [
          'Inositol se revisa sobre todo en contexto de SOP, sensibilidad a la insulina y seguimiento profesional.',
          'Vitamina D pertenece al contexto de deficiencia, salud ósea e inmunidad; conviene interpretarla con análisis.',
          'Zinc y magnesio dependen de dieta, ingesta baja, tolerancia y uso combinado con otros minerales.',
        ],
        priorityTopics: [
          {
            title: 'Inositol y contexto SOP',
            description:
              'Revisar diagnóstico, ciclo, metabolismo, medicamentos, embarazo posible y seguimiento profesional.',
            supplementSlug: 'inositol',
            searchLabel: 'Abrir la guía de inositol',
          },
          {
            title: 'Vitamina D y deficiencia',
            description:
              'Comparar exposición solar, dieta, análisis 25-OH vitamina D, salud ósea y etapa de vida.',
            supplementSlug: 'vitamin-d',
            searchLabel: 'Abrir la guía de vitamina D',
          },
          {
            title: 'Zinc y magnesio',
            description:
              'Revisar dieta, dosis, tolerancia, cobre, sueño y uso de varios minerales al mismo tiempo.',
            supplementSlug: 'zinc',
            searchLabel: 'Abrir la guía de zinc',
          },
        ],
        relatedLinks: [
          {
            title: 'Salud femenina',
            description:
              'Folato, hierro, calcio y etapa reproductiva pueden ayudar a ordenar preguntas de ciclo o embarazo.',
            href: '/portal/category/womens-health',
            label: 'Revisar salud femenina',
          },
          {
            title: 'Glucosa y metabolismo',
            description:
              'Cuando SOP o sensibilidad a la insulina son parte del contexto, revisa el cluster metabólico.',
            href: '/portal/category/blood-sugar',
            label: 'Revisar glucosa',
          },
          {
            title: 'Inositol',
            description:
              'Guía específica para revisar SOP, ciclo, metabolismo, dosis y seguimiento.',
            href: '/portal/supplement/inositol?benefit=hormonal-health',
            label: 'Comparar inositol',
          },
          {
            title: 'Vitamina D',
            description:
              'Útil para revisar deficiencia, análisis, dosis y salud ósea.',
            href: '/portal/supplement/vitamin-d?benefit=hormonal-health',
            label: 'Comparar vitamina D',
          },
        ],
        faqHeading: 'Preguntas frecuentes sobre suplementos y salud hormonal',
        faqs: [
          {
            question: '¿Qué revisar antes de usar inositol?',
            answer:
              'Diagnóstico, ciclo menstrual, SOP, glucosa, embarazo posible, medicamentos y seguimiento profesional. La decisión no debería basarse solo en síntomas generales.',
          },
          {
            question: '¿Vitamina D cambia hormonas?',
            answer:
              'Vitamina D se interpreta mejor como nutriente ligado a deficiencia, huesos e inmunidad. Si hay síntomas hormonales, conviene revisar causa y análisis antes de elegir suplementos.',
          },
          {
            question: '¿Zinc y magnesio se pueden combinar?',
            answer:
              'Depende de dosis, dieta, tolerancia y otros productos. Combinar minerales puede duplicar dosis o afectar absorción de otros nutrientes.',
          },
          {
            question: '¿Cuándo buscar orientación profesional?',
            answer:
              'Ciclos muy irregulares, sangrado abundante, embarazo, infertilidad, dolor intenso, acné severo, síntomas nuevos o uso de hormonas ameritan orientación profesional.',
          },
        ],
        supplementLinksHeading: 'Guías de suplementos para salud hormonal',
      },
      en: {
        intro:
          'This guide compares supplements searched for hormonal health, menstrual cycle context, PCOS, metabolism, and premenstrual symptoms. Prudent review separates diagnosis, labs, medications, diet, sleep, and life stage.',
        highlights: [
          'Inositol is reviewed mostly in PCOS context, insulin sensitivity, and professional follow-up.',
          'Vitamin D belongs in deficiency, bone health, and immune context; labs make interpretation stronger.',
          'Zinc and magnesium depend on diet, low intake, tolerance, and combined mineral use.',
        ],
        priorityTopics: [
          {
            title: 'Inositol and PCOS context',
            description:
              'Review diagnosis, cycle, metabolism, medications, possible pregnancy, and professional follow-up.',
            supplementSlug: 'inositol',
            searchLabel: 'Open the inositol guide',
          },
          {
            title: 'Vitamin D and deficiency',
            description:
              'Compare sun exposure, diet, 25-OH vitamin D labs, bone health, and life stage.',
            supplementSlug: 'vitamin-d',
            searchLabel: 'Open the vitamin D guide',
          },
          {
            title: 'Zinc and magnesium',
            description:
              'Review diet, dose, tolerance, copper, sleep, and using several minerals at the same time.',
            supplementSlug: 'zinc',
            searchLabel: 'Open the zinc guide',
          },
        ],
        relatedLinks: [
          {
            title: 'Women’s health',
            description:
              'Folate, iron, calcium, and reproductive stage can help organize cycle or pregnancy questions.',
            href: '/portal/category/womens-health',
            label: 'Review women’s health',
          },
          {
            title: 'Blood sugar and metabolism',
            description:
              'When PCOS or insulin sensitivity is part of the context, review the metabolic cluster.',
            href: '/portal/category/blood-sugar',
            label: 'Review glucose',
          },
          {
            title: 'Inositol',
            description:
              'A specific guide for reviewing PCOS, cycle context, metabolism, dose, and follow-up.',
            href: '/portal/supplement/inositol?benefit=hormonal-health',
            label: 'Compare inositol',
          },
          {
            title: 'Vitamin D',
            description:
              'Useful for reviewing deficiency, labs, dose, and bone health.',
            href: '/portal/supplement/vitamin-d?benefit=hormonal-health',
            label: 'Compare vitamin D',
          },
        ],
        faqHeading: 'Frequently asked questions about supplements and hormonal health',
        faqs: [
          {
            question: 'What should I review before using inositol?',
            answer:
              'Diagnosis, menstrual cycle, PCOS, glucose, possible pregnancy, medications, and professional follow-up. The decision should not be based only on general symptoms.',
          },
          {
            question: 'Does vitamin D change hormones?',
            answer:
              'Vitamin D is interpreted better as a nutrient tied to deficiency, bones, and immune context. If hormonal symptoms are present, review cause and labs before choosing supplements.',
          },
          {
            question: 'Can zinc and magnesium be combined?',
            answer:
              'It depends on dose, diet, tolerance, and other products. Combining minerals can duplicate doses or affect absorption of other nutrients.',
          },
          {
            question: 'When should I seek professional guidance?',
            answer:
              'Very irregular cycles, heavy bleeding, pregnancy, fertility concerns, intense pain, severe acne, new symptoms, or hormone use warrant professional guidance.',
          },
        ],
        supplementLinksHeading: 'Hormonal health supplement guides',
      },
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
