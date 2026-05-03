import { SUPPLEMENTS_DATABASE, type SupplementEntry } from './supplements-database';

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function baseId(entry: SupplementEntry): string {
  return entry.id.replace(/-(es|en)$/, '');
}

function matchesEntry(entry: SupplementEntry, normalizedQuery: string): boolean {
  return [
    entry.name,
    entry.id,
    ...entry.aliases,
  ].some(value => normalizeName(value) === normalizedQuery);
}

export function resolveToEnglishName(query: string): string {
  const normalizedQuery = normalizeName(query);
  if (!normalizedQuery) return query;

  const directEnglishMatch = SUPPLEMENTS_DATABASE.find(entry =>
    entry.language === 'en' && matchesEntry(entry, normalizedQuery)
  );
  if (directEnglishMatch) {
    return directEnglishMatch.name;
  }

  const matchedEntry = SUPPLEMENTS_DATABASE.find(entry => matchesEntry(entry, normalizedQuery));
  if (!matchedEntry) {
    return query;
  }

  const englishEntry = SUPPLEMENTS_DATABASE.find(entry =>
    entry.language === 'en' && baseId(entry) === baseId(matchedEntry)
  );

  return englishEntry?.name || matchedEntry.name;
}
