export type IHerbAffiliateMatch = {
  canonicalName: string;
  searchQuery: string;
};

const IHERB_MATCHES: Array<IHerbAffiliateMatch & { aliases: string[] }> = [
  { canonicalName: 'Magnesium', searchQuery: 'magnesium', aliases: ['magnesium', 'magnesio', 'magnesium glycinate', 'magnesium citrate'] },
  { canonicalName: 'Vitamin B Complex', searchQuery: 'vitamin b complex', aliases: ['vitamin b complex', 'b complex', 'complejo b', 'vitamina b complex'] },
  { canonicalName: 'Vitamin D', searchQuery: 'vitamin d', aliases: ['vitamin d', 'vitamina d', 'cholecalciferol', 'colecalciferol'] },
  { canonicalName: 'Omega-3', searchQuery: 'omega 3', aliases: ['omega-3', 'omega 3', 'fish oil', 'aceite de pescado', 'epa', 'dha'] },
  { canonicalName: 'Creatine', searchQuery: 'creatine monohydrate', aliases: ['creatine', 'creatina', 'creatine monohydrate', 'creatina monohidratada'] },
  { canonicalName: 'Collagen', searchQuery: 'collagen peptides', aliases: ['collagen', 'colageno', 'colágeno', 'collagen peptides'] },
  { canonicalName: 'Whey Protein', searchQuery: 'whey protein', aliases: ['whey protein', 'proteina whey', 'proteína whey', 'proteina de suero', 'proteína de suero'] },
  { canonicalName: 'Ashwagandha', searchQuery: 'ashwagandha', aliases: ['ashwagandha', 'withania somnifera'] },
  { canonicalName: 'Bacopa Monnieri', searchQuery: 'bacopa monnieri', aliases: ['bacopa', 'bacopa monnieri', 'brahmi'] },
  { canonicalName: 'Probiotics', searchQuery: 'probiotics', aliases: ['probiotics', 'probioticos', 'probióticos', 'lactobacillus', 'bifidobacterium'] },
  { canonicalName: 'Vitamin C', searchQuery: 'vitamin c', aliases: ['vitamin c', 'vitamina c', 'ascorbic acid', 'acido ascorbico', 'ácido ascórbico'] },
  { canonicalName: 'Zinc', searchQuery: 'zinc', aliases: ['zinc', 'zinc picolinate', 'zinc gluconate'] },
  { canonicalName: 'Folic Acid', searchQuery: 'folate', aliases: ['folic acid', 'folate', 'acido folico', 'ácido fólico', 'folato'] },
  { canonicalName: 'Melatonin', searchQuery: 'melatonin', aliases: ['melatonin', 'melatonina'] },
  { canonicalName: 'Caffeine', searchQuery: 'caffeine', aliases: ['caffeine', 'cafeina', 'cafeína'] },
  { canonicalName: 'Berberine', searchQuery: 'berberine', aliases: ['berberine', 'berberina'] },
  { canonicalName: 'Turmeric Curcumin', searchQuery: 'turmeric curcumin', aliases: ['turmeric', 'curcumin', 'curcuma', 'cúrcuma', 'curcumina'] },
  { canonicalName: 'CoQ10', searchQuery: 'coq10', aliases: ['coq10', 'coenzyme q10', 'coenzima q10', 'ubiquinone'] },
  { canonicalName: 'Iron', searchQuery: 'iron supplement', aliases: ['iron', 'hierro', 'ferrous bisglycinate', 'bisglicinato de hierro'] },
  { canonicalName: 'Calcium', searchQuery: 'calcium supplement', aliases: ['calcium', 'calcio', 'calcium citrate'] },
  { canonicalName: 'Vitamin B12', searchQuery: 'vitamin b12', aliases: ['vitamin b12', 'vitamina b12', 'methylcobalamin', 'metilcobalamina'] },
  { canonicalName: 'L-Theanine', searchQuery: 'l-theanine', aliases: ['l-theanine', 'theanine', 'teanina', 'l teanina'] },
  { canonicalName: 'Psyllium', searchQuery: 'psyllium husk', aliases: ['psyllium', 'psyllium husk', 'psilio'] },
  { canonicalName: 'Aloe Vera', searchQuery: 'aloe vera', aliases: ['aloe vera', 'sabila', 'sábila', 'aloe barbadensis'] },
  { canonicalName: "Lion's Mane", searchQuery: "lion's mane", aliases: ['lion mane', "lion's mane", 'melena de leon', 'melena de león', 'hericium erinaceus'] },
  { canonicalName: 'Milk Thistle', searchQuery: 'milk thistle', aliases: ['milk thistle', 'cardo mariano', 'silybum marianum'] },
  { canonicalName: 'Valerian', searchQuery: 'valerian', aliases: ['valerian', 'valeriana', 'valeriana officinalis'] },
  { canonicalName: 'Panax Ginseng', searchQuery: 'panax ginseng', aliases: ['panax ginseng', 'korean ginseng', 'ginseng coreano'] },
  { canonicalName: 'Ginkgo Biloba', searchQuery: 'ginkgo biloba', aliases: ['ginkgo', 'ginkgo biloba'] },
  { canonicalName: 'Resveratrol', searchQuery: 'resveratrol', aliases: ['resveratrol'] },
  { canonicalName: 'Tongkat Ali', searchQuery: 'tongkat ali', aliases: ['tongkat ali', 'eurycoma longifolia'] },
  { canonicalName: 'Fadogia Agrestis', searchQuery: 'fadogia agrestis', aliases: ['fadogia', 'fadogia agrestis'] },
  { canonicalName: 'Sea Moss', searchQuery: 'sea moss', aliases: ['sea moss', 'musgo marino', 'irish moss', 'chondrus crispus'] },
  { canonicalName: 'Shilajit', searchQuery: 'shilajit', aliases: ['shilajit'] },
  { canonicalName: 'Black Seed Oil', searchQuery: 'black seed oil', aliases: ['black seed oil', 'aceite de comino negro', 'nigella sativa'] },
];

function normalizeForMatch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function hasClearAliasMatch(candidate: string, alias: string) {
  const normalizedCandidate = normalizeForMatch(candidate);
  const normalizedAlias = normalizeForMatch(alias);

  if (!normalizedCandidate || !normalizedAlias) {
    return false;
  }

  return normalizedCandidate === normalizedAlias
    || normalizedCandidate.includes(normalizedAlias)
    || (normalizedCandidate.length >= 4 && normalizedAlias.includes(normalizedCandidate));
}

export function findIHerbAffiliateMatch(candidates: Array<string | null | undefined>): IHerbAffiliateMatch | null {
  const normalizedCandidates = candidates.filter((candidate): candidate is string => Boolean(candidate?.trim()));

  for (const candidate of normalizedCandidates) {
    const match = IHERB_MATCHES.find(item => item.aliases.some(alias => hasClearAliasMatch(candidate, alias)));

    if (match) {
      return {
        canonicalName: match.canonicalName,
        searchQuery: match.searchQuery,
      };
    }
  }

  return null;
}

export function buildIHerbSearchUrl(searchQuery: string) {
  const params = new URLSearchParams({ kw: searchQuery });
  return `https://mx.iherb.com/search?${params.toString()}`;
}

export function buildIHerbAffiliateUrl(searchQuery: string, affiliateTemplate?: string) {
  const directUrl = buildIHerbSearchUrl(searchQuery);
  const template = affiliateTemplate?.trim();

  if (!template) {
    return directUrl;
  }

  return template
    .replaceAll('{url}', encodeURIComponent(directUrl))
    .replaceAll('{query}', encodeURIComponent(searchQuery));
}
