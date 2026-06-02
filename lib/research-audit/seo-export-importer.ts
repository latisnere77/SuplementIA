import { createHash } from 'crypto';
import { aggregatedAuditEventSchema, type AggregatedAuditEvent } from './events';

export type SeoExportSource = 'search_console' | 'ga4';
export type SeoExportOutputFormat = 'json' | 'jsonl';

export interface SeoExportImportOptions {
  source: SeoExportSource;
  idPrefix?: string;
  defaultQuery?: string;
  firstSeen?: string;
  lastSeen?: string;
}

type CsvRow = Record<string, string>;

const queryColumns = ['query', 'queries', 'top queries', 'search query', 'search term', 'search_term'];
const pageColumns = [
  'page',
  'pages',
  'top pages',
  'page path',
  'page_path',
  'page path and screen class',
  'landing page',
  'landing page + query string',
  'page location',
  'url',
];
const countryColumns = ['country', 'countries'];
const clicksColumns = ['clicks'];
const impressionsColumns = ['impressions'];
const ctrColumns = ['ctr'];
const positionColumns = ['position', 'avg position', 'avg. position', 'average position'];
const channelColumns = [
  'channel',
  'default channel group',
  'session default channel group',
  'first user default channel group',
];
const eventNameColumns = ['event name', 'event', 'eventname'];
const eventCountColumns = ['event count', 'eventcount', 'events', 'count'];

export function importSeoAggregateEventsFromCsv(
  csvContent: string,
  options: SeoExportImportOptions
): AggregatedAuditEvent[] {
  const rows = parseCsv(csvContent);
  return rows.map((row, index) => buildEventFromRow(row, index, options));
}

export function renderSeoAggregateEvents(
  events: AggregatedAuditEvent[],
  format: SeoExportOutputFormat
): string {
  if (format === 'jsonl') {
    return `${events.map((event) => JSON.stringify(event)).join('\n')}\n`;
  }

  return `${JSON.stringify(events, null, 2)}\n`;
}

function buildEventFromRow(
  row: CsvRow,
  index: number,
  options: SeoExportImportOptions
): AggregatedAuditEvent {
  const query = getValue(row, queryColumns) || options.defaultQuery || defaultQueryForRow(row, options.source);
  const pagePath = normalizePagePath(getValue(row, pageColumns));
  const country = normalizeOptionalText(getValue(row, countryColumns));
  const firstSeen = normalizeDateTime(getValue(row, ['firstseen', 'first seen', 'start date']) || options.firstSeen);
  const lastSeen = normalizeDateTime(getValue(row, ['lastseen', 'last seen', 'end date', 'date']) || options.lastSeen);

  const event: AggregatedAuditEvent = {
    source: options.source,
    id: buildEventId(options.idPrefix || options.source, index, row),
    query,
    pagePath,
    country,
    statusCounts: {},
    fallbackCounts: {},
    firstSeen,
    lastSeen,
    clicks: parseInteger(getValue(row, clicksColumns)),
    impressions: parseInteger(getValue(row, impressionsColumns)),
    ctr: parsePercent(getValue(row, ctrColumns)),
    averagePosition: parseNumber(getValue(row, positionColumns)),
    channel: normalizeOptionalText(getValue(row, channelColumns)),
    eventName: normalizeOptionalText(getValue(row, eventNameColumns)),
    eventCount: parseInteger(getValue(row, eventCountColumns)),
  };

  return aggregatedAuditEventSchema.parse(stripUndefined(event));
}

function parseCsv(content: string): CsvRow[] {
  const rows = parseCsvRows(content);
  if (rows.length === 0) return [];

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((header) => normalizeHeader(header));

  return dataRows
    .filter((row) => row.some((value) => value.trim()))
    .map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, row[index]?.trim() || '']))
    );
}

function parseCsvRows(content: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  if (current || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows.filter((csvRow) => csvRow.some((value) => value.trim()));
}

function getValue(row: CsvRow, columns: string[]): string | undefined {
  for (const column of columns) {
    const value = row[normalizeHeader(column)];
    if (value) return value;
  }

  return undefined;
}

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizePagePath(value: string | undefined): string {
  if (!value) return '/';

  const trimmed = value.trim();
  if (!trimmed) return '/';

  if (/[?#]/.test(trimmed)) {
    throw new Error('SEO export page values must not include query params or fragments');
  }

  if (/^https?:\/\//i.test(trimmed)) {
    const parsed = new URL(trimmed);
    if (parsed.search || parsed.hash) {
      throw new Error('SEO export page URLs must not include query params or fragments');
    }
    return parsed.pathname || '/';
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeDateTime(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;

  if (/^\d{8}$/.test(normalized)) {
    const year = normalized.slice(0, 4);
    const month = normalized.slice(4, 6);
    const day = normalized.slice(6, 8);
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`).toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return new Date(`${normalized}T00:00:00.000Z`).toISOString();
  }

  return new Date(normalized).toISOString();
}

function parseInteger(value: string | undefined): number | undefined {
  const parsed = parseNumber(value);
  return typeof parsed === 'number' ? Math.max(0, Math.round(parsed)) : undefined;
}

function parsePercent(value: string | undefined): number | undefined {
  const parsed = parseNumber(value?.replace('%', ''));
  return parsed;
}

function parseNumber(value: string | undefined): number | undefined {
  const normalized = value?.replace(/,/g, '').trim();
  if (!normalized) return undefined;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function defaultQueryForRow(row: CsvRow, source: SeoExportSource): string {
  const eventName = getValue(row, eventNameColumns);
  if (eventName) return `${source} ${eventName}`;

  const page = getValue(row, pageColumns);
  if (page) return `${source} page performance`;

  const country = getValue(row, countryColumns);
  if (country) return `${source} country performance`;

  return `${source} aggregate`;
}

function buildEventId(prefix: string, index: number, row: CsvRow): string {
  const fingerprint = createHash('sha256')
    .update(JSON.stringify(row))
    .digest('hex')
    .slice(0, 8);
  const safePrefix = prefix.replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
  return `${safePrefix}-${index + 1}-${fingerprint}`;
}

function stripUndefined<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as T;
}
