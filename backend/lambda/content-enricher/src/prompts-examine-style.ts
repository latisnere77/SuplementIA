/**
 * Examine.com-style Prompt Template
 * 
 * Generates quantitative, data-driven supplement analysis
 * Focus: Precise numbers, effect magnitudes, evidence counts
 */

import { PubMedStudy } from './types';

export const EXAMINE_STYLE_PROMPT_TEMPLATE = `You are a medical research analyst creating an evidence-based supplement guide in the style of Examine.com.

CRITICAL REQUIREMENTS:
1. Extract QUANTITATIVE data from studies (exact numbers, percentages, ranges)
2. Classify effect magnitude: "Small", "Moderate", "Large", or "No effect"
3. Always cite evidence: "X studies, Y participants"
4. Be TRANSPARENT: Show "No effect" when data doesn't support claims
5. Provide context: "Greater effect in diabetics" when applicable

SUPPLEMENT: {supplementName}
CATEGORY: {category}

{studiesContext}

{studiesInstruction}

RESPONSE FORMAT (JSON only, no markdown):

{
  "overview": {
    "whatIsIt": "1-2 sentence definition of what this supplement is",
    "functions": ["Primary biological function 1", "Function 2", "Function 3"],
    "sources": ["Dietary source 1", "Source 2", "Source 3"]
  },

  "benefitsByCondition": [
    {
      "condition": "Specific condition (e.g., Type 2 Diabetes, Blood Pressure)",
      "effect": "Small|Moderate|Large|No effect",
      "quantitativeData": "EXACT numerical effect (e.g., Reduces fasting glucose by 15-20 mg/dL, Reduces systolic BP by 2-4 mmHg)",
      "evidence": "X studies, Y participants",
      "context": "When effect is greater/different (e.g., Greater effect in magnesium-deficient individuals)",
      "studyTypes": ["RCT", "Meta-analysis", "Systematic Review"]
    }
  ],

  "dosage": {
    "effectiveDose": "Minimum effective dose with units (e.g., 200-400 mg/day)",
    "commonDose": "Most commonly used dose (e.g., 300 mg/day)",
    "timing": "When to take with reason (e.g., With meals to reduce GI upset)",
    "forms": [
      {
        "name": "Specific form (e.g., Magnesium citrate, KSM-66)",
        "bioavailability": "Bioavailability info if known (e.g., High, ~40%)",
        "notes": "Why this form matters (e.g., Used in 78% of clinical studies)"
      }
    ],
    "notes": "Important dosing considerations (e.g., Oxide form has lower bioavailability)"
  },

  "safety": {
    "sideEffects": {
      "common": [
        "Side effect with FREQUENCY (e.g., Diarrhea - 12% at 1000mg dose, Nausea - 5%)"
      ],
      "rare": [
        "Rare side effect with context (e.g., Hypermagnesemia in kidney disease)"
      ],
      "severity": "Generally mild|Moderate|Severe"
    },
    "interactions": {
      "medications": [
        {
          "medication": "Specific medication or class (e.g., Bisphosphonates, Antibiotics)",
          "severity": "Mild|Moderate|Severe",
          "description": "How to manage (e.g., Take 2 hours before or 4-6 hours after)"
        }
      ]
    },
    "contraindications": [
      "Specific contraindication with reason (e.g., Severe kidney disease - risk of hypermagnesemia)"
    ],
    "pregnancyLactation": "Safe|Caution|Avoid - brief explanation"
  },

  "mechanisms": [
    {
      "name": "Specific mechanism (e.g., Insulin Sensitivity, Vasodilation)",
      "description": "HOW it works at molecular level (e.g., Acts as cofactor for insulin receptor tyrosine kinase)",
      "evidenceLevel": "strong|moderate|weak"
    }
  ]
}

EFFECT MAGNITUDE GUIDELINES:
- Large: >30% improvement or >10 mmHg BP reduction or Cohen's d >0.8
- Moderate: 15-30% improvement or 5-10 mmHg BP reduction or Cohen's d 0.5-0.8
- Small: 5-15% improvement or 2-5 mmHg BP reduction or Cohen's d 0.2-0.5
- No effect: <5% improvement or not statistically significant

EVIDENCE LEVEL GUIDELINES (mechanisms):
- strong: Well-established mechanism with multiple human studies, scientific consensus
- moderate: Proposed mechanism with partial human evidence, supported by preclinical studies
- weak: Theoretical mechanism with limited evidence, mainly in vitro studies

CRITICAL JSON RULES:
1. ALL numeric values must be valid numbers (no symbols like >, <, ~)
   ❌ WRONG: "participants": >1000
   ✅ RIGHT: "participants": 1000
   
2. NEVER use non-JSON values like N/A, null, undefined
   ❌ WRONG: "participants": N/A
   ✅ RIGHT: "participants": 0 (and explain in "notes")
   
3. ALL strings must be in double quotes, not truncated
   ❌ WRONG: "notes": "not report
   ✅ RIGHT: "notes": "not reported"
   
4. NO trailing commas before } or ]
   ❌ WRONG: {"key": "value",}
   ✅ RIGHT: {"key": "value"}

REMEMBER: 
- Be PRECISE with numbers
- Show "No effect" when appropriate
- Always cite evidence count
- Include context when effect varies by population

Respond ONLY with valid JSON, no markdown code blocks.`;

/**
 * Build studies context from real PubMed data (Examine-style)
 */
function buildStudiesContextExamine(studies: PubMedStudy[]): string {
  if (!studies || studies.length === 0) {
    return '';
  }

  const studiesText = studies.map((study, idx) => {
    const participantsText = study.participants ? ` | n=${study.participants}` : '';
    
    return `Study ${idx + 1} (PMID: ${study.pmid}, ${study.year}${participantsText}):
Type: ${study.studyType || 'Not specified'}
Title: ${study.title}
Abstract: ${study.abstract.substring(0, 800)}${study.abstract.length > 800 ? '...' : ''}
`;
  }).join('\n---\n');

  return `
REAL PUBMED STUDIES (${studies.length} studies):

You have access to ${studies.length} REAL, VERIFIABLE scientific studies from PubMed.
Base your analysis EXCLUSIVELY on these studies.

${studiesText}
`;
}

/**
 * Build Examine-style prompt
 */
export function buildExamineStylePrompt(
  supplementName: string,
  category: string = 'general',
  studies?: PubMedStudy[]
): string {
  const hasStudies = studies && studies.length > 0;

  const studiesContext = hasStudies
    ? buildStudiesContextExamine(studies!)
    : 'NOTE: No specific PubMed studies provided. Use your general knowledge from published scientific literature.';

  const studiesInstruction = hasStudies
    ? `IMPORTANT: You have ${studies!.length} real PubMed studies above. Base your analysis EXCLUSIVELY on these studies. Extract QUANTITATIVE data from them.`
    : 'Use your knowledge of scientific literature, but be conservative in your claims.';

  return EXAMINE_STYLE_PROMPT_TEMPLATE
    .replace(/{supplementName}/g, supplementName)
    .replace(/{category}/g, category)
    .replace(/{studiesContext}/g, studiesContext)
    .replace(/{studiesInstruction}/g, studiesInstruction);
}

/**
 * Validate Examine-style content structure
 */
export function validateExamineStyleContent(data: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  const requiredFields = [
    'overview',
    'benefitsByCondition',
    'dosage',
    'safety',
  ];

  for (const field of requiredFields) {
    if (!(field in data)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate overview structure
  if (data.overview) {
    if (!data.overview.whatIsIt) {
      errors.push('overview.whatIsIt is required');
    }
    if (!Array.isArray(data.overview.functions)) {
      errors.push('overview.functions must be an array');
    }
  }

  // Validate benefitsByCondition
  if (data.benefitsByCondition && !Array.isArray(data.benefitsByCondition)) {
    errors.push('benefitsByCondition must be an array');
  }

  // Validate dosage structure
  if (data.dosage) {
    const dosageRequired = ['effectiveDose', 'commonDose', 'timing'];
    for (const field of dosageRequired) {
      if (!(field in data.dosage)) {
        errors.push(`dosage.${field} is required`);
      }
    }
  }

  // Validate safety structure
  if (data.safety) {
    if (!data.safety.sideEffects) {
      errors.push('safety.sideEffects is required');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
