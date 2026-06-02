import type { ResearchAuditPacket } from './packets';
import { buildResearchAuditSystemPrompt, buildResearchAuditUserPrompt } from './provider-prompt';

const packet: ResearchAuditPacket = {
  packetId: 'rap_prompt_contract',
  queryFingerprint: 'abc123',
  redactedQuery: 'centella asiatica',
  normalizedQuery: 'Centella asiatica',
  statusCounts: { insufficient_data: 2 },
  fallbackCounts: {},
  deterministicPubMedProfile: {
    totalCount: 0,
    categories: {
      human_clinical: 0,
      review: 0,
      preclinical: 0,
      phytochemical: 0,
      other: 0,
    },
  },
};

describe('research audit provider prompt contract', () => {
  it('requires parseable JSON in message content without reasoning text', () => {
    const systemPrompt = buildResearchAuditSystemPrompt();
    const userPrompt = JSON.parse(buildResearchAuditUserPrompt(packet));

    expect(systemPrompt).toContain('Return exactly one JSON object in assistant message.content');
    expect(systemPrompt).toContain('Do not include markdown, prose, comments, chain-of-thought');
    expect(systemPrompt).toContain('directly parseable with JSON.parse');
    expect(systemPrompt).toContain('Do not invent, guess, extrapolate, pattern-complete, or fabricate PMIDs');
    expect(systemPrompt).toContain('If you are not sure about a PMID, set candidatePmids=[]');
    expect(systemPrompt).toContain('packet.auditKind is "seo_aggregate"');
    expect(systemPrompt).toContain('prioritize SEO/product analytics signals');
    expect(systemPrompt).toContain('ignore default or empty deterministicPubMedProfile values');
    expect(systemPrompt).toContain('recommendedAction must be an internal SEO/editorial action');
    expect(userPrompt.outputContract).toEqual(
      expect.objectContaining({
        format: 'single_json_object_only',
        target: 'choices[0].message.content',
        noReasoningText: true,
      })
    );
    expect(userPrompt.requiredFields).toContain('findingId');
    expect(userPrompt.requiredFields).toContain('notesForReviewer');
    expect(userPrompt.outputGuards.candidatePmidRules).toEqual(
      expect.objectContaining({
        doNotInventPmids: true,
        useEmptyArrayWhenUnsure: true,
        preferAliasesAndOperationalActionsOverUncertainPmids: true,
      })
    );
    expect(userPrompt.outputGuards.seoAggregatesOnlyProduceSeoOpportunity).toBe(true);
  });

  it('limits SEO aggregate packets to SEO opportunity findings', () => {
    const userPrompt = JSON.parse(buildResearchAuditUserPrompt({
      ...packet,
      auditKind: 'seo_aggregate',
      seoAggregate: {
        source: 'search_console',
        pagePath: '/es/portal/supplement/fiber-psyllium',
        country: 'Mexico',
        clicks: 0,
        impressions: 42,
        ctr: 0,
        averagePosition: 38.5,
      },
    }));

    expect(userPrompt.allowedUses).toEqual(['seo_opportunity']);
    expect(userPrompt.outputGuards.seoAggregateRules).toEqual(
      expect.objectContaining({
        primarySignals: expect.arrayContaining([
          'seoAggregate.ctr',
          'seoAggregate.impressions',
          'seoAggregate.averagePosition',
          'seoAggregate.pagePath',
          'seoAggregate.country',
          'seoAggregate.source',
        ]),
        ignoreDefaultEmptyPubMedProfile: true,
        doNotUsePubMedAbsenceAsPrimarySeoProblem: true,
        clinicalRiskMustBeNone: true,
        noPmidsForSeoOpportunity: true,
        recommendedActionMustBeInternalSeoOrEditorial: true,
        forbiddenRecommendedActions: expect.arrayContaining([
          'clinical guidance',
          'supplement classification',
          'product recommendation',
          'affiliate action',
          'runtime behavior',
        ]),
      })
    );
  });
});
