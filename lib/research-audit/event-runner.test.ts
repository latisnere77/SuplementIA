import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { loadResearchAuditProviderConfig } from './config';
import { buildAuditPacketFromEvent, loadAggregatedAuditEvents } from './events';
import { runProviderPacketAudit } from './provider-runner';

describe('event audit runner path', () => {
  it('audits aggregated events as report-only skipped packets by default', async () => {
    const inputPath = writeTempFile('events.json', JSON.stringify({
      events: [
        {
          id: 'magnesium',
          query: 'Magnesium',
          statusCounts: { completed: 3 },
        },
        {
          id: 'unsafe',
          query: 'mi email es test@example.com y tomo zinc',
          statusCounts: { observed: 1 },
        },
      ],
    }));
    const events = loadAggregatedAuditEvents(inputPath);
    const packetInputs = events.map((event) => ({
      id: event.id || event.query,
      packetResult: buildAuditPacketFromEvent(event),
    }));

    const { report } = await runProviderPacketAudit(loadResearchAuditProviderConfig({}), packetInputs, {
      outputDir: '.research-audit-reports/test-event-runner',
    });

    expect(report.dryRun).toBe(true);
    expect(report.reportOnly).toBe(true);
    expect(report.enabled).toBe(false);
    expect(report.externalCalls).toBe(0);
    expect(report.totalPackets).toBe(2);
    expect(report.skippedPackets).toBe(2);
    expect(report.validationFailures).toBe(0);
    expect(report.results.map((result) => result.skippedReason)).toEqual([
      'disabled',
      'redaction_rejected',
    ]);
  });
});

function writeTempFile(filename: string, content: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'research-audit-event-runner-'));
  const filePath = path.join(dir, filename);
  writeFileSync(filePath, content);
  return filePath;
}

