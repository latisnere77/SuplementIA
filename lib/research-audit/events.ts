import { readFileSync } from 'fs';
import { z } from 'zod';
import { redactAuditQuery } from './redaction';
import type { PacketBuildResult, ResearchAuditPacket } from './packets';

const categoriesSchema = z
  .object({
    human_clinical: z.number().int().min(0),
    review: z.number().int().min(0),
    preclinical: z.number().int().min(0),
    phytochemical: z.number().int().min(0),
    other: z.number().int().min(0),
  })
  .strict();

const deterministicPubMedProfileSchema = z
  .object({
    totalCount: z.number().int().min(0),
    categories: categoriesSchema,
  })
  .strict();

const seoSourceSchema = z.enum(['search_console', 'ga4']);

const safeSeoTextSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[^\n\r<>?]{1,120}$/);

const safeCountrySchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[A-Za-zÀ-ÿ ._-]+$/);

const piiLikePattern =
  /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|https?:\/\/|www\.|[?&][a-z0-9_-]+=|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b)/i;

const pagePathSchema = z
  .string()
  .min(1)
  .max(240)
  .refine((value) => value.startsWith('/'), 'pagePath must be a path, not a full URL')
  .refine((value) => !value.includes('?') && !value.includes('#'), 'pagePath must not include query params or fragments')
  .refine((value) => !/^https?:\/\//i.test(value), 'pagePath must not be a full URL')
  .refine((value) => !piiLikePattern.test(value), 'pagePath contains unsafe or personal data');

export const aggregatedAuditEventSchema = z
  .object({
    source: z
      .union([
        z.enum(['portal_outcome', 'analytics', 'discovery_queue', 'canary', 'manual']),
        seoSourceSchema,
      ])
      .optional(),
    id: z.string().min(1).max(120).optional(),
    query: z.string().min(1).max(240),
    normalizedQuery: z.string().min(1).max(120).optional(),
    pagePath: pagePathSchema.optional(),
    country: safeCountrySchema.optional(),
    clicks: z.number().int().min(0).optional(),
    impressions: z.number().int().min(0).optional(),
    ctr: z.number().min(0).max(100).optional(),
    averagePosition: z.number().min(0).max(1000).optional(),
    channel: safeSeoTextSchema.optional(),
    eventName: safeSeoTextSchema.optional(),
    eventCount: z.number().int().min(0).optional(),
    statusCounts: z.record(z.string(), z.number().int().min(0)).default({}),
    fallbackCounts: z.record(z.string(), z.number().int().min(0)).default({}),
    deterministicPubMedProfile: deterministicPubMedProfileSchema.optional(),
    occurrenceCount: z.number().int().min(1).optional(),
    firstSeen: z.string().datetime().optional(),
    lastSeen: z.string().datetime().optional(),
  })
  .strict()
  .superRefine((event, ctx) => {
    if (!isSeoSource(event.source)) return;

    if (!event.pagePath) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pagePath'],
        message: 'SEO aggregate events require pagePath',
      });
    }

    for (const key of ['query', 'normalizedQuery', 'country', 'channel', 'eventName'] as const) {
      const value = event[key];
      if (typeof value === 'string' && piiLikePattern.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} contains unsafe or personal data`,
        });
      }
    }
  });

const eventsFileSchema = z.union([
  z.array(aggregatedAuditEventSchema),
  z
    .object({
      events: z.array(aggregatedAuditEventSchema),
    })
    .strict(),
]);

export type AggregatedAuditEvent = z.infer<typeof aggregatedAuditEventSchema>;

const emptyPubMedProfile: ResearchAuditPacket['deterministicPubMedProfile'] = {
  totalCount: 0,
  categories: {
    human_clinical: 0,
    review: 0,
    preclinical: 0,
    phytochemical: 0,
    other: 0,
  },
};

export function loadAggregatedAuditEvents(filePath: string): AggregatedAuditEvent[] {
  const raw = readFileSync(filePath, 'utf8');
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const parsed = filePath.endsWith('.jsonl')
    ? trimmed.split(/\n+/).map((line) => aggregatedAuditEventSchema.parse(JSON.parse(line)))
    : eventsFromJson(JSON.parse(trimmed));

  return parsed;
}

export function buildAuditPacketFromEvent(event: AggregatedAuditEvent): PacketBuildResult {
  const redaction = redactAuditQuery(event.query);

  if (!redaction.allowed || !redaction.redactedQuery || !redaction.queryFingerprint) {
    return {
      valid: false,
      rejectionReasons: redaction.rejectionReasons,
    };
  }

  const safeId = (event.id || redaction.queryFingerprint).replace(/[^a-z0-9_-]/gi, '').toLowerCase();
  const seoAggregate = buildSeoAggregate(event);

  return {
    valid: true,
    packet: {
      packetId: `rap_event_${safeId}`,
      auditKind: seoAggregate ? 'seo_aggregate' : 'portal_event',
      queryFingerprint: redaction.queryFingerprint,
      redactedQuery: redaction.redactedQuery,
      normalizedQuery: event.normalizedQuery,
      statusCounts: normalizeStatusCounts(event),
      fallbackCounts: event.fallbackCounts,
      deterministicPubMedProfile: event.deterministicPubMedProfile || emptyPubMedProfile,
      seoAggregate,
    },
    rejectionReasons: [],
  };
}

function eventsFromJson(input: unknown): AggregatedAuditEvent[] {
  const parsed = eventsFileSchema.parse(input);
  return Array.isArray(parsed) ? parsed : parsed.events;
}

function normalizeStatusCounts(event: AggregatedAuditEvent): Record<string, number> {
  if (isSeoSource(event.source)) {
    return normalizeSeoStatusCounts(event);
  }
  if (Object.keys(event.statusCounts).length > 0) return event.statusCounts;
  if (event.occurrenceCount) return { observed: event.occurrenceCount };
  return {};
}

function isSeoSource(source: AggregatedAuditEvent['source']): source is 'search_console' | 'ga4' {
  return source === 'search_console' || source === 'ga4';
}

function normalizeSeoStatusCounts(event: AggregatedAuditEvent): Record<string, number> {
  const counts: Record<string, number> = {};
  if (typeof event.impressions === 'number') counts.impressions = event.impressions;
  if (typeof event.clicks === 'number') counts.clicks = event.clicks;
  if (typeof event.eventCount === 'number') counts[event.eventName || 'events'] = event.eventCount;
  if (Object.keys(counts).length > 0) return counts;
  if (event.occurrenceCount) return { observed: event.occurrenceCount };
  return {};
}

function buildSeoAggregate(
  event: AggregatedAuditEvent
): ResearchAuditPacket['seoAggregate'] | undefined {
  if (!isSeoSource(event.source) || !event.pagePath) return undefined;

  return {
    source: event.source,
    pagePath: event.pagePath,
    country: event.country,
    clicks: event.clicks,
    impressions: event.impressions,
    ctr: event.ctr,
    averagePosition: event.averagePosition,
    channel: event.channel,
    eventName: event.eventName,
    eventCount: event.eventCount,
    firstSeen: event.firstSeen,
    lastSeen: event.lastSeen,
  };
}
