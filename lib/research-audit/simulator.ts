import type { AuditFixture } from './fixtures';
import { estimateAuditCost, type AuditModel } from './cost-estimator';
import { redactAuditQuery } from './redaction';
import {
  researchAuditFindingSchema,
  type ResearchAuditFinding,
} from './schema';

export interface SimulatedAuditResult {
  fixtureId: string;
  provider: ResearchAuditFinding['provider'];
  model: AuditModel;
  valid: boolean;
  finding?: ResearchAuditFinding;
  rejectedFinding?: unknown;
  rejectionReasons: string[];
  costEstimateUsd: number;
}

function severityForFixture(fixture: AuditFixture): ResearchAuditFinding['severity'] {
  if (fixture.statusCounts.upstream_unavailable) return 'high';
  if (fixture.deterministicPubMedProfile.categories.human_clinical > 0) return 'medium';
  return 'low';
}

function evidenceBoundaryForFixture(fixture: AuditFixture): ResearchAuditFinding['evidenceBoundary'] {
  if (fixture.expected.allowedTaskTypes.includes('pipeline_failure')) {
    return 'operational_only';
  }
  if (fixture.expected.allowedTaskTypes.includes('clinical_claim_risk')) {
    return fixture.deterministicPubMedProfile.categories.human_clinical > 0
      ? 'human_clinical_required'
      : 'preclinical_only';
  }
  if (fixture.expected.allowedTaskTypes.includes('seo_opportunity')) {
    return 'editorial_only';
  }
  return 'human_clinical_required';
}

function firstAllowed<T extends string>(values: T[]): T {
  return values[0];
}

function containsForbiddenTerm(serializedFinding: string, term: string): boolean {
  const lowerTerm = term.toLowerCase();
  const escaped = lowerTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (/^[a-z0-9 ]+$/i.test(term)) {
    return new RegExp(`\\b${escaped}\\b`, 'i').test(serializedFinding);
  }

  return serializedFinding.includes(lowerTerm);
}

export function simulateFixtureAudit(
  fixture: AuditFixture,
  model: AuditModel
): SimulatedAuditResult {
  const redaction = redactAuditQuery(fixture.redactedQuery);
  const cost = estimateAuditCost({
    model,
    inputTokens: 2000,
    outputTokens: 500,
  });

  if (!redaction.allowed || !redaction.redactedQuery) {
    return {
      fixtureId: fixture.id,
      provider: cost.provider,
      model,
      valid: false,
      rejectionReasons: redaction.rejectionReasons,
      costEstimateUsd: cost.totalCostUsd,
    };
  }

  const taskType = firstAllowed(fixture.expected.allowedTaskTypes);
  const proposedClassification = firstAllowed(fixture.expected.allowedClassifications);
  const finding: ResearchAuditFinding = {
    findingId: `raf_${fixture.id.replace(/[^a-z0-9_-]/gi, '').toLowerCase()}`,
    createdAt: new Date(0).toISOString(),
    provider: cost.provider,
    model,
    taskType: taskType as ResearchAuditFinding['taskType'],
    severity: severityForFixture(fixture),
    supplementName: fixture.normalizedQuery || fixture.redactedQuery,
    originalQueries: [redaction.redactedQuery],
    problemDetected: `Dry-run audit simulation for ${fixture.id}.`,
    evidenceBoundary: evidenceBoundaryForFixture(fixture),
    suggestedAliases: fixture.expected.requiredAliasesAny || [],
    candidatePmids: [],
    validatedPmids: [],
    pmidVerificationStatus: 'not_checked',
    proposedClassification: proposedClassification as ResearchAuditFinding['proposedClassification'],
    clinicalRisk: taskType === 'pipeline_failure' || taskType === 'seo_opportunity' ? 'none' : 'low',
    recommendedAction: `Review fixture ${fixture.id} in the asynchronous audit queue; do not change production clinical data from this finding.`,
    blockedFromProduction: true,
    requiresHumanReview: true,
    confidence: 0.6,
    redactionApplied: true,
    costEstimateUsd: Number(cost.totalCostUsd.toFixed(6)),
    tokenEstimate: {
      input: 2000,
      output: 500,
    },
    notesForReviewer: 'Simulated locally without external APIs or LLM calls.',
  };

  const validation = researchAuditFindingSchema.safeParse(finding);
  const forbiddenTerms = fixture.expected.forbiddenTerms || [];
  const serializedFinding = JSON.stringify(finding).toLowerCase();
  const forbiddenHits = forbiddenTerms.filter((term) =>
    containsForbiddenTerm(serializedFinding, term)
  );

  const rejectionReasons = [
    ...(validation.success ? [] : validation.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      return `${path}${issue.message}`;
    })),
    ...forbiddenHits.map((term) => `finding contains forbidden fixture term: ${term}`),
  ];

  return {
    fixtureId: fixture.id,
    provider: cost.provider,
    model,
    valid: rejectionReasons.length === 0,
    finding: rejectionReasons.length === 0 ? finding : undefined,
    rejectedFinding: rejectionReasons.length > 0 ? finding : undefined,
    rejectionReasons,
    costEstimateUsd: cost.totalCostUsd,
  };
}
