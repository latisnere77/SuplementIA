type Language = 'en' | 'es';

const DUPLICATE_SENTENCE_PATTERNS = [
  /Interpretar como apoyo estudiado para sintomas, no como sustituto de tratamiento medico\./gi,
  /Interpretar como apoyo estudiado para síntomas, no como sustituto de tratamiento médico\./gi,
];

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function dedupeSentences(value: string): string {
  let cleaned = value;

  for (const pattern of DUPLICATE_SENTENCE_PATTERNS) {
    const matches = cleaned.match(pattern) || [];
    if (matches.length <= 1) continue;
    cleaned = cleaned.replace(pattern, '');
    cleaned = `${cleaned.trim()} ${matches[0]}`;
  }

  return normalizeWhitespace(cleaned);
}

export function sanitizeResearchBriefText(value: unknown, language: Language = 'es'): string {
  if (typeof value !== 'string') return '';

  const limitedDepression = language === 'es'
    ? 'evidencia limitada para síntomas depresivos; no es tratamiento de depresión mayor'
    : 'limited evidence for depressive symptoms; not a treatment for major depression';
  const medicalCare = language === 'es' ? 'atención médica' : 'medical care';
  const studiedUse = language === 'es' ? 'uso clínico estudiado' : 'studied clinical use';
  const reportedChanges = language === 'es' ? 'cambios reportados' : 'reported changes';

  return dedupeSentences(value)
    .replace(/\buso estudiado medico\b/gi, medicalCare)
    .replace(/\buso estudiado médico\b/gi, medicalCare)
    .replace(/\bapoyo estudiado para depresi[oó]n mayor cl[ií]nica\b/gi, limitedDepression)
    .replace(/\bmejoras reportadas en s[ií]ntesis[^.]*\./gi, `${reportedChanges}.`)
    .replace(/\bmejoras reportadas en s[ií]ntesis\b/gi, reportedChanges)
    .replace(/\btratamiento m[eé]dico\b/gi, medicalCare)
    .replace(/\btratamiento cl[ií]nico\b/gi, studiedUse)
    .replace(/\bNo reportes de hepatotoxicidad[^.]*\./gi, language === 'es'
      ? 'Generalmente bien tolerada, pero existen reportes raros de lesión hepática; precaución en enfermedad hepática o con fármacos hepatotóxicos.'
      : 'Generally well tolerated, but rare liver injury reports exist; use caution with liver disease or hepatotoxic medications.'
    )
    .replace(/\bsin reportes de toxicidad hep[aá]tica[^.]*\./gi, language === 'es'
      ? 'Generalmente bien tolerada, pero existen reportes raros de lesión hepática; precaución en enfermedad hepática o con fármacos hepatotóxicos.'
      : 'Generally well tolerated, but rare liver injury reports exist; use caution with liver disease or hepatotoxic medications.'
    )
    .trim();
}

export function sanitizeResearchBriefList<T extends Record<string, any>>(
  items: T[] = [],
  language: Language = 'es'
): T[] {
  return items.map((item) => ({
    ...item,
    condition: sanitizeResearchBriefText(item.condition, language) || item.condition,
    description: sanitizeResearchBriefText(item.description, language) || item.description,
    notes: sanitizeResearchBriefText(item.notes, language) || item.notes,
    summary: sanitizeResearchBriefText(item.summary, language) || item.summary,
    magnitude: sanitizeResearchBriefText(item.magnitude, language) || item.magnitude,
  }));
}

export function localizeSeverityLabel(value: unknown, language: Language = 'es'): string {
  const normalized = String(value || '').toLowerCase();
  const labels = language === 'es'
    ? {
      mild: 'Generalmente leve',
      moderate: 'Moderada',
      severe: 'Severa',
      none: 'Sin reportes relevantes',
    }
    : {
      mild: 'Generally mild',
      moderate: 'Moderate',
      severe: 'Severe',
      none: 'No relevant reports',
    };

  if (normalized.includes('severe')) return labels.severe;
  if (normalized.includes('moderate')) return labels.moderate;
  if (normalized.includes('none')) return labels.none;
  return labels.mild;
}

export function localizeMechanismEvidenceLabel(value: unknown, language: Language = 'es'): string {
  const normalized = String(value || '').toLowerCase();
  if (language === 'en') {
    if (normalized.includes('strong')) return 'Strong';
    if (normalized.includes('moderate')) return 'Moderate';
    return 'Exploratory';
  }

  if (normalized.includes('strong')) return 'Fuerte';
  if (normalized.includes('moderate')) return 'Moderada';
  return 'Exploratoria';
}
