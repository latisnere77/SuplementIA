type EvidenceItem = Record<string, any>;

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

export function sanitizeCentellaClaimText(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  return value
    .replace(/\beficacia demostrada\b/gi, 'evidencia humana disponible')
    .replace(/\btratamiento de\b/gi, 'apoyo estudiado para')
    .replace(/\btratamiento\b/gi, 'uso estudiado')
    .replace(/\btreat(?:s|ment)?\b/gi, 'studied support')
    .replace(/\bcures?\b/gi, 'is studied for')
    .replace(/\b(?:60|25|30|10|5)\s*[-–]\s*(?:70|35|40|20|15)\s*%/gi, 'mejoras reportadas');
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
  const liverWarning = 'Reportes raros de lesion hepatica/hepatotoxicidad han sido descritos para Centella asiatica; evitar en enfermedad hepatica activa y suspender ante ictericia, orina oscura o sintomas hepaticos.';
  const existingSafetyText = normalizeClinicalText(JSON.stringify(calibratedSafety));

  if (!existingSafetyText.includes('hepatotoxic') && !existingSafetyText.includes('lesion hepatica')) {
    calibratedSafety.contraindications = [
      ...(Array.isArray(calibratedSafety.contraindications) ? calibratedSafety.contraindications : []),
      liverWarning,
    ];
  }

  if (typeof calibratedSafety.longTermSafety === 'string') {
    calibratedSafety.longTermSafety = calibratedSafety.longTermSafety
      .replace(/No reportes de hepatotoxicidad[^.]*\./gi, 'Existen reportes raros de lesion hepatica/hepatotoxicidad; el uso prolongado debe ser prudente, especialmente en personas con enfermedad hepatica.')
      .replace(/sin reportes de toxicidad hep[aá]tica[^.]*\./gi, 'Existen reportes raros de lesion hepatica/hepatotoxicidad; el uso prolongado debe ser prudente, especialmente en personas con enfermedad hepatica.');
  } else {
    calibratedSafety.longTermSafety = liverWarning;
  }

  calibratedSafety.notes = `${calibratedSafety.notes || ''} ${liverWarning}`.trim();
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
    item.notes = `${sanitizeCentellaClaimText(item.notes) || ''} Interpretar como apoyo estudiado para sintomas, no como sustituto de tratamiento medico.`.trim();
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

export function calibratePortalRecommendation<T>(recommendation: T, category?: string): T {
  return calibrateLionsManeRecommendation(
    calibrateCentellaRecommendation(recommendation, category),
    category
  );
}
