import { loadAuditFixtures } from './fixtures';
import { buildAuditPacketFromFixture } from './packets';

describe('buildAuditPacketFromFixture', () => {
  it('builds redacted packets without raw user payload fields', () => {
    const [fixture] = loadAuditFixtures();
    const result = buildAuditPacketFromFixture(fixture);

    expect(result.valid).toBe(true);
    expect(result.packet).toMatchObject({
      redactedQuery: fixture.redactedQuery,
      queryFingerprint: expect.any(String),
      deterministicPubMedProfile: fixture.deterministicPubMedProfile,
    });
    expect(JSON.stringify(result.packet)).not.toContain('email');
    expect(JSON.stringify(result.packet)).not.toContain('userAgent');
    expect(JSON.stringify(result.packet)).not.toContain('requestBody');
  });
});

