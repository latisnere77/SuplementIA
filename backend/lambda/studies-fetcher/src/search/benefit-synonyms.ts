/**
 * Map common benefit queries to scientific synonyms for better search results
 */
export const BENEFIT_SYNONYMS: Record<string, string[]> = {
  // Muscle & Strength
  'muscle growth': ['muscle growth', 'muscle mass', 'hypertrophy', 'muscle strength', 'lean mass', 'muscle size'],
  'muscle mass': ['muscle mass', 'lean mass', 'muscle growth', 'hypertrophy'],
  'strength': ['strength', 'muscle strength', 'power output', 'force production'],
  'hypertrophy': ['hypertrophy', 'muscle growth', 'muscle mass', 'muscle size'],
  
  // Hair & Skin
  'hair growth': ['hair growth', 'hair loss', 'alopecia', 'hair density', 'hair regrowth'],
  'hair loss': ['hair loss', 'alopecia', 'hair thinning', 'baldness'],
  'skin': ['skin', 'dermal', 'cutaneous', 'epidermal'],
  
  // Cognitive
  'memory': ['memory', 'cognitive function', 'cognition', 'recall', 'recognition'],
  'focus': ['focus', 'attention', 'concentration', 'cognitive performance'],
  'brain': ['brain', 'cognitive', 'neurological', 'neural', 'cerebral'],
  
  // Energy & Performance
  'energy': ['energy', 'fatigue', 'tiredness', 'endurance', 'stamina'],
  'performance': ['performance', 'exercise', 'physical performance', 'athletic'],
  'endurance': ['endurance', 'stamina', 'aerobic capacity', 'VO2 max'],
  
  // Mood & Sleep
  'anxiety': ['anxiety', 'anxiolytic', 'stress', 'nervousness'],
  'depression': ['depression', 'depressive', 'mood', 'antidepressant'],
  'sleep': ['sleep', 'insomnia', 'sleep quality', 'sleep duration'],
  
  // Metabolic
  'weight loss': ['weight loss', 'fat loss', 'body composition', 'adiposity'],
  'metabolism': ['metabolism', 'metabolic rate', 'energy expenditure'],
  'blood sugar': ['blood sugar', 'glucose', 'glycemic', 'insulin'],
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
