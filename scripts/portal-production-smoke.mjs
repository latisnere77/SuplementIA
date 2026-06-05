const base = (process.env.PRODUCTION_BASE_URL || 'https://suplementai.com').replace(/\/$/, '');

const cases = [
  { query: 'Magnesium', expected: ['completed'] },
  { query: 'Creatine', expected: ['completed'] },
  { query: 'Vitamin D', expected: ['completed'] },
  { query: 'Melatonin', expected: ['completed'] },
  { query: 'Psyllium', expected: ['completed'] },
  { query: 'Ashwagandha', expected: ['completed'] },
  { query: 'Cannabis sativa', expected: ['processing', 'completed'] },
  { query: 'Centella asiatica', expected: ['completed'] },
  { query: 'gotu kola', expected: ['completed'] },
  { query: 'Turmeric', expected: ['processing', 'completed'] },
  { query: 'Berberine', expected: ['processing', 'completed'] },
  { query: 'Green tea extract', expected: ['insufficient_data'] },
  { query: 'Garcinia Cambogia', expected: ['insufficient_data'] },
  { query: 'hoja de aguacate', expected: ['insufficient_data'] },
  { query: 'Piper auritum', expected: ['insufficient_data'] },
  { query: 'Fadogia agrestis', expected: ['insufficient_data'] },
];

const unsafeClaimPattern = /sirve para|treats|cures|beneficio comprobado|clinical benefit/i;
const centellaQueries = new Set(['centella asiatica', 'gotu kola']);
const unsafeCentellaHepatotoxicityReassurancePattern =
  /\b(?:no reportes|no hay reportes|no existen reportes|sin reportes)\s+de\s+hepatotoxicidad\b/i;
const prudentCentellaLiverWarningPattern =
  /reportes raros de (?:lesi[oó]n hep[aá]tica|lesion hepatica)|hepatotoxicidad/i;

let failures = 0;

for (const c of cases) {
  const started = Date.now();
  const res = await fetch(`${base}/api/portal/quiz`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ category: c.query, searchIntent: 'supplement' }),
  });
  const text = await res.text();
  let body;

  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 200) };
  }

  const state = body.status || body.error || (body.success ? 'completed' : 'unknown');
  const fallback =
    body.metadata?.fallback ||
    body.fallback ||
    body.source ||
    body.recommendation?.metadata?.fallback ||
    body.recommendation?.source ||
    (body.error === 'insufficient_data' ? 'insufficient_data' : undefined) ||
    'none';
  const worksFor =
    body.recommendation?.supplement?.worksFor ||
    body.recommendation?.worksFor ||
    body.recommendation?.works_for ||
    body.supplement?.worksFor ||
    [];
  const products =
    body.recommendation?.products ||
    body.products ||
    [];
  const hasOldHybridSearchError =
    text.includes('Hybrid Search Failed') || text.includes('hybrid_search_debug_fail');
  const isCentellaCanary = centellaQueries.has(c.query.toLowerCase());
  const hasUnsafeCentellaHepatotoxicityReassurance =
    isCentellaCanary && unsafeCentellaHepatotoxicityReassurancePattern.test(text);
  const hasPrudentCentellaLiverWarning =
    isCentellaCanary && prudentCentellaLiverWarningPattern.test(text);
  const expectsInsufficientData = c.expected.includes('insufficient_data');
  const ok =
    c.expected.includes(state) &&
    res.status < 500 &&
    !unsafeClaimPattern.test(text) &&
    !hasOldHybridSearchError &&
    !hasUnsafeCentellaHepatotoxicityReassurance &&
    (!isCentellaCanary || hasPrudentCentellaLiverWarning) &&
    (!expectsInsufficientData || !Array.isArray(products) || products.length === 0);

  if (!ok) failures += 1;

  console.log(JSON.stringify({
    query: c.query,
    http: res.status,
    state,
    success: body.success,
    fallback,
    worksForCount: Array.isArray(worksFor) ? worksFor.length : 0,
    productsCount: Array.isArray(products) ? products.length : 0,
    error: body.error,
    oldHybridSearchError: hasOldHybridSearchError,
    unsafeCentellaHepatotoxicityReassurance: hasUnsafeCentellaHepatotoxicityReassurance,
    prudentCentellaLiverWarning: isCentellaCanary ? hasPrudentCentellaLiverWarning : undefined,
    durationMs: Date.now() - started,
    ok,
  }));
}

console.log(JSON.stringify({ base, failures }));

if (failures) process.exit(1);
