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

  it('accepts aggregated Search Console SEO events and builds safe SEO packets', () => {
    const packet = buildAuditPacketFromEvent({
      source: 'search_console',
      id: 'bacopa-gsc-es',
      query: 'bacopa monnieri',
      pagePath: '/es/portal/supplement/bacopa-monnieri',
      country: 'Mexico',
      clicks: 0,
      impressions: 42,
      ctr: 0,
      averagePosition: 58.3,
      firstSeen: '2026-05-01T00:00:00.000Z',
      lastSeen: '2026-05-31T00:00:00.000Z',
    });

    expect(packet.valid).toBe(true);
    expect(packet.packet).toMatchObject({
      auditKind: 'seo_aggregate',
      packetId: 'rap_event_bacopa-gsc-es',
      redactedQuery: 'bacopa monnieri',
      statusCounts: { impressions: 42, clicks: 0 },
      seoAggregate: {
        source: 'search_console',
        pagePath: '/es/portal/supplement/bacopa-monnieri',
        country: 'Mexico',
        impressions: 42,
        averagePosition: 58.3,
      },
    });
  });

  it('accepts aggregated GA4 SEO events without raw analytics payloads', () => {
    const packet = buildAuditPacketFromEvent({
      source: 'ga4',
      id: 'magnesium-outbound',
      query: 'magnesium',
      pagePath: '/es/portal/results',
      country: 'Colombia',
      channel: 'organic',
      eventName: 'outbound_click',
      eventCount: 3,
      firstSeen: '2026-05-01T00:00:00.000Z',
      lastSeen: '2026-05-31T00:00:00.000Z',
    });

    expect(packet.valid).toBe(true);
    expect(packet.packet?.seoAggregate).toEqual(
      expect.objectContaining({
        source: 'ga4',
        pagePath: '/es/portal/results',
        channel: 'organic',
        eventName: 'outbound_click',
        eventCount: 3,
      })
    );
    expect(JSON.stringify(packet.packet)).not.toContain('session');
    expect(JSON.stringify(packet.packet)).not.toContain('userAgent');
  });

  it('rejects personal medical narratives before provider packets are built', () => {
    const packet = buildAuditPacketFromEvent({
      query: 'tengo diabetes y dolor fuerte con magnesio',
      statusCounts: { observed: 1 },
    });

    expect(packet.valid).toBe(false);
    expect(packet.rejectionReasons.join(' ')).toContain('personal medical narrative');
  });

  it('rejects SEO events with full URLs or query params in pagePath', () => {
    expect(() =>
      loadAggregatedAuditEvents(writeTempFile('events.json', JSON.stringify([
        {
          source: 'search_console',
          query: 'bacopa monnieri',
          pagePath: 'https://suplementai.com/es/portal/supplement/bacopa-monnieri?email=test@example.com',
          impressions: 1,
        },
      ])))
    ).toThrow(/pagePath/);

    expect(() =>
      loadAggregatedAuditEvents(writeTempFile('events.json', JSON.stringify([
        {
          source: 'ga4',
          query: 'magnesium',
          pagePath: '/es/portal/results?q=magnesium',
          eventName: 'outbound_click',
          eventCount: 1,
        },
      ])))
    ).toThrow(/pagePath/);
  });

  it('rejects SEO aggregate fields with PII-like values', () => {
    expect(() =>
      loadAggregatedAuditEvents(writeTempFile('events.json', JSON.stringify([
        {
          source: 'ga4',
          query: 'magnesium',
          pagePath: '/es/portal/results',
          eventName: 'outbound_click?email=test@example.com',
          eventCount: 1,
        },
      ])))
    ).toThrow(/unsafe or personal data/);
  });
});

function writeTempFile(filename: string, content: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'research-audit-events-'));
  const filePath = path.join(dir, filename);
  writeFileSync(filePath, content);
  return filePath;
}
