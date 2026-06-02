import {
  importSeoAggregateEventsFromCsv,
  renderSeoAggregateEvents,
} from './seo-export-importer';

describe('SEO export importer', () => {
  it('converts Search Console query CSV rows into safe aggregate events', () => {
    const csv = [
      'Query,Page,Country,Clicks,Impressions,CTR,Position',
      'suplementos trigliceridos,/es/portal/category/cholesterol-triglycerides,Mexico,0,14,0%,66.5',
    ].join('\n');

    const [event] = importSeoAggregateEventsFromCsv(csv, {
      source: 'search_console',
      idPrefix: 'gsc-7d',
      firstSeen: '2026-05-26',
      lastSeen: '2026-06-02',
    });

    expect(event).toMatchObject({
      source: 'search_console',
      query: 'suplementos trigliceridos',
      pagePath: '/es/portal/category/cholesterol-triglycerides',
      country: 'Mexico',
      clicks: 0,
      impressions: 14,
      ctr: 0,
      averagePosition: 66.5,
      firstSeen: '2026-05-26T00:00:00.000Z',
      lastSeen: '2026-06-02T00:00:00.000Z',
    });
    expect(event.id).toMatch(/^gsc-7d-1-/);
  });

  it('uses safe aggregate labels when a Search Console pages export has no query column', () => {
    const csv = [
      'Page,Clicks,Impressions,CTR,Position',
      'https://suplementai.com/es/portal/supplement/citrulline,0,3,0%,89.7',
    ].join('\n');

    const [event] = importSeoAggregateEventsFromCsv(csv, {
      source: 'search_console',
    });

    expect(event).toMatchObject({
      source: 'search_console',
      query: 'search_console page performance',
      pagePath: '/es/portal/supplement/citrulline',
      impressions: 3,
      averagePosition: 89.7,
    });
  });

  it('converts GA4 event exports into aggregate event rows', () => {
    const csv = [
      'Event name,Event count,Session default channel group,Page path,Query,Country',
      'outbound_click,4,Organic Search,/es/portal/results,magnesium,Colombia',
    ].join('\n');

    const [event] = importSeoAggregateEventsFromCsv(csv, {
      source: 'ga4',
      idPrefix: 'ga4-events',
    });

    expect(event).toMatchObject({
      source: 'ga4',
      query: 'magnesium',
      pagePath: '/es/portal/results',
      country: 'Colombia',
      channel: 'Organic Search',
      eventName: 'outbound_click',
      eventCount: 4,
    });
  });

  it('renders JSONL output compatible with the event runner', () => {
    const events = importSeoAggregateEventsFromCsv('Query,Page\nbacopa,/es/portal/supplement/bacopa-monnieri', {
      source: 'search_console',
    });

    expect(renderSeoAggregateEvents(events, 'jsonl')).toBe(`${JSON.stringify(events[0])}\n`);
  });

  it('rejects page values with query params or fragments', () => {
    expect(() =>
      importSeoAggregateEventsFromCsv(
        'Query,Page,Impressions\nmagnesium,https://suplementai.com/es/portal/results?q=magnesium,1',
        { source: 'search_console' }
      )
    ).toThrow(/query params/);

    expect(() =>
      importSeoAggregateEventsFromCsv(
        'Event name,Event count,Page path,Query\noutbound_click,1,/es/portal/results#top,magnesium',
        { source: 'ga4' }
      )
    ).toThrow(/query params/);
  });

  it('rejects PII-like values before output is generated', () => {
    expect(() =>
      importSeoAggregateEventsFromCsv(
        'Event name,Event count,Page path,Query\noutbound_click,1,/es/portal/results,test@example.com',
        { source: 'ga4' }
      )
    ).toThrow(/unsafe or personal data|email/);
  });
});
