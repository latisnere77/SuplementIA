type Language = 'en' | 'es';

export interface VisibleEvidenceMetadata {
  label: string;
  detail: string;
  count?: number;
  countLabel?: string;
}

const PLACEHOLDER_DOSAGE_PATTERNS = [
  'ver analisis de evidencia',
  'ver análisis de evidencia',
  'consultar con profesional',
  'segun indicaciones',
  'según indicaciones',
  'sin preferencia',
  'no especificado',
  'no disponible',
  'ver seccion de dosis',
  'ver sección de dosis',
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function isPlaceholderDosageText(value?: string | null): boolean {
  if (!value || !value.trim()) return true;
  const normalized = normalizeText(value);
  return PLACEHOLDER_DOSAGE_PATTERNS.some(pattern =>
    normalized.includes(normalizeText(pattern))
  );
}

export function getDefaultDosageMessage(language: Language): string {
  return language === 'es'
    ? 'La dosis depende de la forma, objetivo y contexto clínico; revisa la etiqueta y consulta a un profesional de salud.'
    : 'Dose depends on form, goal, and clinical context; check the label and consult a health professional.';
}

export function cleanDosageValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return isPlaceholderDosageText(value) ? undefined : value;
}

export function getVisibleEvidenceMetadata(
  recommendation: any,
  language: Language
): VisibleEvidenceMetadata {
  const evidenceSummary = recommendation?.evidence_summary || {};
  const metadata = recommendation?._enrichment_metadata || {};
  const source = recommendation?._response_source || recommendation?.source || metadata.source;
  const studiesUsed = Number(metadata.studiesUsed || metadata.humanClinicalStudiesCount || 0);
  const literatureProfile = recommendation?.literatureProfile || recommendation?.evidence_summary?.literatureProfile;
  const sampleSize = Number(literatureProfile?.sampleSize || literatureProfile?.reviewedCount || 0);

  if (source === 'local_catalog_fallback') {
    return {
      label: language === 'es' ? 'Evidencia clínica seleccionada' : 'Selected clinical evidence',
      detail: language === 'es'
        ? 'Ficha basada en evidencia curada y usos con respaldo clínico; los conteos de búsqueda no representan todo PubMed.'
        : 'Brief based on curated evidence and clinically supported uses; search hit counts do not represent all of PubMed.',
    };
  }

  if (sampleSize > 0) {
    return {
      label: language === 'es' ? 'Muestra revisada' : 'Reviewed sample',
      detail: language === 'es'
        ? 'Artículos clasificados para orientar el nivel de evidencia visible.'
        : 'Articles classified to explain the visible evidence level.',
      count: sampleSize,
      countLabel: language === 'es' ? 'artículos' : 'articles',
    };
  }

  if (studiesUsed > 0) {
    return {
      label: language === 'es' ? 'Evidencia clínica revisada' : 'Reviewed clinical evidence',
      detail: language === 'es'
        ? 'Estudios usados por el enriquecimiento clínico para construir esta ficha.'
        : 'Studies used by clinical enrichment to build this brief.',
      count: studiesUsed,
      countLabel: language === 'es' ? 'estudios' : 'studies',
    };
  }

  const totalStudies = Number(evidenceSummary.totalStudies || 0);
  if (totalStudies > 0 && (metadata.hasRealData || metadata.fromEnrichmentApi)) {
    return {
      label: language === 'es' ? 'Evidencia clínica revisada' : 'Reviewed clinical evidence',
      detail: language === 'es'
        ? 'Conteo reportado por el enriquecimiento clínico.'
        : 'Count reported by clinical enrichment.',
      count: totalStudies,
      countLabel: language === 'es' ? 'estudios' : 'studies',
    };
  }

  return {
    label: language === 'es' ? 'Ficha investigativa' : 'Research brief',
    detail: language === 'es'
      ? 'Resumen de evidencia disponible; no es un conteo total de literatura científica.'
      : 'Summary of available evidence; not a total count of scientific literature.',
  };
}
