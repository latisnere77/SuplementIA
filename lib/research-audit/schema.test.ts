import {
  researchAuditFindingSchema,
  validateResearchAuditFinding,
  type ResearchAuditFinding,
} from './schema';

function validFinding(overrides: Partial<ResearchAuditFinding> = {}): ResearchAuditFinding {
  return {
    findingId: 'raf_test_finding_001',
    createdAt: '2026-05-26T00:00:00.000Z',
    provider: 'openai',
    model: 'gpt-5.4-nano',
    taskType: 'alias_gap',
    severity: 'medium',
    supplementName: 'Centella asiatica',
    originalQueries: ['gotu kola'],
    problemDetected: 'Alias recall may need review.',
    evidenceBoundary: 'human_clinical_required',
    suggestedAliases: ['Centella asiatica'],
    candidatePmids: ['3544968'],
    validatedPmids: ['3544968'],
    pmidVerificationStatus: 'all_valid',
    proposedClassification: 'possible_recall_gap',
    clinicalRisk: 'low',
    recommendedAction: 'Review this alias candidate in the asynchronous audit queue.',
    blockedFromProduction: true,
    requiresHumanReview: true,
    confidence: 0.75,
    redactionApplied: true,
    costEstimateUsd: 0.001,
    tokenEstimate: {
      input: 2000,
      output: 500,
    },
    ...overrides,
  };
}

describe('researchAuditFindingSchema', () => {
  it('accepts a guarded audit finding', () => {
    expect(researchAuditFindingSchema.parse(validFinding()).blockedFromProduction).toBe(true);
  });

  it('requires blockedFromProduction and redactionApplied to be true', () => {
    const result = validateResearchAuditFinding({
      ...validFinding(),
      blockedFromProduction: false,
      redactionApplied: false,
    });

    expect(result.valid).toBe(false);
    expect(result.rejectionReasons.join(' ')).toContain('blockedFromProduction');
    expect(result.rejectionReasons.join(' ')).toContain('redactionApplied');
  });

  it('rejects direct production-facing recommendation language', () => {
    const result = validateResearchAuditFinding(
      validFinding({
        recommendedAction: 'Update worksFor and recommend this supplement to users.',
      })
    );

    expect(result.valid).toBe(false);
    expect(result.rejectionReasons.join(' ')).toContain('recommendedAction');
  });

  it('requires validated PMIDs to be a subset of candidates', () => {
    const result = validateResearchAuditFinding(
      validFinding({
        candidatePmids: ['3544968'],
        validatedPmids: ['7936334'],
      })
    );

    expect(result.valid).toBe(false);
    expect(result.rejectionReasons.join(' ')).toContain('subset');
  });
});

