/**
 * Tool schema for Bedrock Converse API
 * Defines the structure for Claude to return EnrichedContent as structured tool output
 */

import { ToolConfiguration } from '@aws-sdk/client-bedrock-runtime';

/**
 * Complete tool schema for generating EnrichedContent
 * This replaces JSON Prefilling technique with proper Tool Use API
 */
export const ENRICHED_CONTENT_TOOL_CONFIG: ToolConfiguration = {
  tools: [
    {
      toolSpec: {
        name: 'generate_enriched_content',
        description:
          'Generate comprehensive, evidence-based content about a supplement including mechanisms, efficacy, dosage, and safety information.',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              whatIsIt: {
                type: 'string',
                description:
                  'Detailed 3-4 sentence description of what this supplement is, its origin, main mechanisms, and why it is notable. Be specific and technical.',
              },
              totalStudies: {
                type: 'number',
                description: 'Total number of studies analyzed for this recommendation',
              },
              primaryUses: {
                type: 'array',
                description: 'Primary uses with specific numbers and data',
                items: {
                  type: 'string',
                },
                minItems: 2,
                maxItems: 5,
              },
              mechanisms: {
                type: 'array',
                description: 'Mechanisms of action with evidence levels',
                items: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      description:
                        'Specific mechanism name (e.g., GABA-A receptor modulation, 5-alpha-reductase inhibition)',
                    },
                    description: {
                      type: 'string',
                      description:
                        'Detailed explanation of how this mechanism works at molecular/cellular level. Minimum 2-3 technical but clear sentences.',
                    },
                    evidenceLevel: {
                      type: 'string',
                      enum: ['strong', 'moderate', 'weak', 'preliminary'],
                      description: 'Evidence strength for this mechanism',
                    },
                    studyCount: {
                      type: 'number',
                      description: 'Estimated number of studies supporting this mechanism',
                    },
                  },
                  required: ['name', 'description', 'evidenceLevel', 'studyCount'],
                },
                minItems: 1,
                maxItems: 6,
              },
              worksFor: {
                type: 'array',
                description:
                  'CRITICAL: You MUST include AT LEAST 5 conditions/benefits here, up to 8. This is a hard requirement. If studies are limited, use your knowledge base to identify additional well-researched benefits. Order by evidence grade (A first, then B, C, D). Include conditions like: bone health, muscle function, cardiovascular health, nervous system, immune function, etc.',
                items: {
                  type: 'object',
                  properties: {
                    condition: {
                      type: 'string',
                      description:
                        'Very specific condition or benefit (e.g., Increase in muscle strength in resistance training)',
                    },
                    evidenceGrade: {
                      type: 'string',
                      enum: ['A', 'B', 'C', 'D'],
                      description:
                        'Evidence grade: A (multiple high-quality RCTs + meta-analysis), B (several RCTs), C (few RCTs or preliminary), D (no robust evidence)',
                    },
                    effectSize: {
                      type: 'string',
                      enum: ['Very Large', 'Large', 'Moderate', 'Small', 'Minimal'],
                      description:
                        'Effect size: Very Large (>50% improvement), Large (30-50%), Moderate (15-30%), Small (5-15%), Minimal (<5%)',
                    },
                    magnitude: {
                      type: 'string',
                      description:
                        'Exact numerical description of effect (e.g., Increases 8-15% in maximum strength, Reduces 25-30% in recovery time)',
                    },
                    studyCount: {
                      type: 'number',
                      description: 'Total number of studies',
                    },
                    rctCount: {
                      type: 'number',
                      description: 'Number of randomized controlled trials',
                    },
                    metaAnalysis: {
                      type: 'boolean',
                      description: 'Whether meta-analysis exists for this condition',
                    },
                    totalParticipants: {
                      type: 'number',
                      description: 'Approximate total participants across all studies',
                    },
                    notes: {
                      type: 'string',
                      description:
                        'Ultra-specific details: exact dose used, minimum duration for effects, population studied, magnitude of effect with numbers, important context',
                    },
                  },
                  required: [
                    'condition',
                    'evidenceGrade',
                    'effectSize',
                    'magnitude',
                    'studyCount',
                    'rctCount',
                    'metaAnalysis',
                    'totalParticipants',
                    'notes',
                  ],
                },
                minItems: 5,
                maxItems: 8,
              },
              doesntWorkFor: {
                type: 'array',
                description:
                  'Conditions where evidence is insufficient or negative. MUST include MINIMUM 5 items, MAXIMUM 8. Include popular claims that lack scientific support.',
                items: {
                  type: 'object',
                  properties: {
                    condition: {
                      type: 'string',
                      description: 'Condition where there is no sufficient evidence or negative evidence',
                    },
                    evidenceGrade: {
                      type: 'string',
                      enum: ['D', 'F'],
                      description: 'D (insufficient evidence) or F (negative evidence)',
                    },
                    studyCount: {
                      type: 'number',
                      description: 'Number of studies showing no effect',
                    },
                    notes: {
                      type: 'string',
                      description:
                        'Specific explanation of why it does not work with data (e.g., 8 RCTs showed no significant difference vs placebo, p>0.05)',
                    },
                  },
                  required: ['condition', 'evidenceGrade', 'studyCount', 'notes'],
                },
                minItems: 5,
                maxItems: 8,
              },
              limitedEvidence: {
                type: 'array',
                description:
                  'Conditions with promising but insufficient preliminary evidence. MUST include MINIMUM 3, MAXIMUM 5 items.',
                items: {
                  type: 'object',
                  properties: {
                    condition: {
                      type: 'string',
                      description: 'Condition with promising but insufficient preliminary evidence',
                    },
                    evidenceGrade: {
                      type: 'string',
                      enum: ['C'],
                      description: 'Always C for limited evidence',
                    },
                    studyCount: {
                      type: 'number',
                      description: 'Number of preliminary studies',
                    },
                    notes: {
                      type: 'string',
                      description:
                        'Detailed explanation of what is missing (e.g., Only 3 small studies (n<50), larger RCTs needed, more diverse population, etc.)',
                    },
                  },
                  required: ['condition', 'evidenceGrade', 'studyCount', 'notes'],
                },
                minItems: 3,
                maxItems: 5,
              },
              dosage: {
                type: 'object',
                description: 'Comprehensive dosage information based on evidence',
                properties: {
                  standard: {
                    type: 'string',
                    description:
                      'Specific dose range according to evidence with exact units (e.g., 300-600mg/day of standardized extract, 3-5g/day monohydrate)',
                  },
                  effectiveDose: {
                    type: 'string',
                    description: 'Minimum documented effective dose (e.g., 300mg/day for anxiolytic effects)',
                  },
                  optimalDose: {
                    type: 'string',
                    description: 'Optimal dose according to meta-analysis (e.g., 500mg/day showed best results)',
                  },
                  maxSafeDose: {
                    type: 'string',
                    description:
                      'Maximum documented safe dose (e.g., Up to 1200mg/day without significant adverse effects)',
                  },
                  timing: {
                    type: 'string',
                    description:
                      'When to take for best efficacy with reason (e.g., Morning with breakfast for better absorption, Night before sleep to leverage cortisol peak, Timing not critical according to studies)',
                  },
                  duration: {
                    type: 'string',
                    description:
                      'Specific duration to see effects according to studies (e.g., Initial effects in 2-4 weeks, full effects in 8-12 weeks, continuous use safe up to 6 months documented)',
                  },
                  forms: {
                    type: 'array',
                    description: 'Different forms available with their characteristics',
                    items: {
                      type: 'object',
                      properties: {
                        form: {
                          type: 'string',
                          description:
                            'Exact form name (e.g., KSM-66®, Sensoril®, 10:1 aqueous extract, Micronized monohydrate)',
                        },
                        description: {
                          type: 'string',
                          description:
                            'Why this form is relevant with data (e.g., Standardized to 5% withanolides, used in 78% of clinical studies, 40% higher bioavailability)',
                        },
                        recommended: {
                          type: 'boolean',
                          description: 'Whether this form is recommended',
                        },
                        studyCount: {
                          type: 'number',
                          description: 'Number of studies using this form',
                        },
                      },
                      required: ['form', 'description', 'recommended', 'studyCount'],
                    },
                  },
                  stacksWith: {
                    type: 'array',
                    description:
                      'Supplements with documented synergy (include brief reason, e.g., L-Theanine - enhances calming effects without sedation)',
                    items: {
                      type: 'string',
                    },
                  },
                  notes: {
                    type: 'string',
                    description:
                      'Important dosing considerations (e.g., Taking with fats increases absorption by 30%, splitting dose improves tolerance, cycling not necessary according to evidence)',
                  },
                },
                required: [
                  'standard',
                  'effectiveDose',
                  'optimalDose',
                  'maxSafeDose',
                  'timing',
                  'duration',
                  'notes',
                ],
              },
              safety: {
                type: 'object',
                description: 'Comprehensive safety information',
                properties: {
                  overallRating: {
                    type: 'string',
                    enum: ['Generally Safe', 'Caution Required', 'Insufficient Data'],
                    description: 'Overall safety rating',
                  },
                  safetyScore: {
                    type: 'number',
                    minimum: 1,
                    maximum: 10,
                    description: 'Safety score 1-10 based on evidence (10 = extremely safe)',
                  },
                  sideEffects: {
                    type: 'array',
                    description: 'Documented side effects',
                    items: {
                      type: 'object',
                      properties: {
                        effect: {
                          type: 'string',
                          description:
                            'Specific side effect (e.g., Mild gastrointestinal discomfort, Daytime drowsiness)',
                        },
                        frequency: {
                          type: 'string',
                          description:
                            'Percentage or quantitative description (e.g., 10-15% of users, Rare <1%, Common at doses >600mg)',
                        },
                        severity: {
                          type: 'string',
                          enum: ['Mild', 'Moderate', 'Severe'],
                          description: 'Severity level',
                        },
                        notes: {
                          type: 'string',
                          description:
                            'Detailed context (e.g., Only at doses >600mg/day, Disappears after 1-2 weeks, More common on empty stomach)',
                        },
                      },
                      required: ['effect', 'frequency', 'severity', 'notes'],
                    },
                  },
                  contraindications: {
                    type: 'array',
                    description: 'Specific contraindications with reasons',
                    items: {
                      type: 'string',
                    },
                  },
                  interactions: {
                    type: 'array',
                    description: 'Drug interactions',
                    items: {
                      type: 'object',
                      properties: {
                        medication: {
                          type: 'string',
                          description:
                            'Specific medication type or name (e.g., Benzodiazepines, Warfarin, Proton pump inhibitors)',
                        },
                        severity: {
                          type: 'string',
                          enum: ['Mild', 'Moderate', 'Severe'],
                          description: 'Interaction severity',
                        },
                        mechanism: {
                          type: 'string',
                          description:
                            'How the interaction occurs (e.g., Potentiation of GABAergic effects, CYP3A4 inhibition)',
                        },
                        description: {
                          type: 'string',
                          description:
                            'Clear description of risk with recommendation (e.g., May enhance sedation. Reduce sedative dose or avoid combination. Consult doctor.)',
                        },
                      },
                      required: ['medication', 'severity', 'mechanism', 'description'],
                    },
                  },
                  longTermSafety: {
                    type: 'string',
                    description:
                      'Long-term safety data with specific duration (e.g., Continuous use safe up to 6 months documented in RCTs, Studies of 12+ months show favorable safety profile)',
                  },
                  pregnancyCategory: {
                    type: 'string',
                    enum: ['Avoid', 'Caution', 'Insufficient Data'],
                    description: 'Pregnancy safety category',
                  },
                  notes: {
                    type: 'string',
                    description:
                      'Important safety notes (e.g., No reports of hepatotoxicity in clinical studies, Safety profile superior to anxiolytic medications)',
                  },
                },
                required: [
                  'overallRating',
                  'safetyScore',
                  'longTermSafety',
                  'pregnancyCategory',
                  'notes',
                ],
              },
              buyingGuidance: {
                type: 'object',
                description: 'Comprehensive buying guidance based on evidence',
                properties: {
                  preferredForm: {
                    type: 'string',
                    description:
                      'Preferred form according to evidence (e.g., Fruiting body extract, Monohydrate, Citrate). ONLY forms with clinical study support.',
                  },
                  keyCompounds: {
                    type: 'array',
                    description: 'Key active compounds to look for',
                    items: {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string',
                          description: 'Main active compound name (e.g., Hericenones, Withanolides, Creatine)',
                        },
                        source: {
                          type: 'string',
                          description: 'Where it comes from (e.g., fruiting body, root, synthesis)',
                        },
                        lookFor: {
                          type: 'string',
                          description: 'What to look for on label (e.g., >30% beta-glucans, 5% withanolides)',
                        },
                      },
                      required: ['name', 'source', 'lookFor'],
                    },
                    minItems: 1,
                    maxItems: 5,
                  },
                  avoidFlags: {
                    type: 'array',
                    description: 'Warning signs based on evidence',
                    items: {
                      type: 'string',
                    },
                    minItems: 1,
                    maxItems: 5,
                  },
                  qualityIndicators: {
                    type: 'array',
                    description: 'Verifiable quality indicators',
                    items: {
                      type: 'string',
                    },
                    minItems: 1,
                    maxItems: 5,
                  },
                  notes: {
                    type: 'string',
                    description:
                      'Additional context ONLY if based on published evidence. DO NOT invent absorption or bioavailability claims.',
                  },
                },
                required: ['preferredForm', 'keyCompounds', 'avoidFlags', 'qualityIndicators'],
              },
              keyStudies: {
                type: 'array',
                description: 'Key studies supporting the evidence. Only include if you know exact PMIDs.',
                items: {
                  type: 'object',
                  properties: {
                    pmid: {
                      type: 'string',
                      description: 'Exact PubMed ID (only if known with certainty, otherwise omit)',
                    },
                    title: {
                      type: 'string',
                      description: 'Complete study title',
                    },
                    year: {
                      type: 'number',
                      description: 'Publication year',
                    },
                    studyType: {
                      type: 'string',
                      enum: ['RCT', 'Meta-analysis', 'Systematic Review', 'Observational'],
                      description: 'Study type',
                    },
                    participants: {
                      type: 'number',
                      description: 'Exact number of participants',
                    },
                    duration: {
                      type: 'string',
                      description: 'Study duration (e.g., 8 weeks, 6 months)',
                    },
                    dose: {
                      type: 'string',
                      description: 'Dose used in the study',
                    },
                    findings: {
                      type: 'array',
                      description: 'Key findings with specific numerical data',
                      items: {
                        type: 'string',
                      },
                      minItems: 1,
                      maxItems: 5,
                    },
                    quality: {
                      type: 'string',
                      enum: ['High', 'Moderate', 'Low'],
                      description: 'Study quality based on design, sample size, methodology',
                    },
                  },
                  required: ['title', 'year', 'studyType', 'participants', 'duration', 'dose', 'findings', 'quality'],
                },
              },
              practicalRecommendations: {
                type: 'array',
                description: 'Practical evidence-based recommendations',
                items: {
                  type: 'string',
                },
                minItems: 2,
                maxItems: 5,
              },
            },
            required: [
              'whatIsIt',
              'totalStudies',
              'primaryUses',
              'mechanisms',
              'worksFor',
              'dosage',
              'safety',
              'buyingGuidance',
              'practicalRecommendations',
            ],
          },
        },
      },
    },
  ],
};
