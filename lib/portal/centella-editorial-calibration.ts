type EvidenceItem = Record<string, any>;

const CENTELLA_LIVER_WARNING = 'Generalmente bien tolerada, pero existen reportes raros de lesion hepatica/hepatotoxicidad; precaucion en enfermedad hepatica o con farmacos hepatotoxicos.';

function normalizeClinicalText(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isCentellaText(...values: unknown[]): boolean {
  const haystack = normalizeClinicalText(values.filter(Boolean).join(' '));
  return /\b(centella asiatica|gotu kola)\b/.test(haystack);
}

function isLionsManeText(...values: unknown[]): boolean {
  const haystack = normalizeClinicalText(values.filter(Boolean).join(' '));
  return /\b(lion'?s mane|lions mane|hericium erinaceus|melena de leon)\b/.test(haystack);
}

function isCannabisText(...values: unknown[]): boolean {
  const haystack = normalizeClinicalText(values.filter(Boolean).join(' '));
  return /\b(cannabis sativa|medical cannabis|medical marijuana|marijuana|marihuana|cannabinoids?|cannabidiol|cbd|tetrahydrocannabinol|thc|nabiximols|sativex|dronabinol|nabilone)\b/.test(haystack);
}

export function isCentellaRecommendation(value: any, category?: string): boolean {
  return isCentellaText(
    category,
    value?.category,
    value?.supplement?.name,
    value?.supplement?.description,
    value?.data?.name,
    value?.data?.whatIsIt,
    value?.data?.description,
    value?.metadata?.supplementId
  );
}

function isLionsManeRecommendation(value: any, category?: string): boolean {
  return isLionsManeText(
    category,
    value?.category,
    value?.supplement?.name,
    value?.supplement?.description,
    value?.data?.name,
    value?.data?.whatIsIt,
    value?.data?.description,
    value?.metadata?.supplementId
  );
}

function isCannabisRecommendation(value: any, category?: string): boolean {
  return isCannabisText(
    category,
    value?.category,
    value?.supplement?.name,
    value?.supplement?.description,
    value?.data?.name,
    value?.data?.whatIsIt,
    value?.data?.description,
    value?.metadata?.supplementId
  );
}

export function sanitizeCentellaClaimText(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  return value
    .replace(/\busar con precauci[oó]n\s+aunque\s+(?:no hay|no existen)\s+reportes de hepatotoxicidad\b[^.;]*/gi, CENTELLA_LIVER_WARNING)
    .replace(/\baunque\s+(?:no hay|no existen)\s+reportes de hepatotoxicidad\b[^.;]*/gi, `y ${CENTELLA_LIVER_WARNING}`)
    .replace(/\b(?:no hay|no existen|no)\s+reportes de hepatotoxicidad\b[^.;]*/gi, CENTELLA_LIVER_WARNING)
    .replace(/\bNo reportes de hepatotoxicidad\b[^.;]*/gi, CENTELLA_LIVER_WARNING)
    .replace(/\bsin reportes de toxicidad hep[aá]tica\b[^.;]*/gi, CENTELLA_LIVER_WARNING)
    .replace(/\beficacia demostrada\b/gi, 'evidencia humana disponible')
    .replace(/\btratamiento m[eé]dico\b/gi, 'atencion medica')
    .replace(/\btratamiento cl[ií]nico\b/gi, 'uso clinico estudiado')
    .replace(/\btratamiento de\b/gi, 'apoyo estudiado para')
    .replace(/\btratamiento\b/gi, 'uso estudiado')
    .replace(/\buso estudiado m[eé]dico\b/gi, 'atencion medica')
    .replace(/\btreat(?:s|ment)?\b/gi, 'studied support')
    .replace(/\bcures?\b/gi, 'is studied for')
    .replace(/\b(?:60|25|30|10|5)\s*[-–]\s*(?:70|35|40|20|15)\s*%/gi, 'mejoras reportadas');
}

function sanitizeCannabisClaimText(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  return value
    .replace(/\bCBD is a dietary supplement ingredient indexed for evidence review in SuplementAI\.?/gi, CBD_RESEARCH_DESCRIPTION)
    .replace(/\bPropiedades antiinflamatorias comprobadas\b/gi, 'Evidencia limitada sobre inflamacion; no es un beneficio clinico general de CBD comercial')
    .replace(/\bEfectivo para dolor neurop[aá]tico y fibromialgia\b/gi, 'Evidencia sobre cannabinoides medicos o formulaciones especificas; no equivale a CBD comercial como suplemento')
    .replace(/\bsuplemento recomendado\b/gi, 'formulacion cannabinoide estudiada')
    .replace(/\brecommended supplement\b/gi, 'studied cannabinoid formulation')
    .replace(/\bcomprar\b/gi, 'evaluar con profesional de salud')
    .replace(/\bbuy\b/gi, 'review with a health professional')
    .replace(/\bsirve para\b/gi, 'tiene evidencia clinica especifica para')
    .replace(/\btreats?\b/gi, 'has been studied for')
    .replace(/\bcures?\b/gi, 'has been studied for');
}

export function sanitizeLionsManePreclinicalClaimText(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  const preclinicalContext = /\b((?:modelos?|estudios?)\s+animales?|animals?|ratas?|rats?|in\s+vitro|precl[ií]nic[oa]s?|c[eé]lulas?|cell(?:ular)?|laboratorio)\b/i;
  const untracedEffectRange = /\b(reducci[oó]n|aumento|mejora|incremento)\b[^.]{0,120}?\b\d+\s*[-–]\s*\d+\s*%/i;
  if (!preclinicalContext.test(value) && !untracedEffectRange.test(value)) return value;

  return value
    .replace(/\bse ha observado (?:una )?(?:reducci[oó]n|aumento|mejora|incremento)\s+de\s+\d+\s*[-–]\s*\d+\s*%/gi, 'se han observado cambios')
    .replace(/\b(reducci[oó]n|aumento|mejora|incremento)\b[^.]{0,120}?\b\d+\s*[-–]\s*\d+\s*%/gi, '$1 observada')
    .replace(/\b(reducci[oó]n|aumento|mejora|incremento)\s+de\s+\d+\s*[-–]\s*\d+\s*%/gi, '$1 observada')
    .replace(/\b\d+\s*[-–]\s*\d+\s*%/g, 'cambios cuantificados');
}

export function sanitizeCentellaItem<T>(item: T): T {
  if (Array.isArray(item)) {
    return item.map(sanitizeCentellaItem) as T;
  }

  if (!item || typeof item !== 'object') {
    return sanitizeCentellaClaimText(item) as T;
  }

  return Object.fromEntries(
    Object.entries(item as Record<string, unknown>).map(([key, value]) => [
      key,
      sanitizeCentellaItem(value),
    ])
  ) as T;
}

function sanitizeLionsManeItem<T>(item: T): T {
  if (Array.isArray(item)) {
    return item.map(sanitizeLionsManeItem) as T;
  }

  if (!item || typeof item !== 'object') {
    return sanitizeLionsManePreclinicalClaimText(item) as T;
  }

  return Object.fromEntries(
    Object.entries(item as Record<string, unknown>).map(([key, value]) => [
      key,
      sanitizeLionsManeItem(value),
    ])
  ) as T;
}

function sanitizeCannabisItem<T>(item: T): T {
  if (Array.isArray(item)) {
    return item.map(sanitizeCannabisItem) as T;
  }

  if (!item || typeof item !== 'object') {
    return sanitizeCannabisClaimText(item) as T;
  }

  return Object.fromEntries(
    Object.entries(item as Record<string, unknown>).map(([key, value]) => [
      key,
      sanitizeCannabisItem(value),
    ])
  ) as T;
}

function capEvidenceGrade(grade: unknown, maxGrade: 'B' | 'C'): 'B' | 'C' | 'D' {
  const normalized = String(grade || 'C').toUpperCase();
  if (maxGrade === 'B') {
    return normalized === 'A' ? 'B' : (['B', 'C', 'D'].includes(normalized) ? normalized as 'B' | 'C' | 'D' : 'C');
  }
  return normalized === 'D' ? 'D' : 'C';
}

function isPreliminaryCentellaItem(item: EvidenceItem): boolean {
  const text = normalizeClinicalText([
    item?.condition,
    item?.use,
    item?.benefit,
    item?.notes,
    item?.magnitude,
    item?.description,
  ].filter(Boolean).join(' '));

  return /\b(cognition|cognitive|cognitivo|cognitiva|memoria|memory|ansiedad|anxiety|sobresalto|startle|farmacocinetica|pharmacokinetic|pk\/pd|phase 1|fase 1)\b/.test(text);
}

function isCentellaVenousOrWoundItem(item: EvidenceItem): boolean {
  const text = normalizeClinicalText([
    item?.condition,
    item?.use,
    item?.benefit,
    item?.notes,
  ].filter(Boolean).join(' '));

  return /\b(venosa|venous|microcirculacion|microcirculation|herida|wound|cicatrizacion|healing|ulcera|ulcer)\b/.test(text);
}

function addCentellaSafetyCaution(safety: any = {}) {
  const calibratedSafety = sanitizeCentellaItem({ ...safety });
  const liverWarning = CENTELLA_LIVER_WARNING;
  const existingSafetyText = normalizeClinicalText(JSON.stringify(calibratedSafety));

  if (!existingSafetyText.includes('hepatotoxic') && !existingSafetyText.includes('lesion hepatica')) {
    calibratedSafety.contraindications = [
      ...(Array.isArray(calibratedSafety.contraindications) ? calibratedSafety.contraindications : []),
      liverWarning,
    ];
  }

  if (typeof calibratedSafety.longTermSafety === 'string') {
    calibratedSafety.longTermSafety = calibratedSafety.longTermSafety
      .replace(/No reportes de hepatotoxicidad[^.]*\./gi, liverWarning)
      .replace(/sin reportes de toxicidad hep[aá]tica[^.]*\./gi, liverWarning);
  } else {
    calibratedSafety.longTermSafety = liverWarning;
  }

  const existingNotes = normalizeClinicalText(calibratedSafety.notes);
  calibratedSafety.notes = existingNotes.includes('lesion hepatica') || existingNotes.includes('hepatotoxic')
    ? calibratedSafety.notes
    : `${calibratedSafety.notes || ''} ${liverWarning}`.trim();
  return calibratedSafety;
}

function calibrateWorksForList(worksFor: any[], limitedEvidence: any[] = []) {
  const calibratedWorksFor: any[] = [];
  const calibratedLimitedEvidence = Array.isArray(limitedEvidence) ? [...limitedEvidence] : [];

  for (const rawItem of Array.isArray(worksFor) ? worksFor : []) {
    const item = sanitizeCentellaItem({ ...rawItem });

    if (isPreliminaryCentellaItem(item)) {
      calibratedLimitedEvidence.push({
        ...item,
        evidenceGrade: 'C',
        grade: 'C',
        condition: sanitizeCentellaClaimText(item.condition || item.use || item.benefit) || 'Evidencia preliminar en Centella asiatica',
        notes: `${sanitizeCentellaClaimText(item.notes) || ''} Evidencia preliminar: no debe presentarse como beneficio clinico confirmado.`.trim(),
        magnitude: 'Evidencia preliminar; magnitud clinica no establecida.',
      });
      continue;
    }

    if (!isCentellaVenousOrWoundItem(item)) {
      calibratedLimitedEvidence.push({
        ...item,
        evidenceGrade: 'C',
        grade: 'C',
        notes: `${sanitizeCentellaClaimText(item.notes) || ''} Evidencia limitada: no debe presentarse como beneficio clinico confirmado.`.trim(),
        magnitude: 'Magnitud clinica no establecida.',
      });
      continue;
    }

    item.evidenceGrade = capEvidenceGrade(item.evidenceGrade || item.grade, 'B');
    item.grade = item.evidenceGrade;
    const interpretationNote = 'Interpretar como apoyo estudiado para sintomas, no como sustituto de atencion medica.';
    const existingNotes = String(sanitizeCentellaClaimText(item.notes) || '').trim();
    item.notes = normalizeClinicalText(existingNotes).includes(normalizeClinicalText(interpretationNote))
      ? existingNotes
      : `${existingNotes} ${interpretationNote}`.trim();
    item.magnitude = 'Mejoras significativas frente a placebo en algunos estudios; magnitud exacta variable y dependiente del estudio.';
    calibratedWorksFor.push(item);
  }

  return {
    worksFor: calibratedWorksFor,
    limitedEvidence: sanitizeCentellaItem(calibratedLimitedEvidence),
  };
}

function calibrateCentellaDataShape(data: any) {
  if (!data || typeof data !== 'object') return data;

  const calibrated = sanitizeCentellaItem({ ...data });
  const { worksFor, limitedEvidence } = calibrateWorksForList(calibrated.worksFor, calibrated.limitedEvidence);

  calibrated.worksFor = worksFor;
  calibrated.limitedEvidence = limitedEvidence;
  calibrated.safety = addCentellaSafetyCaution(calibrated.safety || {});
  calibrated.evidenceQuality = 'moderate';
  calibrated.evidenceSummary = 'Centella asiatica tiene evidencia humana moderada para sintomas de insuficiencia venosa cronica y evidencia preliminar para otros usos. Las magnitudes deben interpretarse con cautela y solo cuando esten trazadas a estudios concretos.';

  return calibrated;
}

const CANNABIS_CONTEXT_NOTICE = 'Evidencia sobre cannabinoides medicos o formulaciones especificas; no equivale a recomendar Cannabis sativa/CBD como suplemento.';
const CBD_RESEARCH_DESCRIPTION = 'Cannabidiol (CBD) es un cannabinoide estudiado en formulaciones farmaceuticas especificas. Esta ficha no evalua ni recomienda productos comerciales de CBD como suplemento.';
const CBD_LIMITED_NOTE = 'Evidencia limitada o formulacion-especifica; no debe interpretarse como beneficio clinico general de CBD comercial.';

function isCbdText(...values: unknown[]): boolean {
  const haystack = normalizeClinicalText(values.filter(Boolean).join(' '));
  return /\b(cbd|cannabidiol)\b/.test(haystack);
}

function stripCannabisContextNotice(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value
    .replace(/Evidencia sobre cannabinoides medicos o formulaciones especificas; no equivale a recomendar Cannabis sativa\/CBD como suplemento\.?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function withCannabisContextNotice(value: unknown): string {
  const base = String(stripCannabisContextNotice(sanitizeCannabisClaimText(value)) || '').trim();
  return base ? `${base} ${CANNABIS_CONTEXT_NOTICE}` : CANNABIS_CONTEXT_NOTICE;
}

function cannabisConditionLabel(item: EvidenceItem): string {
  const text = normalizeClinicalText([
    item?.condition,
    item?.use,
    item?.benefit,
    item?.notes,
    item?.description,
  ].filter(Boolean).join(' '));

  if (/\b(spasticity|espasticidad|multiple sclerosis|esclerosis multiple|nabiximols|sativex)\b/.test(text)) {
    return 'Nabiximols/cannabinoides medicos para espasticidad en esclerosis multiple';
  }
  if (/\b(nausea|vomiting|nausea|vomito|vomitos|quimioterapia|chemotherapy|dronabinol|nabilone)\b/.test(text)) {
    return 'Dronabinol/nabilone para nausea y vomito inducidos por quimioterapia';
  }
  if (/\b(epilepsy|epilepsia|seizures?|convulsiones|cannabidiol|cbd)\b/.test(text)) {
    return 'Cannabidiol farmaceutico para ciertos trastornos convulsivos';
  }
  if (/\b(pain|dolor|neuropathic|neuropatico|cancer pain)\b/.test(text)) {
    return 'Cannabinoides medicos para dolor cronico o neuropatico';
  }

  const original = sanitizeCannabisClaimText(item?.condition || item?.use || item?.benefit);
  return `Formulaciones cannabinoides especificas: ${original || 'uso clinico estudiado'}`;
}

function isSpecificCbdClinicalItem(item: EvidenceItem): boolean {
  const text = normalizeClinicalText([
    item?.condition,
    item?.use,
    item?.benefit,
    item?.notes,
    item?.description,
  ].filter(Boolean).join(' '));

  return /\b(epilepsy|epilepsia|seizures?|convulsiones|epidiolex|cannabidiol farmaceutico)\b/.test(text);
}

function calibrateCannabisWorksFor(
  worksFor: any[],
  options: { cbdScoped?: boolean } = {}
): { worksFor: any[]; limitedEvidence: any[] } {
  const calibratedWorksFor: any[] = [];
  const demotedLimitedEvidence: any[] = [];

  for (const rawItem of Array.isArray(worksFor) ? worksFor : []) {
    const item = sanitizeCannabisItem({ ...rawItem }) as any;
    const shouldDemoteCbdItem = options.cbdScoped && !isSpecificCbdClinicalItem(item);
    item.condition = cannabisConditionLabel(item);
    item.notes = String(stripCannabisContextNotice(sanitizeCannabisClaimText(item.notes)) || '').trim();

    if (shouldDemoteCbdItem) {
      demotedLimitedEvidence.push({
        ...item,
        evidenceGrade: 'C',
        grade: 'C',
        notes: `${item.notes || ''} ${CBD_LIMITED_NOTE}`.trim(),
      });
      continue;
    }

    calibratedWorksFor.push(item);
  }

  return {
    worksFor: calibratedWorksFor,
    limitedEvidence: demotedLimitedEvidence,
  };
}

function hideUncontextualizedCbdStudyCount(calibrated: any): void {
  if (!calibrated || typeof calibrated !== 'object') return;

  const metadata = calibrated._enrichment_metadata || calibrated.metadata || {};
  const hasReviewedStudies = Number(metadata.studiesUsed || metadata.humanClinicalStudiesCount || 0) > 0;
  if (hasReviewedStudies) return;

  if (Number(calibrated.totalStudies || 0) >= 50) {
    calibrated.totalStudies = 0;
  }

  if (calibrated.evidence_summary && Number(calibrated.evidence_summary.totalStudies || 0) >= 50) {
    calibrated.evidence_summary.totalStudies = 0;
  }

  if (calibrated.studies && Number(calibrated.studies.total || 0) >= 50) {
    calibrated.studies.total = 0;
  }
}

function calibrateCannabisDataShape(data: any, category?: string) {
  if (!data || typeof data !== 'object') return data;

  const calibrated: any = sanitizeCannabisItem({ ...data });
  const cbdScoped = isCbdText(category, calibrated.name, calibrated.whatIsIt, calibrated.description, calibrated.whatIsItFor);
  const calibratedEvidence = calibrateCannabisWorksFor(calibrated.worksFor, { cbdScoped });
  calibrated.worksFor = calibratedEvidence.worksFor;
  calibrated.limitedEvidence = [
    ...(Array.isArray(calibrated.limitedEvidence) ? calibrated.limitedEvidence : []),
    ...calibratedEvidence.limitedEvidence,
  ];
  calibrated.products = [];
  calibrated.buyingGuidance = undefined;
  calibrated.regulatoryNotice = CANNABIS_CONTEXT_NOTICE;
  calibrated.evidenceSummary = String(stripCannabisContextNotice(sanitizeCannabisClaimText(calibrated.evidenceSummary)) || '').trim();
  calibrated.practicalRecommendations = [
    ...(Array.isArray(calibrated.practicalRecommendations)
      ? calibrated.practicalRecommendations
        .map((item: unknown) => stripCannabisContextNotice(sanitizeCannabisClaimText(item)))
        .filter(Boolean)
      : []),
    CANNABIS_CONTEXT_NOTICE,
  ];

  if (cbdScoped) {
    calibrated.whatIsIt = CBD_RESEARCH_DESCRIPTION;
    calibrated.description = CBD_RESEARCH_DESCRIPTION;
    calibrated.whatIsItFor = CBD_RESEARCH_DESCRIPTION;
    hideUncontextualizedCbdStudyCount(calibrated);
  } else {
    calibrated.whatIsIt = withCannabisContextNotice(calibrated.whatIsIt || calibrated.description || calibrated.whatIsItFor);
    calibrated.description = String(stripCannabisContextNotice(sanitizeCannabisClaimText(calibrated.description)) || '').trim();
    calibrated.whatIsItFor = String(stripCannabisContextNotice(sanitizeCannabisClaimText(calibrated.whatIsItFor)) || '').trim();
  }

  return calibrated;
}

export function calibrateCannabisEnrichedContent(content: any, category: string): any {
  if (!content || !isCannabisText(category, content?.name, content?.whatIsIt, content?.description)) return content;
  return calibrateCannabisDataShape(content, category);
}

export function calibrateCentellaEnrichedContent(content: any, category: string): any {
  if (!content || !isCentellaText(category, content?.name, content?.whatIsIt, content?.description)) return content;
  return calibrateCentellaDataShape(content);
}

export function calibrateCentellaRecommendation<T>(recommendation: T, category?: string): T {
  if (!recommendation || !isCentellaRecommendation(recommendation, category)) return recommendation;

  const calibrated: any = sanitizeCentellaItem(recommendation);

  if (calibrated.data) {
    calibrated.data = calibrateCentellaDataShape(calibrated.data);
  }

  if (calibrated.supplement) {
    const { worksFor, limitedEvidence } = calibrateWorksForList(
      calibrated.supplement.worksFor,
      calibrated.supplement.limitedEvidence
    );

    calibrated.supplement.worksFor = worksFor;
    calibrated.supplement.limitedEvidence = limitedEvidence;
    calibrated.supplement.safety = addCentellaSafetyCaution(calibrated.supplement.safety || {});
    calibrated.supplement.sideEffects = calibrated.supplement.safety.sideEffects || calibrated.supplement.sideEffects || [];
    calibrated.supplement.contraindications = calibrated.supplement.safety.contraindications || calibrated.supplement.contraindications || [];
    calibrated.supplement.warnings = calibrated.supplement.contraindications;
    calibrated.supplement.benefits = worksFor.map((item: any) =>
      `${item.condition || item.use || item.benefit} (Evidencia: ${item.evidenceGrade || item.grade || 'B'}, ${item.magnitude || 'Ver estudios'})`
    );
  }

  if (calibrated.evidence_summary?.ingredients?.[0]) {
    calibrated.evidence_summary.ingredients = calibrated.evidence_summary.ingredients.map((ingredient: any) => ({
      ...ingredient,
      grade: capEvidenceGrade(ingredient.grade, 'B'),
    }));
  }

  if (calibrated.evidence) {
    calibrated.evidence.quality = 'moderate';
    calibrated.evidence.summary = sanitizeCentellaClaimText(calibrated.evidence.summary) || calibrated.evidence.summary;
  }

  return calibrated as T;
}

export function calibrateLionsManeRecommendation<T>(recommendation: T, category?: string): T {
  if (!recommendation || !isLionsManeRecommendation(recommendation, category)) return recommendation;
  return sanitizeLionsManeItem(recommendation);
}

export function calibrateCannabisRecommendation<T>(recommendation: T, category?: string): T {
  if (!recommendation || !isCannabisRecommendation(recommendation, category)) return recommendation;

  const calibrated: any = sanitizeCannabisItem(recommendation);

  if (!calibrated.data && !calibrated.supplement && (calibrated.name || calibrated.worksFor || calibrated.products)) {
    return calibrateCannabisDataShape(calibrated, category) as T;
  }

  if (calibrated.data) {
    calibrated.data = calibrateCannabisDataShape(calibrated.data, category);
  }

  if (calibrated.supplement) {
    const cbdScoped = isCbdText(
      category,
      calibrated.category,
      calibrated.supplement.name,
      calibrated.supplement.whatIsIt,
      calibrated.supplement.description,
      calibrated.supplement.whatIsItFor
    );
    const calibratedEvidence = calibrateCannabisWorksFor(calibrated.supplement.worksFor, { cbdScoped });
    calibrated.supplement.worksFor = calibratedEvidence.worksFor;
    calibrated.supplement.limitedEvidence = [
      ...(Array.isArray(calibrated.supplement.limitedEvidence) ? calibrated.supplement.limitedEvidence : []),
      ...calibratedEvidence.limitedEvidence,
    ];
    calibrated.supplement.products = [];
    calibrated.supplement.buyingGuidance = undefined;
    calibrated.supplement.regulatoryNotice = CANNABIS_CONTEXT_NOTICE;
    calibrated.supplement.practicalRecommendations = [
      ...(Array.isArray(calibrated.supplement.practicalRecommendations)
        ? calibrated.supplement.practicalRecommendations
          .map((item: unknown) => stripCannabisContextNotice(sanitizeCannabisClaimText(item)))
          .filter(Boolean)
        : []),
      CANNABIS_CONTEXT_NOTICE,
    ];
    calibrated.supplement.benefits = calibrated.supplement.worksFor.map((item: any) =>
      `${item.condition || item.use || item.benefit} (Evidencia: ${item.evidenceGrade || item.grade || 'B'})`
    );

    if (cbdScoped) {
      calibrated.supplement.whatIsIt = CBD_RESEARCH_DESCRIPTION;
      calibrated.supplement.description = CBD_RESEARCH_DESCRIPTION;
      calibrated.supplement.whatIsItFor = CBD_RESEARCH_DESCRIPTION;
      hideUncontextualizedCbdStudyCount(calibrated.supplement);
    } else {
      calibrated.supplement.whatIsIt = withCannabisContextNotice(
        calibrated.supplement.whatIsIt || calibrated.supplement.description || calibrated.supplement.whatIsItFor
      );
      calibrated.supplement.description = String(stripCannabisContextNotice(sanitizeCannabisClaimText(calibrated.supplement.description)) || '').trim();
      calibrated.supplement.whatIsItFor = String(stripCannabisContextNotice(sanitizeCannabisClaimText(calibrated.supplement.whatIsItFor)) || '').trim();
    }
  }

  calibrated.products = [];

  if (calibrated.evidence) {
    calibrated.evidence.summary = String(stripCannabisContextNotice(sanitizeCannabisClaimText(calibrated.evidence.summary)) || '').trim();
  }

  if (isCbdText(category, calibrated.category, calibrated.name)) {
    hideUncontextualizedCbdStudyCount(calibrated);
  }

  calibrated._enrichment_metadata = {
    ...(calibrated._enrichment_metadata || {}),
    regulatedCannabinoidNotice: CANNABIS_CONTEXT_NOTICE,
  };

  return calibrated as T;
}

export function calibratePortalRecommendation<T>(recommendation: T, category?: string): T {
  return calibrateCannabisRecommendation(
    calibrateLionsManeRecommendation(
      calibrateCentellaRecommendation(recommendation, category),
      category
    ),
    category
  );
}
