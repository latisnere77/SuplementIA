import en from './en.json';
import es from './es.json';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function getPath(source: JsonValue, path: string[]): JsonValue | undefined {
  return path.reduce<JsonValue | undefined>((current, key) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    return current[key];
  }, source);
}

function collectStrings(source: JsonValue): string[] {
  if (typeof source === 'string') {
    return [source];
  }

  if (Array.isArray(source)) {
    return source.flatMap(collectStrings);
  }

  if (source && typeof source === 'object') {
    return Object.values(source).flatMap(collectStrings);
  }

  return [];
}

function collectLeafPaths(source: JsonValue, prefix: string[] = []): string[] {
  if (typeof source === 'string' || typeof source === 'number' || typeof source === 'boolean' || source === null) {
    return [prefix.join('.')];
  }

  if (Array.isArray(source)) {
    return source.flatMap((item, index) => collectLeafPaths(item, [...prefix, String(index)]));
  }

  if (typeof source === 'object') {
    return Object.entries(source).flatMap(([key, value]) => collectLeafPaths(value, [...prefix, key]));
  }

  return [];
}

describe('clinical safety copy translations', () => {
  const insufficientDataPath = ['portal', 'insufficientData'];
  const errorStatePath = ['portal', 'errorState'];
  const enInsufficientData = getPath(en, insufficientDataPath);
  const esInsufficientData = getPath(es, insufficientDataPath);
  const enErrorState = getPath(en, errorStatePath);
  const esErrorState = getPath(es, errorStatePath);

  it('keeps portal error translation keys aligned in English and Spanish', () => {
    expect(enInsufficientData).toBeDefined();
    expect(esInsufficientData).toBeDefined();
    expect(enErrorState).toBeDefined();
    expect(esErrorState).toBeDefined();

    expect(collectLeafPaths(enInsufficientData!)).toEqual(collectLeafPaths(esInsufficientData!));
    expect(collectLeafPaths(enErrorState!)).toEqual(collectLeafPaths(esErrorState!));
  });

  it('does not reintroduce prohibited clinical-claim wording in insufficient_data copy', () => {
    const prohibited = [
      /\bsirve para\b/i,
      /\btreats\b/i,
      /\bcures\b/i,
      /\bclinical benefit\b/i,
      /\bbeneficio comprobado\b/i,
      /\brecomendar uso\b/i,
      /\brecommend use\b/i,
    ];

    for (const localeCopy of [enInsufficientData, esInsufficientData]) {
      const combinedCopy = collectStrings(localeCopy!).join('\n');

      for (const pattern of prohibited) {
        expect(combinedCopy).not.toMatch(pattern);
      }
    }
  });

  it('keeps suggested actions exploratory instead of directive', () => {
    const enCopy = collectStrings(enInsufficientData!).join('\n');
    const esCopy = collectStrings(esInsufficientData!).join('\n');

    expect(enCopy).toMatch(/exploratory searches/i);
    expect(enCopy).toMatch(/do not imply/i);
    expect(enCopy).toMatch(/only as a search/i);

    expect(esCopy).toMatch(/búsquedas exploratorias/i);
    expect(esCopy).toMatch(/No implican/i);
    expect(esCopy).toMatch(/solo como búsqueda/i);
  });
});
