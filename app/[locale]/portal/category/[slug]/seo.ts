export type CategorySeoContent = {
  intro: string;
  highlights: string[];
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
        title: 'Suplementos para colesterol y triglicéridos: evidencia, seguridad y opciones',
        description:
          'Compara omega-3, psyllium, esteroles vegetales y ajo para colesterol y triglicéridos con evidencia, seguridad y uso responsable.',
      },
      en: {
        title: 'Supplements for cholesterol and triglycerides: evidence, safety, and options',
        description:
          'Compare omega-3, psyllium, plant sterols, and garlic for cholesterol and triglycerides with evidence level and safety context.',
      },
    },
    sleep: {
      es: {
        title: 'Suplementos para dormir: evidencia, seguridad y opciones',
        description:
          'Compara melatonina, magnesio, lavanda y valeriana para dormir mejor con evidencia, seguridad y uso responsable.',
      },
      en: {
        title: 'Supplements for sleep: evidence, safety, and options',
        description:
          'Compare melatonin, magnesium, lavender, and valerian for sleep quality with evidence level, safety context, and responsible use.',
      },
    },
    'heart-health': {
      es: {
        title: 'Suplementos para salud cardiovascular: evidencia, seguridad y opciones',
        description:
          'Revisa omega-3, coenzima Q10 y ajo para salud cardiovascular con evidencia, seguridad y contexto de uso responsable.',
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
          'Esta página compara suplementos investigados para LDL, triglicéridos y otros marcadores de lípidos. La evidencia es más útil cuando se interpreta junto con dieta, actividad física, laboratorios y seguimiento médico.',
        highlights: [
          'Omega-3 EPA/DHA tiene evidencia más fuerte para triglicéridos que para bajar LDL.',
          'Psyllium y esteroles vegetales se enfocan más en reducciones modestas de colesterol LDL.',
          'Ajo puede tener efectos pequeños y variables; la preparación y la dosis cambian mucho el resultado.',
        ],
        faqHeading: 'Preguntas frecuentes sobre colesterol y triglicéridos',
        faqs: [
          {
            question: '¿Qué suplemento tiene más evidencia para triglicéridos?',
            answer:
              'Omega-3 EPA/DHA tiene soporte consistente para reducir triglicéridos, especialmente en dosis clínicas. Debe revisarse con un profesional si ya se usan anticoagulantes, estatinas u otros medicamentos.',
          },
          {
            question: '¿Qué opciones se enfocan más en colesterol LDL?',
            answer:
              'Psyllium y esteroles vegetales tienen evidencia para reducciones modestas de LDL cuando se usan de forma constante junto con dieta adecuada.',
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
          'This page compares supplements researched for LDL cholesterol, triglycerides, and other lipid markers. The evidence is most useful when interpreted alongside diet, physical activity, lab results, and medical follow-up.',
        highlights: [
          'Omega-3 EPA/DHA has stronger evidence for triglycerides than for lowering LDL cholesterol.',
          'Psyllium and plant sterols are more focused on modest LDL cholesterol reductions.',
          'Garlic may have small and variable effects; preparation and dose can change results substantially.',
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
          'Esta guía ordena suplementos estudiados para marcadores cardiovasculares como triglicéridos, presión arterial, inflamación y función energética celular. Debe usarse como punto de partida educativo, no como diagnóstico.',
        highlights: [
          'Omega-3 EPA/DHA destaca por triglicéridos y salud cardiometabólica en contextos específicos.',
          'Coenzima Q10 se estudia por energía celular y contextos cardiovasculares particulares.',
          'Ajo puede apoyar modestamente presión arterial o colesterol, pero los resultados son variables.',
        ],
        faqHeading: 'Preguntas frecuentes sobre salud cardiovascular',
        faqs: [
          {
            question: '¿Qué suplemento cardiovascular tiene mejor evidencia general?',
            answer:
              'Omega-3 EPA/DHA suele tener la evidencia más consistente para triglicéridos. La mejor opción depende de los laboratorios, riesgo cardiovascular, dieta y medicamentos actuales.',
          },
          {
            question: '¿La coenzima Q10 es para todos?',
            answer:
              'No necesariamente. Puede ser relevante en contextos específicos, pero su utilidad depende del objetivo, diagnóstico, tratamiento actual y tolerancia.',
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
