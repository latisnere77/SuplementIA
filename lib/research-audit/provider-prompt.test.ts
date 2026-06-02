import type { ResearchAuditPacket } from './packets';
import { buildResearchAuditSystemPrompt, buildResearchAuditUserPrompt } from './provider-prompt';

const packet: ResearchAuditPacket = {
  packetId: 'rap_prompt_contract',
  queryFingerprint: 'abc123',
  redactedQuery: 'centella asiatica',
  normalizedQuery: 'Centella asiatica',
  statusCounts: { insufficient_data: 2 },
  fallbackCounts: {},
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
  });
});
