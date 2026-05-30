import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import {
  buildAuditPacketFromEvent,
  loadAggregatedAuditEvents,
  type AggregatedAuditEvent,
} from './events';

const event: AggregatedAuditEvent = {
  id: 'garcinia-aggregate',
  query: 'Garcinia cambogia',
  normalizedQuery: 'Garcinia cambogia',
  statusCounts: {
    insufficient_data: 4,
    processing: 1,
  },
  fallbackCounts: {
    pubmed_profile: 2,
  },
  deterministicPubMedProfile: {
    totalCount: 12,
    categories: {
      human_clinical: 2,
      review: 1,
      preclinical: 4,
      phytochemical: 1,
      other: 4,
    },
  },
};

describe('aggregated audit events', () => {
  it('loads JSON event arrays and builds redacted packets', () => {
    const filePath = writeTempFile('events.json', JSON.stringify([event]));
    const [loaded] = loadAggregatedAuditEvents(filePath);
    const packet = buildAuditPacketFromEvent(loaded);

    expect(packet.valid).toBe(true);
    expect(packet.packet).toMatchObject({
      packetId: 'rap_event_garcinia-aggregate',
      redactedQuery: 'Garcinia cambogia',
      normalizedQuery: 'Garcinia cambogia',
      statusCounts: event.statusCounts,
      fallbackCounts: event.fallbackCounts,
      deterministicPubMedProfile: event.deterministicPubMedProfile,
    });
  });

  it('loads JSONL event files', () => {
    const filePath = writeTempFile('events.jsonl', [
      JSON.stringify(event),
      JSON.stringify({ ...event, id: 'centella-aggregate', query: 'Gotu kola' }),
    ].join('\n'));

    expect(loadAggregatedAuditEvents(filePath)).toHaveLength(2);
  });

  it('rejects personal medical narratives before provider packets are built', () => {
    const packet = buildAuditPacketFromEvent({
      query: 'tengo diabetes y dolor fuerte con magnesio',
      statusCounts: { observed: 1 },
    });

    expect(packet.valid).toBe(false);
    expect(packet.rejectionReasons.join(' ')).toContain('personal medical narrative');
  });
});

function writeTempFile(filename: string, content: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'research-audit-events-'));
  const filePath = path.join(dir, filename);
  writeFileSync(filePath, content);
  return filePath;
}

