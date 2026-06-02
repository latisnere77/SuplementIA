import type { ResearchAuditPacket } from './packets';

export function buildResearchAuditSystemPrompt(): string {
  return [
    'You are an offline research audit assistant for SuplementAI.',
    'Return exactly one JSON object in assistant message.content.',
    'Do not include markdown, prose, comments, chain-of-thought, reasoning text, or explanations in message.content.',
    'The JSON object must match the ResearchAuditFinding contract and must be directly parseable with JSON.parse.',
    'You are not allowed to create user-facing clinical copy, worksFor claims, product recommendations, affiliate links, or production changes.',
    'All findings must set blockedFromProduction=true, requiresHumanReview=true, redactionApplied=true.',
    'If packet.auditKind is "seo_aggregate", return only taskType="seo_opportunity", clinicalRisk="none", evidenceBoundary="editorial_only" or "operational_only", and no PMIDs.',
    'PMIDs may only be candidatePmids. Do not mark validatedPmids and do not claim PubMed verification.',
    'Do not invent, guess, extrapolate, pattern-complete, or fabricate PMIDs.',
    'Only include candidatePmids when you are confident they are real PubMed IDs directly relevant to the audited supplement/entity.',
    'If you are not sure about a PMID, set candidatePmids=[] and focus on aliases, issue type, and recommended offline review actions.',
    'Use pmidVerificationStatus="not_checked"; the local runner performs deterministic E-utilities verification after provider output.',
  ].join('\n');
}

export function buildResearchAuditUserPrompt(packet: ResearchAuditPacket): string {
  const allowedUses = packet.auditKind === 'seo_aggregate'
    ? ['seo_opportunity']
    : [
        'alias_gap',
        'recall_gap',
        'clinical_claim_risk',
        'pipeline_failure',
        'seo_opportunity',
      ];

  return JSON.stringify({
    task: 'Create one offline audit finding for human review only.',
    outputContract: {
      format: 'single_json_object_only',
      target: 'choices[0].message.content',
      noMarkdown: true,
      noReasoningText: true,
      noWrapperObject: true,
    },
    requiredFields: [
      'findingId',
      'createdAt',
      'provider',
      'model',
      'taskType',
      'severity',
      'supplementName',
      'originalQueries',
      'problemDetected',
      'evidenceBoundary',
      'suggestedAliases',
      'candidatePmids',
      'validatedPmids',
      'pmidVerificationStatus',
      'proposedClassification',
      'clinicalRisk',
      'recommendedAction',
      'blockedFromProduction',
      'requiresHumanReview',
      'confidence',
      'redactionApplied',
      'costEstimateUsd',
      'tokenEstimate',
      'notesForReviewer',
    ],
    allowedUses,
    packet,
    outputGuards: {
      validatedPmids: [],
      pmidVerificationStatus: 'not_checked',
      candidatePmidRules: {
        doNotInventPmids: true,
        useEmptyArrayWhenUnsure: true,
        preferAliasesAndOperationalActionsOverUncertainPmids: true,
      },
      seoAggregatesOnlyProduceSeoOpportunity: true,
      noProductionClinicalClaims: true,
      noProductOrAffiliateSuggestions: true,
    },
  });
}
