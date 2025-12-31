/**
 * Map common benefit queries to scientific synonyms for better search results
 */
export const BENEFIT_SYNONYMS: Record<string, string[]> = {
  // Muscle & Strength
  'muscle growth': ['muscle growth', 'muscle mass', 'hypertrophy', 'muscle strength', 'lean mass', 'muscle size', 'muscle protein synthesis'],
  'muscle mass': ['muscle mass', 'lean mass', 'muscle growth', 'hypertrophy', 'muscle protein synthesis'],
  'strength': ['strength', 'muscle strength', 'power output', 'force production', 'maximal strength'],
  'hypertrophy': ['hypertrophy', 'muscle growth', 'muscle mass', 'muscle size', 'muscle protein synthesis'],

  // Hair & Skin
  'hair growth': ['hair growth', 'hair loss', 'alopecia', 'hair density', 'hair regrowth', 'androgenetic alopecia', 'follicular', 'telogen effluvium', 'follicle'],
  'hair loss': ['hair loss', 'alopecia', 'hair thinning', 'baldness', 'androgenetic alopecia', 'telogen effluvium'],
  'skin': ['skin', 'dermal', 'cutaneous', 'epidermal', 'skin barrier', 'collagen', 'skin elasticity'],
  'wrinkles': ['wrinkles', 'aging', 'anti-aging', 'collagen', 'elastin', 'skin aging'],

  // Cognitive
  'memory': ['memory', 'cognitive function', 'cognition', 'recall', 'recognition', 'working memory', 'episodic memory', 'neurocognitive', 'neuroplasticity'],
  'focus': ['focus', 'attention', 'concentration', 'cognitive performance', 'executive function'],
  'brain': ['brain', 'cognitive', 'neurological', 'neural', 'cerebral', 'neuroprotection', 'neurogenesis'],

  // Energy & Performance
  'energy': ['energy', 'fatigue', 'tiredness', 'endurance', 'stamina', 'ATP production', 'mitochondrial function', 'chronic fatigue syndrome'],
  'performance': ['performance', 'exercise', 'physical performance', 'athletic', 'sports performance'],
  'endurance': ['endurance', 'stamina', 'aerobic capacity', 'VO2 max', 'anaerobic performance'],

  // Mood & Sleep
  'anxiety': ['anxiety', 'anxiolytic', 'stress', 'nervousness', 'cortisol', 'HPA axis'],
  'depression': ['depression', 'depressive', 'mood', 'antidepressant', 'mood disorder'],
  'stress': ['stress', 'anxiety', 'cortisol', 'HPA axis', 'chronic stress', 'oxidative stress'],
  'sleep': ['sleep', 'insomnia', 'sleep quality', 'sleep duration', 'circadian rhythm', 'sleep architecture', 'REM sleep', 'sleep latency'],

  // Joint & Bone Health
  'joints': ['joints', 'joint pain', 'arthritis', 'osteoarthritis', 'joint health', 'cartilage', 'joint mobility', 'inflammation'],
  'bone': ['bone', 'bone health', 'osteoporosis', 'bone density', 'bone strength', 'mineral density'],

  // Immunity
  'immunity': ['immunity', 'immune function', 'immune system', 'immunomodulation', 'innate immunity', 'adaptive immunity'],
  'immune': ['immune', 'immunity', 'immune function', 'immunomodulation', 'inflammatory response'],

  // Digestion & Gut
  'digestion': ['digestion', 'digestive health', 'gut health', 'microbiome', 'probiotics', 'gastrointestinal', 'intestinal health'],
  'gut': ['gut', 'gut health', 'microbiome', 'intestinal', 'gastrointestinal', 'dysbiosis'],

  // Cardiovascular
  'cardiovascular': ['cardiovascular', 'heart health', 'blood pressure', 'hypertension', 'cholesterol', 'lipid profile', 'vascular function'],
  'heart': ['heart', 'cardiovascular', 'heart health', 'cardiac function', 'myocardial'],

  // Metabolic
  'weight loss': ['weight loss', 'fat loss', 'body composition', 'adiposity', 'obesity', 'weight management'],
  'metabolism': ['metabolism', 'metabolic rate', 'energy expenditure', 'thermogenesis', 'metabolic health'],
  'blood sugar': ['blood sugar', 'glucose', 'glycemic', 'insulin', 'diabetes', 'glucose control', 'insulin resistance'],
};

/**
 * Expand a benefit query to include scientific synonyms
 */
export function expandBenefitQuery(benefitQuery: string): string {
  const lowerQuery = benefitQuery.toLowerCase().trim();
  
  // Check if we have synonyms for this benefit
  if (BENEFIT_SYNONYMS[lowerQuery]) {
    const synonyms = BENEFIT_SYNONYMS[lowerQuery];
    // Create OR query with all synonyms
    return synonyms.map(term => `"${term}"`).join(' OR ');
  }
  
  // No synonyms found, return original query
  return `"${benefitQuery}"`;
}
