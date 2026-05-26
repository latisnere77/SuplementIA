import { loadAuditFixtures } from './fixtures';
import { simulateFixtureAudit } from './simulator';

describe('simulateFixtureAudit', () => {
  it('never marks PMIDs as validated in dry-run mode', () => {
    const fixtures = loadAuditFixtures();

    for (const fixture of fixtures) {
      const result = simulateFixtureAudit(fixture, 'gpt-5.4-nano');
      const finding = result.finding ?? result.rejectedFinding;

      expect(finding).toBeDefined();
      if (!finding || typeof finding !== 'object') {
        throw new Error(`Missing simulated finding for ${fixture.id}`);
      }
      const record = finding as {
        candidatePmids: string[];
        validatedPmids: string[];
        pmidVerificationStatus: string;
      };

      expect(record.candidatePmids).toEqual([]);
      expect(record.validatedPmids).toEqual([]);
      expect(record.pmidVerificationStatus).toBe('not_checked');
      expect(JSON.stringify(record)).not.toContain('"all_valid"');
    }
  });
});
