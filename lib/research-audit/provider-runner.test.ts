import { loadResearchAuditProviderConfig } from './config';
import { runProviderFixtureAudit } from './provider-runner';

describe('runProviderFixtureAudit', () => {
  it('produces report-only skipped results while the provider is disabled', async () => {
    const { report } = await runProviderFixtureAudit(loadResearchAuditProviderConfig({}), {
      limit: 2,
      outputDir: '.research-audit-reports/test-provider-runner',
    });

    expect(report.dryRun).toBe(true);
    expect(report.reportOnly).toBe(true);
    expect(report.enabled).toBe(false);
    expect(report.externalCalls).toBe(0);
    expect(report.totalPackets).toBe(2);
    expect(report.skippedPackets).toBe(2);
    expect(report.validationFailures).toBe(0);
    expect(report.results.every((result) => result.skippedReason === 'disabled')).toBe(true);
  });
});
