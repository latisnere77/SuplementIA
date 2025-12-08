
/**
 * MeSH (Medical Subject Headings) Map
 * 
 * Maps common supplement names to their official PubMed MeSH terms.
 * This provides more accurate and comprehensive search results than keyword searching.
 * 
 * MeSH terms are the controlled vocabulary used by the National Library of Medicine (NLM)
 * to index articles for PubMed.
 * 
 * Format:
 *   'common name': '"MeSH Term"[MeSH] OR "Alternative Term"[tiab]'
 */
export const MESH_MAP: Record<string, string> = {
  // Vitamins
  'biotin': '"biotin"[MeSH] OR "vitamin b7"[tiab]',
  'vitamin c': '"ascorbic acid"[MeSH]',
  'vitamin d': '"vitamin d"[MeSH] OR "cholecalciferol"[MeSH]',
  'vitamin b12': '"vitamin b 12"[MeSH] OR "cyanocobalamin"[MeSH]',
  'folate': '"folic acid"[MeSH]',
  'vitamin a': '"vitamin a"[MeSH] OR "retinol"[MeSH]',
  'vitamin e': '"vitamin e"[MeSH] OR "tocopherols"[MeSH]',
  'vitamin k': '"vitamin k"[MeSH]',

  // Minerals
  'magnesium': '"magnesium"[MeSH]',
  'zinc': '"zinc"[MeSH]',
  'iron': '"iron"[MeSH]',
  'calcium': '"calcium"[MeSH]',
  'selenium': '"selenium"[MeSH]',
  'copper': '"copper"[MeSH]',
  'iodine': '"iodine"[MeSH]',

  // Herbs
  'ashwagandha': '"Withania"[MeSH]',
  'turmeric': '"curcumin"[MeSH]',
  'ginseng': '"Panax"[MeSH]',
  'echinacea': '"Echinacea"[MeSH]',
  'milk thistle': '"Silybum"[MeSH]',
  'ginkgo biloba': '"ginkgo biloba"[MeSH]',
  'saw palmetto': '"Serenoa"[MeSH]',
  'rosemary': '"rosmarinus"[tiab] OR "rosemary"[tiab]',
  'romero': '"rosmarinus"[tiab] OR "rosemary"[tiab] OR "romero"[tiab]',

  // Amino Acids & Compounds
  'creatine': '"creatine"[MeSH]',
  'l-carnitine': '"carnitine"[MeSH]',
  'acetyl-l-carnitine': '"acetylcarnitine"[MeSH]',
  'n-acetyl cysteine': '"acetylcysteine"[MeSH]',
  'nac': '"acetylcysteine"[MeSH]',
  'coenzyme q10': '"ubiquinone"[MeSH]',
  'coq10': '"ubiquinone"[MeSH]',
  'melatonin': '"melatonin"[MeSH]',

  // Fatty Acids
  'omega-3': '"fatty acids, omega-3"[MeSH]',
  'fish oil': '"fish oils"[MeSH]',
};
