export interface BotanicalIdentity {
  canonicalName: string;
  scientificSynonyms: string[];
  commonNames: string[];
  plantParts: string[];
  preparationTerms: string[];
  clinicalContextTerms: string[];
  mechanisticTerms: string[];
}

export const BOTANICAL_IDENTITIES: BotanicalIdentity[] = [
  {
    canonicalName: 'Mimosa tenuiflora',
    scientificSynonyms: ['Mimosa hostilis'],
    commonNames: ['tepezcohuite', 'tepescohuite'],
    plantParts: ['bark', 'cortex', 'root bark'],
    preparationTerms: ['extract', 'hydrogel', 'MTC-2G'],
    clinicalContextTerms: ['wound healing', 'venous leg ulcer', 'burns', 'dermatitis'],
    mechanisticTerms: ['tannins', 'fibroblast', 'antimicrobial', 'saponins'],
  },
];

function normalizeIdentityKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function identityTerms(identity: BotanicalIdentity): string[] {
  return [
    identity.canonicalName,
    ...identity.scientificSynonyms,
    ...identity.commonNames,
  ];
}

function uniqueTerms(terms: string[]): string[] {
  const seen = new Set<string>();
  return terms.filter((term) => {
    const key = normalizeIdentityKey(term);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function findBotanicalIdentity(term: string): BotanicalIdentity | null {
  const normalized = normalizeIdentityKey(term);
  if (!normalized) {
    return null;
  }

  return BOTANICAL_IDENTITIES.find((identity) =>
    identityTerms(identity).some((candidate) => normalizeIdentityKey(candidate) === normalized)
  ) || null;
}

export function canonicalizeBotanicalTerm(term: string): string | null {
  return findBotanicalIdentity(term)?.canonicalName || null;
}

export function getBotanicalPubMedQueryPhrases(term: string): string[] {
  const identity = findBotanicalIdentity(term);
  if (!identity) {
    return [];
  }

  const coreTerms = identityTerms(identity);
  const plantPartTerms = [
    ...identity.plantParts.flatMap((part) => [
      `${identity.canonicalName} ${part}`,
      ...identity.scientificSynonyms.map((synonym) => `${synonym} ${part}`),
    ]),
    'Mimosae tenuiflorae cortex',
  ];
  const preparationTerms = identity.preparationTerms.flatMap((preparation) => [
    `${identity.canonicalName} ${preparation}`,
    ...identity.scientificSynonyms.map((synonym) => `${synonym} ${preparation}`),
    ...identity.commonNames.map((commonName) => `${commonName} ${preparation}`),
  ]);

  return uniqueTerms([
    term.trim(),
    ...coreTerms,
    ...plantPartTerms,
    ...preparationTerms,
  ]);
}
