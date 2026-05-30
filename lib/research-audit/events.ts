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

export const aggregatedAuditEventSchema = z
  .object({
    id: z.string().min(1).max(120).optional(),
    query: z.string().min(1).max(240),
    normalizedQuery: z.string().min(1).max(120).optional(),
    statusCounts: z.record(z.string(), z.number().int().min(0)).default({}),
    fallbackCounts: z.record(z.string(), z.number().int().min(0)).default({}),
    deterministicPubMedProfile: deterministicPubMedProfileSchema.optional(),
    occurrenceCount: z.number().int().min(1).optional(),
    firstSeen: z.string().datetime().optional(),
    lastSeen: z.string().datetime().optional(),
  })
  .strict();

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

  return {
    valid: true,
    packet: {
      packetId: `rap_event_${safeId}`,
      queryFingerprint: redaction.queryFingerprint,
      redactedQuery: redaction.redactedQuery,
      normalizedQuery: event.normalizedQuery,
      statusCounts: normalizeStatusCounts(event),
      fallbackCounts: event.fallbackCounts,
      deterministicPubMedProfile: event.deterministicPubMedProfile || emptyPubMedProfile,
    },
    rejectionReasons: [],
  };
}

function eventsFromJson(input: unknown): AggregatedAuditEvent[] {
  const parsed = eventsFileSchema.parse(input);
  return Array.isArray(parsed) ? parsed : parsed.events;
}

function normalizeStatusCounts(event: AggregatedAuditEvent): Record<string, number> {
  if (Object.keys(event.statusCounts).length > 0) return event.statusCounts;
  if (event.occurrenceCount) return { observed: event.occurrenceCount };
  return {};
}

