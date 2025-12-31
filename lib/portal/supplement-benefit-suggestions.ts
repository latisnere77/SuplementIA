/**
 * Supplement → Benefit Suggestions
 * Automatically suggests relevant benefits for specific supplements
 *
 * Purpose: When user searches for "romero", automatically search for "hair growth" benefits
 * This provides more targeted, relevant results based on well-known supplement uses
 */

export interface BenefitSuggestion {
  /** English term for scientific search */
  benefit: string;
  /** Spanish term for UI display */
  benefitEs: string;
  /** Priority (1 = highest, used for ordering) */
  priority: number;
  /** Why this benefit is suggested */
  reason: string;
}

/**
 * Map of supplement → suggested benefits
 * Key: Normalized supplement name (lowercase, English)
 * Value: Array of suggested benefits (ordered by priority)
 */
export const SUPPLEMENT_BENEFIT_SUGGESTIONS: Record<string, BenefitSuggestion[]> = {
  // ========== ROMERO / ROSEMARY ==========
  'romero': [
    {
      benefit: 'hair growth',
      benefitEs: 'crecimiento de cabello',
      priority: 1,
      reason: 'Rosemary oil is extensively studied for hair growth and alopecia treatment'
    },
    {
      benefit: 'hair loss',
      benefitEs: 'caída de cabello',
      priority: 2,
      reason: 'Clinical studies show rosemary oil prevents hair loss'
    },
    {
      benefit: 'cognitive function',
      benefitEs: 'función cognitiva',
      priority: 3,
      reason: 'Rosemary aroma linked to improved memory and focus'
    }
  ],
  'rosemary': [
    {
      benefit: 'hair growth',
      benefitEs: 'crecimiento de cabello',
      priority: 1,
      reason: 'Rosemary oil is extensively studied for hair growth and alopecia treatment'
    },
    {
      benefit: 'hair loss',
      benefitEs: 'caída de cabello',
      priority: 2,
      reason: 'Clinical studies show rosemary oil prevents hair loss'
    },
    {
      benefit: 'cognitive function',
      benefitEs: 'función cognitiva',
      priority: 3,
      reason: 'Rosemary aroma linked to improved memory and focus'
    }
  ],

  // ========== BIOTINA / BIOTIN ==========
  'biotina': [
    {
      benefit: 'hair growth',
      benefitEs: 'crecimiento de cabello',
      priority: 1,
      reason: 'Biotin deficiency is linked to hair loss; supplementation promotes hair health'
    },
    {
      benefit: 'nail health',
      benefitEs: 'salud de uñas',
      priority: 2,
      reason: 'Biotin strengthens brittle nails'
    },
    {
      benefit: 'skin health',
      benefitEs: 'salud de la piel',
      priority: 3,
      reason: 'Biotin supports skin barrier function'
    }
  ],
  'biotin': [
    {
      benefit: 'hair growth',
      benefitEs: 'crecimiento de cabello',
      priority: 1,
      reason: 'Biotin deficiency is linked to hair loss; supplementation promotes hair health'
    },
    {
      benefit: 'nail health',
      benefitEs: 'salud de uñas',
      priority: 2,
      reason: 'Biotin strengthens brittle nails'
    },
    {
      benefit: 'skin health',
      benefitEs: 'salud de la piel',
      priority: 3,
      reason: 'Biotin supports skin barrier function'
    }
  ],

  // ========== ASHWAGANDHA ==========
  'ashwagandha': [
    {
      benefit: 'stress',
      benefitEs: 'estrés',
      priority: 1,
      reason: 'Ashwagandha is an adaptogen extensively studied for stress reduction'
    },
    {
      benefit: 'anxiety',
      benefitEs: 'ansiedad',
      priority: 2,
      reason: 'Multiple RCTs show ashwagandha reduces anxiety symptoms'
    },
    {
      benefit: 'sleep',
      benefitEs: 'sueño',
      priority: 3,
      reason: 'Ashwagandha improves sleep quality and onset'
    },
    {
      benefit: 'cortisol',
      benefitEs: 'cortisol',
      priority: 4,
      reason: 'Reduces cortisol levels in stressed individuals'
    }
  ],

  // ========== COLÁGENO / COLLAGEN ==========
  'colágeno': [
    {
      benefit: 'skin hydration',
      benefitEs: 'piel hidratada',
      priority: 1,
      reason: 'Collagen supplementation improves skin elasticity and hydration'
    },
    {
      benefit: 'wrinkles',
      benefitEs: 'arrugas',
      priority: 2,
      reason: 'Clinical studies show collagen reduces wrinkles and skin aging'
    },
    {
      benefit: 'joint pain',
      benefitEs: 'dolor articular',
      priority: 3,
      reason: 'Collagen type II supports joint health and reduces pain'
    },
    {
      benefit: 'bone health',
      benefitEs: 'salud ósea',
      priority: 4,
      reason: 'Collagen is a major component of bone structure'
    }
  ],
  'colageno': [
    {
      benefit: 'skin hydration',
      benefitEs: 'piel hidratada',
      priority: 1,
      reason: 'Collagen supplementation improves skin elasticity and hydration'
    },
    {
      benefit: 'wrinkles',
      benefitEs: 'arrugas',
      priority: 2,
      reason: 'Clinical studies show collagen reduces wrinkles and skin aging'
    },
    {
      benefit: 'joint pain',
      benefitEs: 'dolor articular',
      priority: 3,
      reason: 'Collagen type II supports joint health and reduces pain'
    },
    {
      benefit: 'bone health',
      benefitEs: 'salud ósea',
      priority: 4,
      reason: 'Collagen is a major component of bone structure'
    }
  ],
  'collagen': [
    {
      benefit: 'skin hydration',
      benefitEs: 'piel hidratada',
      priority: 1,
      reason: 'Collagen supplementation improves skin elasticity and hydration'
    },
    {
      benefit: 'wrinkles',
      benefitEs: 'arrugas',
      priority: 2,
      reason: 'Clinical studies show collagen reduces wrinkles and skin aging'
    },
    {
      benefit: 'joint pain',
      benefitEs: 'dolor articular',
      priority: 3,
      reason: 'Collagen type II supports joint health and reduces pain'
    }
  ],

  // ========== OMEGA-3 ==========
  'omega-3': [
    {
      benefit: 'heart health',
      benefitEs: 'salud cardiovascular',
      priority: 1,
      reason: 'Omega-3 fatty acids reduce cardiovascular disease risk'
    },
    {
      benefit: 'cognitive function',
      benefitEs: 'función cognitiva',
      priority: 2,
      reason: 'DHA is essential for brain health and cognitive function'
    },
    {
      benefit: 'inflammation',
      benefitEs: 'inflamación',
      priority: 3,
      reason: 'Omega-3s have anti-inflammatory properties'
    },
    {
      benefit: 'depression',
      benefitEs: 'depresión',
      priority: 4,
      reason: 'EPA supplementation shows efficacy in depression treatment'
    }
  ],
  'omega 3': [
    {
      benefit: 'heart health',
      benefitEs: 'salud cardiovascular',
      priority: 1,
      reason: 'Omega-3 fatty acids reduce cardiovascular disease risk'
    },
    {
      benefit: 'cognitive function',
      benefitEs: 'función cognitiva',
      priority: 2,
      reason: 'DHA is essential for brain health and cognitive function'
    }
  ],

  // ========== MAGNESIO / MAGNESIUM ==========
  'magnesio': [
    {
      benefit: 'sleep',
      benefitEs: 'sueño',
      priority: 1,
      reason: 'Magnesium improves sleep quality and reduces insomnia'
    },
    {
      benefit: 'muscle recovery',
      benefitEs: 'recuperación muscular',
      priority: 2,
      reason: 'Magnesium reduces muscle cramps and supports recovery'
    },
    {
      benefit: 'anxiety',
      benefitEs: 'ansiedad',
      priority: 3,
      reason: 'Magnesium supplementation reduces anxiety symptoms'
    },
    {
      benefit: 'migraine',
      benefitEs: 'migraña',
      priority: 4,
      reason: 'Magnesium deficiency linked to migraines; supplementation helps prevent them'
    }
  ],
  'magnesium': [
    {
      benefit: 'sleep',
      benefitEs: 'sueño',
      priority: 1,
      reason: 'Magnesium improves sleep quality and reduces insomnia'
    },
    {
      benefit: 'muscle recovery',
      benefitEs: 'recuperación muscular',
      priority: 2,
      reason: 'Magnesium reduces muscle cramps and supports recovery'
    },
    {
      benefit: 'anxiety',
      benefitEs: 'ansiedad',
      priority: 3,
      reason: 'Magnesium supplementation reduces anxiety symptoms'
    }
  ],

  // ========== VITAMINA D / VITAMIN D ==========
  'vitamina d': [
    {
      benefit: 'immune system',
      benefitEs: 'sistema inmune',
      priority: 1,
      reason: 'Vitamin D is essential for immune function'
    },
    {
      benefit: 'bone health',
      benefitEs: 'salud ósea',
      priority: 2,
      reason: 'Vitamin D is critical for calcium absorption and bone health'
    },
    {
      benefit: 'mood',
      benefitEs: 'estado de ánimo',
      priority: 3,
      reason: 'Vitamin D deficiency linked to depression and low mood'
    },
    {
      benefit: 'muscle strength',
      benefitEs: 'fuerza muscular',
      priority: 4,
      reason: 'Vitamin D supports muscle function and strength'
    }
  ],
  'vitamin d': [
    {
      benefit: 'immune system',
      benefitEs: 'sistema inmune',
      priority: 1,
      reason: 'Vitamin D is essential for immune function'
    },
    {
      benefit: 'bone health',
      benefitEs: 'salud ósea',
      priority: 2,
      reason: 'Vitamin D is critical for calcium absorption and bone health'
    },
    {
      benefit: 'mood',
      benefitEs: 'estado de ánimo',
      priority: 3,
      reason: 'Vitamin D deficiency linked to depression and low mood'
    }
  ],

  // ========== CREATINA / CREATINE ==========
  'creatina': [
    {
      benefit: 'muscle growth',
      benefitEs: 'crecimiento muscular',
      priority: 1,
      reason: 'Creatine is one of the most studied supplements for muscle growth'
    },
    {
      benefit: 'strength',
      benefitEs: 'fuerza',
      priority: 2,
      reason: 'Creatine increases strength and power output'
    },
    {
      benefit: 'exercise performance',
      benefitEs: 'rendimiento deportivo',
      priority: 3,
      reason: 'Improves high-intensity exercise performance'
    },
    {
      benefit: 'cognitive function',
      benefitEs: 'función cognitiva',
      priority: 4,
      reason: 'Emerging research shows cognitive benefits, especially in vegetarians'
    }
  ],
  'creatine': [
    {
      benefit: 'muscle growth',
      benefitEs: 'crecimiento muscular',
      priority: 1,
      reason: 'Creatine is one of the most studied supplements for muscle growth'
    },
    {
      benefit: 'strength',
      benefitEs: 'fuerza',
      priority: 2,
      reason: 'Creatine increases strength and power output'
    },
    {
      benefit: 'exercise performance',
      benefitEs: 'rendimiento deportivo',
      priority: 3,
      reason: 'Improves high-intensity exercise performance'
    }
  ],

  // ========== ZINC ==========
  'zinc': [
    {
      benefit: 'immune system',
      benefitEs: 'sistema inmune',
      priority: 1,
      reason: 'Zinc is critical for immune cell function'
    },
    {
      benefit: 'wound healing',
      benefitEs: 'cicatrización',
      priority: 2,
      reason: 'Zinc deficiency impairs wound healing'
    },
    {
      benefit: 'acne',
      benefitEs: 'acné',
      priority: 3,
      reason: 'Zinc supplementation reduces acne severity'
    },
    {
      benefit: 'testosterone',
      benefitEs: 'testosterona',
      priority: 4,
      reason: 'Zinc supports healthy testosterone levels in deficient individuals'
    }
  ],

  // ========== MELATONINA / MELATONIN ==========
  'melatonina': [
    {
      benefit: 'sleep',
      benefitEs: 'sueño',
      priority: 1,
      reason: 'Melatonin is the primary hormone regulating sleep-wake cycles'
    },
    {
      benefit: 'insomnia',
      benefitEs: 'insomnio',
      priority: 2,
      reason: 'Reduces sleep onset latency in insomnia'
    },
    {
      benefit: 'jet lag',
      benefitEs: 'jet lag',
      priority: 3,
      reason: 'Helps adjust circadian rhythm during travel'
    }
  ],
  'melatonin': [
    {
      benefit: 'sleep',
      benefitEs: 'sueño',
      priority: 1,
      reason: 'Melatonin is the primary hormone regulating sleep-wake cycles'
    },
    {
      benefit: 'insomnia',
      benefitEs: 'insomnio',
      priority: 2,
      reason: 'Reduces sleep onset latency in insomnia'
    }
  ],

  // ========== CURCUMA / TURMERIC ==========
  'cúrcuma': [
    {
      benefit: 'inflammation',
      benefitEs: 'inflamación',
      priority: 1,
      reason: 'Curcumin has potent anti-inflammatory properties'
    },
    {
      benefit: 'joint pain',
      benefitEs: 'dolor articular',
      priority: 2,
      reason: 'Reduces pain in osteoarthritis and rheumatoid arthritis'
    },
    {
      benefit: 'antioxidant',
      benefitEs: 'antioxidante',
      priority: 3,
      reason: 'Strong antioxidant effects'
    }
  ],
  'curcuma': [
    {
      benefit: 'inflammation',
      benefitEs: 'inflamación',
      priority: 1,
      reason: 'Curcumin has potent anti-inflammatory properties'
    },
    {
      benefit: 'joint pain',
      benefitEs: 'dolor articular',
      priority: 2,
      reason: 'Reduces pain in osteoarthritis and rheumatoid arthritis'
    },
    {
      benefit: 'antioxidant',
      benefitEs: 'antioxidante',
      priority: 3,
      reason: 'Strong antioxidant effects'
    }
  ],
  'turmeric': [
    {
      benefit: 'inflammation',
      benefitEs: 'inflamación',
      priority: 1,
      reason: 'Curcumin has potent anti-inflammatory properties'
    },
    {
      benefit: 'joint pain',
      benefitEs: 'dolor articular',
      priority: 2,
      reason: 'Reduces pain in osteoarthritis and rheumatoid arthritis'
    }
  ],

  // ========== HIERRO / IRON ==========
  'hierro': [
    {
      benefit: 'fatigue',
      benefitEs: 'cansancio',
      priority: 1,
      reason: 'Iron deficiency is the leading cause of anemia and fatigue'
    },
    {
      benefit: 'energy',
      benefitEs: 'energía',
      priority: 2,
      reason: 'Iron is essential for oxygen transport and energy production'
    },
    {
      benefit: 'anemia',
      benefitEs: 'anemia',
      priority: 3,
      reason: 'Iron supplementation treats iron-deficiency anemia'
    }
  ],
  'iron': [
    {
      benefit: 'fatigue',
      benefitEs: 'cansancio',
      priority: 1,
      reason: 'Iron deficiency is the leading cause of anemia and fatigue'
    },
    {
      benefit: 'energy',
      benefitEs: 'energía',
      priority: 2,
      reason: 'Iron is essential for oxygen transport and energy production'
    }
  ],

  // ========== VITAMINA C / VITAMIN C ==========
  'vitamina c': [
    {
      benefit: 'immunity',
      benefitEs: 'inmunidad',
      priority: 1,
      reason: 'Vitamin C boosts immune function and supports antibody production'
    },
    {
      benefit: 'antioxidant',
      benefitEs: 'antioxidante',
      priority: 2,
      reason: 'Powerful antioxidant that protects cells from oxidative stress'
    },
    {
      benefit: 'skin health',
      benefitEs: 'salud de la piel',
      priority: 3,
      reason: 'Vitamin C is essential for collagen synthesis and skin health'
    }
  ],
  'vitamin c': [
    {
      benefit: 'immunity',
      benefitEs: 'inmunidad',
      priority: 1,
      reason: 'Vitamin C boosts immune function and supports antibody production'
    },
    {
      benefit: 'antioxidant',
      benefitEs: 'antioxidante',
      priority: 2,
      reason: 'Powerful antioxidant that protects cells from oxidative stress'
    },
    {
      benefit: 'skin health',
      benefitEs: 'salud de la piel',
      priority: 3,
      reason: 'Vitamin C is essential for collagen synthesis and skin health'
    }
  ],

  // ========== PROBIÓTICOS / PROBIOTICS ==========
  'probióticos': [
    {
      benefit: 'digestion',
      benefitEs: 'digestión',
      priority: 1,
      reason: 'Probiotics improve digestive health and nutrient absorption'
    },
    {
      benefit: 'gut',
      benefitEs: 'intestino',
      priority: 2,
      reason: 'Promote healthy gut microbiota and intestinal barrier function'
    },
    {
      benefit: 'immune system',
      benefitEs: 'sistema inmune',
      priority: 3,
      reason: '70% of immune function is in the gut; probiotics boost immunity'
    }
  ],
  'probioticos': [
    {
      benefit: 'digestion',
      benefitEs: 'digestión',
      priority: 1,
      reason: 'Probiotics improve digestive health and nutrient absorption'
    },
    {
      benefit: 'gut',
      benefitEs: 'intestino',
      priority: 2,
      reason: 'Promote healthy gut microbiota and intestinal barrier function'
    },
    {
      benefit: 'immune system',
      benefitEs: 'sistema inmune',
      priority: 3,
      reason: '70% of immune function is in the gut; probiotics boost immunity'
    }
  ],
  'probiotics': [
    {
      benefit: 'digestion',
      benefitEs: 'digestión',
      priority: 1,
      reason: 'Probiotics improve digestive health and nutrient absorption'
    },
    {
      benefit: 'gut',
      benefitEs: 'intestino',
      priority: 2,
      reason: 'Promote healthy gut microbiota and intestinal barrier function'
    },
    {
      benefit: 'immune system',
      benefitEs: 'sistema inmune',
      priority: 3,
      reason: '70% of immune function is in the gut; probiotics boost immunity'
    }
  ],

  // ========== CoQ10 ==========
  'coq10': [
    {
      benefit: 'heart health',
      benefitEs: 'salud cardiovascular',
      priority: 1,
      reason: 'CoQ10 is essential for heart muscle energy production'
    },
    {
      benefit: 'energy',
      benefitEs: 'energía',
      priority: 2,
      reason: 'Critical cofactor in ATP energy production in mitochondria'
    },
    {
      benefit: 'antioxidant',
      benefitEs: 'antioxidante',
      priority: 3,
      reason: 'Strong antioxidant that protects against oxidative damage'
    }
  ],
  'co-q10': [
    {
      benefit: 'heart health',
      benefitEs: 'salud cardiovascular',
      priority: 1,
      reason: 'CoQ10 is essential for heart muscle energy production'
    },
    {
      benefit: 'energy',
      benefitEs: 'energía',
      priority: 2,
      reason: 'Critical cofactor in ATP energy production in mitochondria'
    }
  ],

  // ========== GINKGO BILOBA ==========
  'ginkgo': [
    {
      benefit: 'memory',
      benefitEs: 'memoria',
      priority: 1,
      reason: 'Ginkgo biloba improves memory and cognitive performance'
    },
    {
      benefit: 'concentration',
      benefitEs: 'concentración',
      priority: 2,
      reason: 'Enhances mental focus and concentration'
    },
    {
      benefit: 'circulation',
      benefitEs: 'circulación',
      priority: 3,
      reason: 'Improves blood flow to the brain and peripheral tissues'
    }
  ],
  'ginkgo biloba': [
    {
      benefit: 'memory',
      benefitEs: 'memoria',
      priority: 1,
      reason: 'Ginkgo biloba improves memory and cognitive performance'
    },
    {
      benefit: 'concentration',
      benefitEs: 'concentración',
      priority: 2,
      reason: 'Enhances mental focus and concentration'
    },
    {
      benefit: 'circulation',
      benefitEs: 'circulación',
      priority: 3,
      reason: 'Improves blood flow to the brain and peripheral tissues'
    }
  ],

  // ========== CALCIO / CALCIUM ==========
  'calcio': [
    {
      benefit: 'bone health',
      benefitEs: 'salud ósea',
      priority: 1,
      reason: 'Calcium is the primary mineral component of bone structure'
    },
    {
      benefit: 'muscle',
      benefitEs: 'músculo',
      priority: 2,
      reason: 'Calcium is essential for muscle contraction and function'
    },
    {
      benefit: 'teeth',
      benefitEs: 'dientes',
      priority: 3,
      reason: 'Critical for dental health and tooth strength'
    }
  ],
  'calcium': [
    {
      benefit: 'bone health',
      benefitEs: 'salud ósea',
      priority: 1,
      reason: 'Calcium is the primary mineral component of bone structure'
    },
    {
      benefit: 'muscle',
      benefitEs: 'músculo',
      priority: 2,
      reason: 'Calcium is essential for muscle contraction and function'
    }
  ],
};

/**
 * Get suggested benefits for a supplement
 *
 * @param supplementName - Supplement name (normalized, lowercase)
 * @returns Array of suggested benefits, ordered by priority
 *
 * @example
 * ```typescript
 * getSuggestedBenefits("romero")
 * // Returns: [{ benefit: "hair growth", benefitEs: "crecimiento de cabello", priority: 1, ... }]
 * ```
 */
export function getSuggestedBenefits(supplementName: string): BenefitSuggestion[] {
  const normalized = supplementName.toLowerCase().trim();

  // Direct match
  if (SUPPLEMENT_BENEFIT_SUGGESTIONS[normalized]) {
    return SUPPLEMENT_BENEFIT_SUGGESTIONS[normalized];
  }

  // Partial match (e.g., "vitamin d3" matches "vitamin d")
  for (const [key, benefits] of Object.entries(SUPPLEMENT_BENEFIT_SUGGESTIONS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      console.log(`[Benefit Suggestions] Partial match: "${normalized}" → "${key}"`);
      return benefits;
    }
  }

  return [];
}

/**
 * Get the top priority suggested benefit for a supplement
 */
export function getTopSuggestedBenefit(supplementName: string): BenefitSuggestion | null {
  const suggestions = getSuggestedBenefits(supplementName);
  return suggestions.length > 0 ? suggestions[0] : null;
}

/**
 * Check if a supplement has suggested benefits
 */
export function hasSuggestedBenefits(supplementName: string): boolean {
  return getSuggestedBenefits(supplementName).length > 0;
}
