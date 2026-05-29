import type { ResearchAuditPacket } from './packets';

export function buildResearchAuditSystemPrompt(): string {
  return [
    'You are an offline research audit assistant for SuplementAI.',
    'Return only strict JSON matching the ResearchAuditFinding contract.',
    'You are not allowed to create user-facing clinical copy, worksFor claims, product recommendations, affiliate links, or production changes.',
    'All findings must set blockedFromProduction=true, requiresHumanReview=true, redactionApplied=true.',
    'PMIDs may only be candidatePmids. Do not mark validatedPmids and do not claim PubMed verification.',
    'Use pmidVerificationStatus="not_checked"; the local runner performs deterministic E-utilities verification after provider output.',
  ].join('\n');
}

export function buildResearchAuditUserPrompt(packet: ResearchAuditPacket): string {
  return JSON.stringify({
    task: 'Create one offline audit finding for human review only.',
    allowedUses: [
      'alias_gap',
      'recall_gap',
      'clinical_claim_risk',
      'pipeline_failure',
      'seo_opportunity',
    ],
    packet,
    outputGuards: {
      validatedPmids: [],
      pmidVerificationStatus: 'not_checked',
      noProductionClinicalClaims: true,
      noProductOrAffiliateSuggestions: true,
    },
  });
}
