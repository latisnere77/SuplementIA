const base = (process.env.PRODUCTION_BASE_URL || 'https://suplementai.com').replace(/\/$/, '');

const cases = [
  { query: 'Magnesium', expected: ['completed'] },
  { query: 'Creatine', expected: ['completed'] },
  { query: 'Vitamin D', expected: ['completed'] },
  { query: 'Melatonin', expected: ['completed'] },
  { query: 'Psyllium', expected: ['completed'] },
  { query: 'Turmeric', expected: ['processing', 'completed'] },
  { query: 'Berberine', expected: ['processing', 'completed'] },
  { query: 'Green tea extract', expected: ['processing', 'completed'] },
  { query: 'Piper auritum', expected: ['insufficient_data'] },
  { query: 'Fadogia agrestis', expected: ['insufficient_data'] },
];

const unsafeClaimPattern = /sirve para|treats|cures|beneficio comprobado|clinical benefit/i;

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
    'none';
  const hasOldHybridSearchError =
    text.includes('Hybrid Search Failed') || text.includes('hybrid_search_debug_fail');
  const ok =
    c.expected.includes(state) &&
    res.status < 500 &&
    !unsafeClaimPattern.test(text) &&
    !hasOldHybridSearchError;

  if (!ok) failures += 1;

  console.log(JSON.stringify({
    query: c.query,
    http: res.status,
    state,
    success: body.success,
    fallback,
    worksForCount: body.recommendation?.worksFor?.length ?? body.recommendation?.works_for?.length ?? 0,
    error: body.error,
    oldHybridSearchError: hasOldHybridSearchError,
    durationMs: Date.now() - started,
    ok,
  }));
}

console.log(JSON.stringify({ base, failures }));

if (failures) process.exit(1);
