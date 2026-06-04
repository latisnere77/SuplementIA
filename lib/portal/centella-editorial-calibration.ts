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

function isRhodiolaText(...values: unknown[]): boolean {
  const haystack = normalizeClinicalText(values.filter(Boolean).join(' '));
  return /\b(rhodiola rosea|rhodiola|shr-5|vitano|rosavins|salidroside)\b/.test(haystack);
}

function isBacopaText(...values: unknown[]): boolean {
  const haystack = normalizeClinicalText(values.filter(Boolean).join(' '));
  return /\b(bacopa monnieri|bacopa|brahmi|bacosides?)\b/.test(haystack);
}

function isSawPalmettoText(...values: unknown[]): boolean {
  const haystack = normalizeClinicalText(values.filter(Boolean).join(' '));
  return /\b(saw palmetto|serenoa repens|permixon|hexanic extract|extracto hexanico)\b/.test(haystack);
}

function isGinkgoText(...values: unknown[]): boolean {
  const haystack = normalizeClinicalText(values.filter(Boolean).join(' '));
  return /\b(ginkgo biloba|egb\s*761|ginkgo extract|extracto de ginkgo)\b/.test(haystack);
}

function isMilkThistleText(...values: unknown[]): boolean {
  const haystack = normalizeClinicalText(values.filter(Boolean).join(' '));
  return /\b(milk thistle|silybum marianum|silymarin|silibinin|cardo mariano)\b/.test(haystack);
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

function isRhodiolaRecommendation(value: any, category?: string): boolean {
  return isRhodiolaText(
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

function isBotanicalP2Recommendation(value: any, category?: string): boolean {
  return Boolean(getBotanicalP2Profile(value, category));
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
const CBD_RESEARCH_DESCRIPTION = 'Cannabidiol (CBD) puede referirse a una formulacion farmaceutica especifica o a productos comerciales/OTC. Esta ficha separa esos carriles: Epidiolex/cannabidiol farmaceutico no equivale a aceites, gummies ni suplementos comerciales de CBD.';
const CBD_PHARMA_NOTICE = 'Carril farmaceutico: evidencia sobre cannabidiol farmaceutico/Epidiolex; no se extrapola a aceites, gummies ni CBD comercial/OTC.';
const CBD_OTC_NOTICE = 'Carril CBD comercial/OTC: evidencia limitada o investigacional; no equivale a recomendacion clinica ni a efecto clinico establecido de productos comerciales.';
const CBD_SAFETY_WARNING = 'Cannabidiol farmaceutico requiere supervision medica: puede elevar transaminasas y tiene interacciones relevantes con clobazam, valproato, antiepilepticos y sedantes.';
const CBD_LIMITED_NOTE = CBD_OTC_NOTICE;
const CBD_THC_DISTINCTION_NOTICE = 'THC es otro cannabinoide distinto; esta informacion no aplica como evidencia de beneficio de CBD.';
const CBD_THC_CONTAMINATION_NOTICE = 'THC es otro cannabinoide distinto; verificar certificados de analisis ayuda a descartar cannabinoides no declarados o contaminantes.';

function isCbdText(...values: unknown[]): boolean {
  const haystack = normalizeClinicalText(values.filter(Boolean).join(' '));
  return /\b(cbd|cannabidiol)\b/.test(haystack);
}

function isCbdIdentityText(...values: unknown[]): boolean {
  const haystack = normalizeClinicalText(values.filter(Boolean).join(' '));
  return /\b(cbd|cannabidiol)\b/.test(haystack) && !/\b(cannabis sativa|medical cannabis|medical marijuana|cannabinoids)\b/.test(haystack);
}

function stripCannabisContextNotice(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value
    .replace(/Evidencia sobre cannabinoides medicos o formulaciones especificas; no equivale a recomendar Cannabis sativa\/CBD como suplemento\.?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function stripCannabisContextNoticeDeep<T>(value: T): T {
  if (typeof value === 'string') return stripCannabisContextNotice(value) as T;
  if (Array.isArray(value)) return value.map((item) => stripCannabisContextNoticeDeep(item)) as T;
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      stripCannabisContextNoticeDeep(item),
    ])
  ) as T;
}

function withCannabisContextNotice(value: unknown): string {
  const base = String(stripCannabisContextNotice(sanitizeCannabisClaimText(value)) || '').trim();
  return base ? `${base} ${CANNABIS_CONTEXT_NOTICE}` : CANNABIS_CONTEXT_NOTICE;
}

function sanitizeCbdLaneText(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  return String(stripCannabisContextNotice(sanitizeCannabisClaimText(value)) || '')
    .replace(/\bCannabinoides medicos para\b/gi, 'CBD comercial/OTC: evidencia limitada sobre')
    .replace(/\btiene evidencia clinica especifica para\b/gi, 'evidencia limitada sobre')
    .replace(/\bpropiedades? antiinflamatorias? comprobadas?\b/gi, 'evidencia limitada sobre inflamacion')
    .replace(/\b(?:reduccion|aumento|mejora|incremento)\s+(?:media\s+)?de\s+\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?\s*%/gi, 'cambios reportados en estudios especificos')
    .replace(/\b(?:reduccion|aumento|mejora|incremento)\s+(?:media\s+)?de\s+\d+(?:\.\d+)?\s*%/gi, 'cambios reportados en estudios especificos')
    .replace(/\b\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?\s*%/g, 'cifras reportadas en estudios especificos')
    .replace(/\b\d+(?:\.\d+)?\s*%/g, 'cifras reportadas en estudios especificos')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function hasThcReference(value: unknown): boolean {
  return /\b(thc|tetrahydrocannabinol)\b/.test(normalizeClinicalText(value));
}

function hasCbdEntityMixReference(value: unknown): boolean {
  return /\b(thc|tetrahydrocannabinol|nabiximols|sativex|dronabinol|nabilone|full[-\s]?spectrum|broad[-\s]?spectrum|espectro completo|amplio espectro|thc\+cbd|abstinencia de thc)\b/.test(
    normalizeClinicalText(value)
  );
}

function sanitizeCbdThcContrastText(value: unknown): unknown {
  if (typeof value !== 'string' || !hasThcReference(value)) return value;

  const normalized = normalizeClinicalText(value);
  if (/\b(contamin|coa|certific|analisis|analysis|declarad|declared|ausencia|absence)\b/.test(normalized)) {
    return CBD_THC_CONTAMINATION_NOTICE;
  }

  const base = String(sanitizeCbdLaneText(value) || '')
    .replace(/\bA diferencia del THC,?\s*/gi, '')
    .replace(/\bTHC\+CBD\b/gi, 'formulaciones cannabinoides mixtas')
    .replace(/\bTHC\b/gi, 'otro cannabinoide')
    .replace(/\btetrahydrocannabinol\b/gi, 'otro cannabinoide')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return base
    ? `${CBD_THC_DISTINCTION_NOTICE} ${base}`
    : CBD_THC_DISTINCTION_NOTICE;
}

function sanitizeCbdThcContrastDeep<T>(value: T): T {
  if (typeof value === 'string') return sanitizeCbdThcContrastText(value) as T;
  if (Array.isArray(value)) return value.map((item) => sanitizeCbdThcContrastDeep(item)) as T;
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sanitizeCbdThcContrastDeep(item),
    ])
  ) as T;
}

function withCbdLaneNote(value: unknown, note: string): string {
  const base = String(sanitizeCbdLaneText(value) || '').trim();
  if (!base) return note;
  return normalizeClinicalText(base).includes(normalizeClinicalText(note)) ? base : `${base} ${note}`;
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

function cbdLimitedConditionLabel(item: EvidenceItem): string {
  const original = String(sanitizeCbdLaneText(item?.condition || item?.use || item?.benefit) || '').trim();
  if (!original) return 'CBD comercial/OTC: evidencia limitada o investigacional';
  if (/^CBD comercial\/OTC:/i.test(original)) return original;
  return `CBD comercial/OTC: evidencia limitada sobre ${original}`;
}

function cbdPharmaceuticalConditionLabel(): string {
  return 'Cannabidiol farmaceutico/Epidiolex para Lennox-Gastaut, Dravet o complejo de esclerosis tuberosa';
}

function isSpecificCbdClinicalItem(item: EvidenceItem): boolean {
  const text = normalizeClinicalText([
    item?.condition,
    item?.use,
    item?.benefit,
    item?.notes,
    item?.description,
  ].filter(Boolean).join(' '));

  const specificIndication = /\b(lennox|dravet|tuberous sclerosis|esclerosis tuberosa|tsc|epilepsy|epilepsia|seizures?|convulsiones|trastornos convulsivos)\b/.test(text);
  const pharmaceuticalFormulation = /\b(epidiolex|pharmaceutical cannabidiol|cannabidiol farmaceutico|formulacion(?:es)? farmaceutic(?:a|as|o|os)|formulacion especifica|medicamento|prescription)\b/.test(text);
  const namedEpidiolexIndication = /\b(lennox|dravet|tuberous sclerosis|esclerosis tuberosa|tsc)\b/.test(text);
  return specificIndication && (pharmaceuticalFormulation || namedEpidiolexIndication);
}

function isNonCbdCannabinoidClinicalItem(item: EvidenceItem): boolean {
  const text = normalizeClinicalText([
    item?.condition,
    item?.use,
    item?.benefit,
    item?.notes,
    item?.description,
  ].filter(Boolean).join(' '));

  return /\b(nabiximols|sativex|dronabinol|nabilone|tetrahydrocannabinol|thc)\b/.test(text);
}

function calibrateCbdLimitedEvidenceItem(rawItem: any): any | null {
  const item = sanitizeCannabisItem({ ...rawItem }) as any;
  if (isNonCbdCannabinoidClinicalItem(item)) return null;

  item.condition = cbdLimitedConditionLabel(item);
  item.use = item.condition;
  item.benefit = item.condition;
  item.evidenceGrade = 'C';
  item.grade = 'C';
  item.description = sanitizeCbdLaneText(item.description);
  item.magnitude = sanitizeCbdLaneText(item.magnitude);
  item.notes = withCbdLaneNote(item.notes || item.description || item.magnitude, CBD_OTC_NOTICE);
  return item;
}

function calibrateCbdLimitedEvidenceList(items: unknown): any[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => calibrateCbdLimitedEvidenceItem(item))
    .filter(Boolean);
}

function calibrateCbdDoesntWorkForList(items: unknown): any[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((rawItem) => sanitizeCannabisItem({ ...(rawItem as any) }) as any)
    .filter((item) => !hasCbdEntityMixReference([
      item?.condition,
      item?.use,
      item?.benefit,
      item?.notes,
      item?.description,
    ].filter(Boolean).join(' ')))
    .map((item) => ({
      ...item,
      condition: sanitizeCbdLaneText(item.condition),
      use: sanitizeCbdLaneText(item.use),
      benefit: sanitizeCbdLaneText(item.benefit),
      notes: sanitizeCbdLaneText(item.notes),
      description: sanitizeCbdLaneText(item.description),
    }));
}

function addCbdSafetyCaution(safety: any = {}) {
  const calibratedSafety = sanitizeCannabisItem({ ...safety }) as any;
  const safetyText = normalizeClinicalText(JSON.stringify(calibratedSafety));

  if (!safetyText.includes('transaminasas') && !safetyText.includes('clobazam') && !safetyText.includes('valproato')) {
    calibratedSafety.contraindications = [
      ...(Array.isArray(calibratedSafety.contraindications) ? calibratedSafety.contraindications : []),
      CBD_SAFETY_WARNING,
    ];
  }

  calibratedSafety.interactions = [
    ...(Array.isArray(calibratedSafety.interactions) ? calibratedSafety.interactions : []),
    'Precaucion con clobazam, valproato, antiepilepticos y sedantes; requiere supervision profesional.',
  ];
  calibratedSafety.notes = withCbdLaneNote(calibratedSafety.notes, CBD_SAFETY_WARNING);
  return sanitizeCbdThcContrastDeep(calibratedSafety);
}

function cbdSafePrimaryUses(): string[] {
  return [
    'Cannabidiol farmaceutico/Epidiolex: uso estudiado para convulsiones asociadas a Lennox-Gastaut, Dravet o TSC.',
    'CBD comercial/OTC: ansiedad, sueno, dolor e inflamacion tienen evidencia limitada/investigacional; no son usos clinicos establecidos.',
  ];
}

function calibrateCannabisWorksFor(
  worksFor: any[],
  options: { cbdScoped?: boolean } = {}
): { worksFor: any[]; limitedEvidence: any[] } {
  const calibratedWorksFor: any[] = [];
  const demotedLimitedEvidence: any[] = [];

  for (const rawItem of Array.isArray(worksFor) ? worksFor : []) {
    const item = sanitizeCannabisItem({ ...rawItem }) as any;
    if (options.cbdScoped && isNonCbdCannabinoidClinicalItem(item)) {
      continue;
    }
    const shouldDemoteCbdItem = options.cbdScoped && !isSpecificCbdClinicalItem(item);
    item.condition = options.cbdScoped ? cbdPharmaceuticalConditionLabel() : cannabisConditionLabel(item);
    item.notes = options.cbdScoped
      ? withCbdLaneNote(item.notes || item.description || item.magnitude, CBD_PHARMA_NOTICE)
      : String(stripCannabisContextNotice(sanitizeCannabisClaimText(item.notes)) || '').trim();

    if (shouldDemoteCbdItem) {
      const limitedItem = calibrateCbdLimitedEvidenceItem(item);
      if (limitedItem) demotedLimitedEvidence.push(limitedItem);
      continue;
    }

    if (options.cbdScoped) {
      item.use = item.condition;
      item.benefit = item.condition;
      item.description = sanitizeCbdLaneText(item.description);
      item.magnitude = sanitizeCbdLaneText(item.magnitude);
      item.safety = addCbdSafetyCaution(item.safety || {});
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

  if (Array.isArray(calibrated.evidence_summary?.ingredients)) {
    calibrated.evidence_summary.ingredients = calibrated.evidence_summary.ingredients.map((ingredient: any) => {
      if (!isCbdText(ingredient?.name, ingredient?.description)) return ingredient;
      return {
        ...ingredient,
        studyCount: 0,
        rctCount: 0,
      };
    });
  }

  if (calibrated.studies && Number(calibrated.studies.total || 0) >= 50) {
    calibrated.studies.total = 0;
  }
}

function stripCannabisNoticeFromEvidenceSummary(calibrated: any): void {
  if (!Array.isArray(calibrated?.evidence_summary?.ingredients)) return;
  calibrated.evidence_summary.ingredients = calibrated.evidence_summary.ingredients.map((ingredient: any) => ({
    ...ingredient,
    description: stripCannabisContextNotice(sanitizeCannabisClaimText(ingredient?.description)),
  }));
}

function sanitizeCbdDosage(dosage: any): any {
  if (!dosage || typeof dosage !== 'object') return dosage;
  const calibratedDosage = sanitizeCannabisItem({ ...dosage }) as any;

  if (Array.isArray(calibratedDosage.forms)) {
    calibratedDosage.forms = calibratedDosage.forms
      .map((form: any) => ({
        ...form,
        name: sanitizeCbdLaneText(form?.name),
        description: sanitizeCbdLaneText(form?.description),
      }))
      .filter((form: any) => !hasCbdEntityMixReference([
        form?.name,
        form?.description,
      ].filter(Boolean).join(' ')));
  }

  return sanitizeCbdThcContrastDeep(calibratedDosage);
}

function sanitizeCbdPracticalRecommendations(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => sanitizeCbdLaneText(stripCannabisContextNotice(sanitizeCannabisClaimText(item))))
    .filter((item): item is string => typeof item === 'string' && item.length > 0)
    .filter((item) => !hasCbdEntityMixReference(item));
}

function sanitizeCbdEvidenceSummary(calibrated: any): void {
  if (!Array.isArray(calibrated?.evidence_summary?.ingredients)) return;
  calibrated.evidence_summary.ingredients = calibrated.evidence_summary.ingredients.map((ingredient: any) => ({
    ...ingredient,
    description: sanitizeCbdThcContrastText(sanitizeCbdLaneText(ingredient?.description)),
  }));
}

function sanitizeCbdSecondaryFields(calibrated: any): void {
  calibrated.doesntWorkFor = calibrateCbdDoesntWorkForList(calibrated.doesntWorkFor);
  calibrated.dosage = sanitizeCbdDosage(calibrated.dosage);
  calibrated.practicalRecommendations = sanitizeCbdPracticalRecommendations(calibrated.practicalRecommendations);
  calibrated.mechanisms = sanitizeCbdThcContrastDeep(calibrated.mechanisms);
  calibrated.evidenceSummary = sanitizeCbdThcContrastText(calibrated.evidenceSummary);
  sanitizeCbdEvidenceSummary(calibrated);
}

function keepSingleBroadCannabisNotice(calibrated: any, cbdScoped: boolean): any {
  const cleaned = stripCannabisContextNoticeDeep(calibrated);
  if (cbdScoped) return cleaned;

  if (cleaned?.supplement) {
    cleaned.supplement.whatIsIt = withCannabisContextNotice(
      cleaned.supplement.whatIsIt || cleaned.supplement.description || cleaned.supplement.whatIsItFor
    );
    return cleaned;
  }

  cleaned.whatIsIt = withCannabisContextNotice(cleaned.whatIsIt || cleaned.description || cleaned.whatIsItFor);
  return cleaned;
}

function calibrateCannabisDataShape(data: any, category?: string) {
  if (!data || typeof data !== 'object') return data;

  const calibrated: any = sanitizeCannabisItem({ ...data });
  const cbdScoped = isCbdIdentityText(category, calibrated.name);
  const calibratedEvidence = calibrateCannabisWorksFor(calibrated.worksFor, { cbdScoped });
  calibrated.worksFor = calibratedEvidence.worksFor;
  calibrated.limitedEvidence = cbdScoped
    ? [
      ...calibrateCbdLimitedEvidenceList(calibrated.limitedEvidence),
      ...calibratedEvidence.limitedEvidence.filter(Boolean),
    ]
    : [
      ...(Array.isArray(calibrated.limitedEvidence) ? calibrated.limitedEvidence : []),
      ...calibratedEvidence.limitedEvidence,
    ];
  calibrated.products = [];
  calibrated.buyingGuidance = undefined;
  calibrated.regulatoryNotice = undefined;
  calibrated.evidenceSummary = String(stripCannabisContextNotice(sanitizeCannabisClaimText(calibrated.evidenceSummary)) || '').trim();
  calibrated.practicalRecommendations = [
    ...(Array.isArray(calibrated.practicalRecommendations)
      ? calibrated.practicalRecommendations
        .map((item: unknown) => stripCannabisContextNotice(sanitizeCannabisClaimText(item)))
        .filter(Boolean)
      : []),
  ];
  stripCannabisNoticeFromEvidenceSummary(calibrated);

  if (cbdScoped) {
    calibrated.whatIsIt = CBD_RESEARCH_DESCRIPTION;
    calibrated.description = CBD_RESEARCH_DESCRIPTION;
    calibrated.whatIsItFor = CBD_RESEARCH_DESCRIPTION;
    calibrated.primaryUses = cbdSafePrimaryUses();
    calibrated.safety = addCbdSafetyCaution(calibrated.safety || {});
    sanitizeCbdSecondaryFields(calibrated);
    hideUncontextualizedCbdStudyCount(calibrated);
  } else {
    calibrated.whatIsIt = withCannabisContextNotice(calibrated.whatIsIt || calibrated.description || calibrated.whatIsItFor);
    calibrated.description = String(stripCannabisContextNotice(sanitizeCannabisClaimText(calibrated.description)) || '').trim();
    calibrated.whatIsItFor = String(stripCannabisContextNotice(sanitizeCannabisClaimText(calibrated.whatIsItFor)) || '').trim();
  }

  return keepSingleBroadCannabisNotice(calibrated, cbdScoped);
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

type BotanicalP2Profile = {
  label: string;
  matches: (...values: unknown[]) => boolean;
  keepWorksFor: (item: any) => boolean;
  limitedNote: string;
  scopeNote?: string;
};

function botanicalItemText(item: any): string {
  return normalizeClinicalText([
    item?.condition,
    item?.use,
    item?.benefit,
    item?.description,
    item?.summary,
    item?.notes,
    item?.magnitude,
  ].filter(Boolean).join(' '));
}

function appendClinicalNote(value: unknown, note: string): string {
  const base = String(sanitizeCentellaClaimText(value) || '').trim();
  return normalizeClinicalText(base).includes(normalizeClinicalText(note))
    ? base
    : `${base} ${note}`.trim();
}

function isBacopaStrongWorksForItem(item: any): boolean {
  const text = botanicalItemText(item);
  const cognitive = /\b(memory|memoria|attention|atencion|cognitive|cognitivo|cognitiva|cognition|aprendizaje|learning)\b/.test(text);
  const inflated = /\b(anxiety|ansiedad|depression|depresion|depresivos?|mood|estado de animo|neuroprotect|neuroproteccion|neurodegener|alzheimer|dementia|demencia|preclinical|preclinico|in vitro|animal|animals|ratas?|rats?|cell|celulas?|oxidative|oxidativo|antioxidant|antioxidante)\b/.test(text);
  return cognitive && !inflated;
}

function isSawPalmettoScopedWorksForItem(item: any): boolean {
  const text = botanicalItemText(item);
  return /\b(permixon|hexanic|extracto hexanico)\b/.test(text) &&
    /\b(bph|luts|benign prostatic hyperplasia|hiperplasia prostatica|lower urinary tract|tracto urinario inferior|prostat)\b/.test(text);
}

function isGinkgoScopedWorksForItem(item: any): boolean {
  const text = botanicalItemText(item);
  const scoped = /\b(egb\s*761)\b/.test(text);
  const clinical = /\b(cognitive impairment|deterioro cognitivo|dementia|demencia|alzheimer)\b/.test(text);
  const inflated = /\b(prevention|prevencion|prevent|tinnitus|acufeno|platelet|plaquetaria|coagul|bleeding|sangrado|oxidative|oxidativo|surgery|cirugia|cardiovascular|endothelial|endotelial|mechanism|mecanismo)\b/.test(text);
  return scoped && clinical && !inflated;
}

const BOTANICAL_P2_PROFILES: BotanicalP2Profile[] = [
  {
    label: 'Bacopa monnieri',
    matches: isBacopaText,
    keepWorksFor: isBacopaStrongWorksForItem,
    limitedNote: 'Evidencia limitada o no suficientemente especifica: no debe presentarse como beneficio clinico establecido de Bacopa monnieri.',
    scopeNote: 'Mantener scope a memoria/atencion en humanos y extractos estandarizados; no extrapolar a otros usos clinicos.',
  },
  {
    label: 'Saw palmetto',
    matches: isSawPalmettoText,
    keepWorksFor: isSawPalmettoScopedWorksForItem,
    limitedNote: 'Evidencia dependiente de formulacion: no generalizar a saw palmetto generico ni presentarlo como beneficio clinico establecido.',
    scopeNote: 'Scope formulacion-especifico: extracto hexanico de Serenoa repens/Permixon; no extrapolar a todos los productos de saw palmetto.',
  },
  {
    label: 'Ginkgo biloba',
    matches: isGinkgoText,
    keepWorksFor: isGinkgoScopedWorksForItem,
    limitedNote: 'Evidencia limitada, mecanistica o formulacion-especifica: no debe presentarse como beneficio clinico establecido de Ginkgo biloba generico.',
    scopeNote: 'Scope formulacion-especifico: EGb 761 en deterioro cognitivo/demencia; no extrapolar a ginkgo generico ni a mecanismos o seguridad.',
  },
  {
    label: 'Milk thistle',
    matches: isMilkThistleText,
    keepWorksFor: () => false,
    limitedNote: 'Evidencia humana mixta o limitada: no debe presentarse como hepatoproteccion, detox ni beneficio clinico establecido de Milk thistle.',
  },
];

function getBotanicalP2Profile(value: any, category?: string): BotanicalP2Profile | undefined {
  return BOTANICAL_P2_PROFILES.find((profile) => profile.matches(
    category,
    value?.category,
    value?.name,
    value?.supplement?.name,
    value?.supplement?.description,
    value?.data?.name,
    value?.data?.whatIsIt,
    value?.data?.description,
    value?.metadata?.supplementId
  ));
}

function demoteBotanicalP2Item(rawItem: any, profile: BotanicalP2Profile): any {
  const item = sanitizeCentellaItem({ ...rawItem }) as any;
  return {
    ...item,
    evidenceGrade: 'C',
    grade: 'C',
    notes: appendClinicalNote(item.notes || item.summary || item.description, profile.limitedNote),
    magnitude: 'Evidencia limitada; magnitud clinica no establecida.',
  };
}

function calibrateBotanicalP2WorksFor(
  worksFor: unknown,
  limitedEvidence: unknown,
  profile: BotanicalP2Profile
): { worksFor: any[]; limitedEvidence: any[] } {
  const calibratedWorksFor: any[] = [];
  const calibratedLimitedEvidence = Array.isArray(limitedEvidence) ? [...limitedEvidence] : [];

  for (const rawItem of Array.isArray(worksFor) ? worksFor : []) {
    const item = sanitizeCentellaItem({ ...rawItem }) as any;

    if (!profile.keepWorksFor(item)) {
      calibratedLimitedEvidence.push(demoteBotanicalP2Item(item, profile));
      continue;
    }

    item.evidenceGrade = capEvidenceGrade(item.evidenceGrade || item.grade, 'B');
    item.grade = item.evidenceGrade;
    if (profile.scopeNote) {
      item.notes = appendClinicalNote(item.notes, profile.scopeNote);
    }
    calibratedWorksFor.push(item);
  }

  return {
    worksFor: calibratedWorksFor,
    limitedEvidence: calibratedLimitedEvidence,
  };
}

function calibrateBotanicalP2DataShape(data: any, profile: BotanicalP2Profile): any {
  if (!data || typeof data !== 'object') return data;

  const calibrated: any = { ...data };
  const { worksFor, limitedEvidence } = calibrateBotanicalP2WorksFor(
    calibrated.worksFor,
    calibrated.limitedEvidence,
    profile
  );
  calibrated.worksFor = worksFor;
  calibrated.limitedEvidence = limitedEvidence;
  calibrated.benefits = worksFor.map((item: any) =>
    `${item.condition || item.use || item.benefit} (Evidencia: ${item.evidenceGrade || item.grade || 'B'})`
  );
  return calibrated;
}

export function calibrateBotanicalP2Recommendation<T>(recommendation: T, category?: string): T {
  if (!recommendation || !isBotanicalP2Recommendation(recommendation, category)) return recommendation;

  const profile = getBotanicalP2Profile(recommendation, category);
  if (!profile) return recommendation;

  const calibrated: any = { ...(recommendation as any) };

  if (!calibrated.data && !calibrated.supplement && (calibrated.name || calibrated.worksFor || calibrated.limitedEvidence)) {
    return calibrateBotanicalP2DataShape(calibrated, profile) as T;
  }

  if (calibrated.data) {
    calibrated.data = calibrateBotanicalP2DataShape(calibrated.data, profile);
  }

  if (calibrated.supplement) {
    calibrated.supplement = calibrateBotanicalP2DataShape(calibrated.supplement, profile);
  }

  return calibrated as T;
}

function isRhodiolaMoodOrAnxietyItem(item: any): boolean {
  const text = normalizeClinicalText([
    item?.condition,
    item?.use,
    item?.benefit,
    item?.description,
    item?.summary,
    item?.notes,
  ].filter(Boolean).join(' '));
  return /\b(anxiety|ansiedad|depression|depresion|depresivos?|mood|estado de animo)\b/.test(text);
}

function calibrateRhodiolaWorksFor(
  worksFor: unknown,
  limitedEvidence: unknown
): { worksFor: any[]; limitedEvidence: any[] } {
  const calibratedWorksFor: any[] = [];
  const calibratedLimitedEvidence = Array.isArray(limitedEvidence) ? [...limitedEvidence] : [];

  for (const rawItem of Array.isArray(worksFor) ? worksFor : []) {
    const item = sanitizeCentellaItem({ ...rawItem }) as any;

    if (isRhodiolaMoodOrAnxietyItem(item)) {
      calibratedLimitedEvidence.push({
        ...item,
        evidenceGrade: 'C',
        grade: 'C',
        notes: `${sanitizeCentellaClaimText(item.notes) || ''} Evidencia humana limitada: no debe presentarse como beneficio clinico establecido de Rhodiola rosea.`.trim(),
        magnitude: 'Evidencia limitada; magnitud clinica no establecida.',
      });
      continue;
    }

    item.evidenceGrade = capEvidenceGrade(item.evidenceGrade || item.grade, 'B');
    item.grade = item.evidenceGrade;
    calibratedWorksFor.push(item);
  }

  return {
    worksFor: calibratedWorksFor,
    limitedEvidence: sanitizeCentellaItem(calibratedLimitedEvidence),
  };
}

export function calibrateRhodiolaRecommendation<T>(recommendation: T, category?: string): T {
  if (!recommendation || !isRhodiolaRecommendation(recommendation, category)) return recommendation;

  const calibrated: any = sanitizeCentellaItem(recommendation);

  if (!calibrated.data && !calibrated.supplement && (calibrated.name || calibrated.worksFor || calibrated.limitedEvidence)) {
    const { worksFor, limitedEvidence } = calibrateRhodiolaWorksFor(
      calibrated.worksFor,
      calibrated.limitedEvidence
    );
    calibrated.worksFor = worksFor;
    calibrated.limitedEvidence = limitedEvidence;
    calibrated.benefits = worksFor.map((item: any) =>
      `${item.condition || item.use || item.benefit} (Evidencia: ${item.evidenceGrade || item.grade || 'B'})`
    );
    return calibrated as T;
  }

  if (calibrated.data) {
    const { worksFor, limitedEvidence } = calibrateRhodiolaWorksFor(
      calibrated.data.worksFor,
      calibrated.data.limitedEvidence
    );
    calibrated.data.worksFor = worksFor;
    calibrated.data.limitedEvidence = limitedEvidence;
  }

  if (calibrated.supplement) {
    const { worksFor, limitedEvidence } = calibrateRhodiolaWorksFor(
      calibrated.supplement.worksFor,
      calibrated.supplement.limitedEvidence
    );
    calibrated.supplement.worksFor = worksFor;
    calibrated.supplement.limitedEvidence = limitedEvidence;
    calibrated.supplement.benefits = worksFor.map((item: any) =>
      `${item.condition || item.use || item.benefit} (Evidencia: ${item.evidenceGrade || item.grade || 'B'})`
    );
  }

  return calibrated as T;
}

export function calibrateCannabisRecommendation<T>(recommendation: T, category?: string): T {
  if (!recommendation || !isCannabisRecommendation(recommendation, category)) return recommendation;

  const calibrated: any = sanitizeCannabisItem(recommendation);
  const wrapperCbdScoped = isCbdIdentityText(
    category,
    calibrated.category,
    calibrated.name,
    calibrated.supplement?.name,
    calibrated.data?.name
  );

  if (!calibrated.data && !calibrated.supplement && (calibrated.name || calibrated.worksFor || calibrated.products)) {
    return calibrateCannabisDataShape(calibrated, category) as T;
  }

  if (calibrated.data) {
    calibrated.data = calibrateCannabisDataShape(
      calibrated.data,
      category || calibrated.category || calibrated.name || calibrated.supplement?.name
    );
  }

  if (calibrated.supplement) {
    const cbdScoped = isCbdIdentityText(
      category,
      calibrated.category,
      calibrated.supplement.name
    );
    const calibratedEvidence = calibrateCannabisWorksFor(calibrated.supplement.worksFor, { cbdScoped });
    calibrated.supplement.worksFor = calibratedEvidence.worksFor;
    calibrated.supplement.limitedEvidence = cbdScoped
      ? [
        ...calibrateCbdLimitedEvidenceList(calibrated.supplement.limitedEvidence),
        ...calibratedEvidence.limitedEvidence.filter(Boolean),
      ]
      : [
        ...(Array.isArray(calibrated.supplement.limitedEvidence) ? calibrated.supplement.limitedEvidence : []),
        ...calibratedEvidence.limitedEvidence,
      ];
    calibrated.supplement.products = [];
    calibrated.supplement.buyingGuidance = undefined;
    calibrated.supplement.regulatoryNotice = undefined;
    calibrated.supplement.practicalRecommendations = [
      ...(Array.isArray(calibrated.supplement.practicalRecommendations)
        ? calibrated.supplement.practicalRecommendations
          .map((item: unknown) => stripCannabisContextNotice(sanitizeCannabisClaimText(item)))
          .filter(Boolean)
        : []),
    ];
    calibrated.supplement.benefits = calibrated.supplement.worksFor.map((item: any) =>
      `${item.condition || item.use || item.benefit} (Evidencia: ${item.evidenceGrade || item.grade || 'B'})`
    );

    if (cbdScoped) {
      calibrated.supplement.whatIsIt = CBD_RESEARCH_DESCRIPTION;
      calibrated.supplement.description = CBD_RESEARCH_DESCRIPTION;
      calibrated.supplement.whatIsItFor = CBD_RESEARCH_DESCRIPTION;
      calibrated.supplement.primaryUses = cbdSafePrimaryUses();
      calibrated.supplement.safety = addCbdSafetyCaution(calibrated.supplement.safety || {});
      sanitizeCbdSecondaryFields(calibrated.supplement);
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

  if (wrapperCbdScoped) {
    sanitizeCbdEvidenceSummary(calibrated);
    hideUncontextualizedCbdStudyCount(calibrated);
  }

  if (calibrated._enrichment_metadata?.regulatedCannabinoidNotice) {
    calibrated._enrichment_metadata = {
      ...calibrated._enrichment_metadata,
      regulatedCannabinoidNotice: undefined,
    };
  }
  stripCannabisNoticeFromEvidenceSummary(calibrated);

  return keepSingleBroadCannabisNotice(
    calibrated,
    wrapperCbdScoped
  ) as T;
}

export function calibratePortalRecommendation<T>(recommendation: T, category?: string): T {
  return calibrateCannabisRecommendation(
    calibrateBotanicalP2Recommendation(
      calibrateRhodiolaRecommendation(
        calibrateLionsManeRecommendation(
          calibrateCentellaRecommendation(recommendation, category),
          category
        ),
        category
      ),
      category
    ),
    category
  );
}
