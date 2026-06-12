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
  };

  return content[slug]?.[locale] || null;
}
