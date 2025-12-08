/**
 * Supplement Knowledge Base
 * Extensible system for managing supplement information and preventing query confusion
 */

export interface SupplementInfo {
  commonNames: string[];
  scientificNames: string[];
  confusionRisk?: string[];
  aliases?: string[];
}

/**
 * Core supplement knowledge base
 * This can be extended dynamically or loaded from a database
 */
export const SUPPLEMENT_KNOWLEDGE: Record<string, SupplementInfo> = {
  // Adaptogens - often confused with each other
  'ginger': {
    commonNames: ['ginger', 'jengibre'],
    scientificNames: ['zingiber officinale', 'zingiber'],
    confusionRisk: ['ginseng', 'panax'],
  },
  'ginseng': {
    commonNames: ['ginseng', 'asian ginseng', 'korean ginseng'],
    scientificNames: ['panax ginseng', 'panax'],
    confusionRisk: ['ginger', 'zingiber', 'eleuthero'],
  },
  'ashwagandha': {
    commonNames: ['ashwagandha', 'indian ginseng', 'winter cherry'],
    scientificNames: ['withania somnifera'],
    confusionRisk: ['rhodiola', 'ginseng'],
  },
  'rhodiola': {
    commonNames: ['rhodiola', 'golden root', 'arctic root', 'rose root'],
    scientificNames: ['rhodiola rosea'],
    confusionRisk: ['ashwagandha'],
  },
  'eleuthero': {
    commonNames: ['eleuthero', 'siberian ginseng'],
    scientificNames: ['eleutherococcus senticosus'],
    confusionRisk: ['ginseng', 'panax'],
  },

  // Vitamins - prevent confusion between similar names
  'vitamin d': {
    commonNames: ['vitamin d', 'vitamin d3', 'cholecalciferol'],
    scientificNames: ['cholecalciferol', 'ergocalciferol'],
    confusionRisk: ['vitamin d2'],
  },
  'vitamin b12': {
    commonNames: ['vitamin b12', 'cobalamin', 'b12'],
    scientificNames: ['cyanocobalamin', 'methylcobalamin'],
    confusionRisk: ['vitamin b6', 'vitamin b1'],
  },
  'vitamin b6': {
    commonNames: ['vitamin b6', 'pyridoxine', 'b6'],
    scientificNames: ['pyridoxine', 'pyridoxal'],
    confusionRisk: ['vitamin b12', 'vitamin b1'],
  },

  // Minerals - prevent confusion
  'magnesium': {
    commonNames: ['magnesium', 'magnesio'],
    scientificNames: ['magnesium citrate', 'magnesium glycinate', 'magnesium oxide'],
    confusionRisk: ['manganese'],
  },
  'manganese': {
    commonNames: ['manganese', 'manganeso'],
    scientificNames: ['manganese sulfate', 'manganese gluconate'],
    confusionRisk: ['magnesium'],
  },

  // Amino acids - prevent confusion
  'l-carnitine': {
    commonNames: ['l-carnitine', 'carnitine', 'levocarnitine'],
    scientificNames: ['levocarnitine'],
    confusionRisk: ['creatine', 'carnosine'],
  },
  'creatine': {
    commonNames: ['creatine', 'creatine monohydrate'],
    scientificNames: ['creatine monohydrate'],
    confusionRisk: ['l-carnitine', 'creatinine'],
  },
  'carnosine': {
    commonNames: ['carnosine', 'beta-alanyl-l-histidine'],
    scientificNames: ['beta-alanyl-l-histidine'],
    confusionRisk: ['l-carnitine'],
  },

  // Probiotics - prevent confusion
  'lactobacillus': {
    commonNames: ['lactobacillus', 'l. acidophilus'],
    scientificNames: ['lactobacillus acidophilus', 'lactobacillus rhamnosus'],
    confusionRisk: ['bifidobacterium'],
  },
  'bifidobacterium': {
    commonNames: ['bifidobacterium', 'b. bifidum'],
    scientificNames: ['bifidobacterium bifidum', 'bifidobacterium longum'],
    confusionRisk: ['lactobacillus'],
  },

  // Omega fatty acids
  'omega-3': {
    commonNames: ['omega-3', 'omega 3', 'fish oil', 'epa', 'dha'],
    scientificNames: ['eicosapentaenoic acid', 'docosahexaenoic acid'],
    confusionRisk: ['omega-6', 'omega-9'],
  },
  'omega-6': {
    commonNames: ['omega-6', 'omega 6', 'linoleic acid'],
    scientificNames: ['linoleic acid', 'arachidonic acid'],
    confusionRisk: ['omega-3', 'omega-9'],
  },

  // Herbs and botanicals
  'rosemary': {
    commonNames: ['rosemary', 'romero'],
    scientificNames: ['rosmarinus officinalis', 'rosmarinus', 'salvia rosmarinus'],
    confusionRisk: [],
  },
};

/**
 * Add new supplement to knowledge base dynamically
 */
export function addSupplementKnowledge(
  key: string,
  info: SupplementInfo
): void {
  SUPPLEMENT_KNOWLEDGE[key] = info;
}

/**
 * Find supplement info by any name (common or scientific)
 */
export function findSupplementInfo(searchTerm: string): SupplementInfo | null {
  const normalized = searchTerm.toLowerCase().trim();

  for (const info of Object.values(SUPPLEMENT_KNOWLEDGE)) {
    const allNames = [
      ...info.commonNames,
      ...info.scientificNames,
      ...(info.aliases || []),
    ].map(n => n.toLowerCase());

    if (allNames.some(name => normalized.includes(name) || name.includes(normalized))) {
      return info;
    }
  }

  return null;
}

/**
 * Get all known names for a supplement
 */
export function getAllNames(supplementInfo: SupplementInfo): string[] {
  return [
    ...supplementInfo.commonNames,
    ...supplementInfo.scientificNames,
    ...(supplementInfo.aliases || []),
  ];
}
