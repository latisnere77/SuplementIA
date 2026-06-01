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
      es: 'Psyllium fiber: evidencia para LDL, digestión y seguridad',
      en: 'Psyllium fiber: evidence for LDL cholesterol, digestion, and safety',
    },
    'coenzyme-q10': {
      es: 'Coenzima Q10: evidencia cardiovascular, migraña y seguridad',
      en: 'Coenzyme Q10: heart health, migraine evidence, and safety',
    },
    'hydrolyzed-collagen': {
      es: 'Colágeno hidrolizado: evidencia para articulaciones, piel y seguridad',
      en: 'Hydrolyzed collagen: evidence for joints, skin, and safety',
    },
    'rhodiola-rosea': {
      es: 'Rhodiola rosea: evidencia para fatiga, estrés y seguridad',
      en: 'Rhodiola rosea: evidence for fatigue, stress, and safety',
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
      es: 'Revisa psyllium fiber para colesterol LDL, triglicéridos, digestión, tolerancia y uso responsable junto con dieta y laboratorios.',
      en: 'Review psyllium fiber for LDL cholesterol, triglycerides, digestion, tolerance, and responsible use alongside diet and lab follow-up.',
    },
    'coenzyme-q10': {
      es: 'Consulta evidencia prudente sobre coenzima Q10 en salud cardiovascular, migraña, energía celular, seguridad e interacciones.',
      en: 'Review careful evidence for coenzyme Q10 in heart health, migraine, cellular energy, safety, and interactions.',
    },
    'hydrolyzed-collagen': {
      es: 'Compara evidencia de colágeno hidrolizado para articulaciones, piel, tejidos conectivos, seguridad y expectativas realistas.',
      en: 'Compare hydrolyzed collagen evidence for joints, skin, connective tissue, safety, and realistic expectations.',
    },
    'rhodiola-rosea': {
      es: 'Revisa rhodiola rosea para fatiga, estrés, rendimiento mental, seguridad y diferencias entre extractos estudiados.',
      en: 'Review rhodiola rosea for fatigue, stress, mental performance, safety, and differences between studied extracts.',
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
