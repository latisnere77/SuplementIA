import type { AuditFixture } from './fixtures';
import { redactAuditQuery } from './redaction';

export interface ResearchAuditPacket {
  packetId: string;
  queryFingerprint: string;
  redactedQuery: string;
  normalizedQuery?: string;
  statusCounts: Record<string, number>;
  fallbackCounts: Record<string, number>;
  deterministicPubMedProfile: AuditFixture['deterministicPubMedProfile'];
  fixtureContext?: {
    id: string;
    allowedTaskTypes: string[];
    allowedClassifications: string[];
    requiredAliasesAny?: string[];
  };
}

export interface PacketBuildResult {
  valid: boolean;
  packet?: ResearchAuditPacket;
  rejectionReasons: string[];
}

export function buildAuditPacketFromFixture(fixture: AuditFixture): PacketBuildResult {
  const redaction = redactAuditQuery(fixture.redactedQuery);

  if (!redaction.allowed || !redaction.redactedQuery || !redaction.queryFingerprint) {
    return {
      valid: false,
      rejectionReasons: redaction.rejectionReasons,
    };
  }

  return {
    valid: true,
    packet: {
      packetId: `rap_${fixture.id.replace(/[^a-z0-9_-]/gi, '').toLowerCase()}`,
      queryFingerprint: redaction.queryFingerprint,
      redactedQuery: redaction.redactedQuery,
      normalizedQuery: fixture.normalizedQuery,
      statusCounts: fixture.statusCounts,
      fallbackCounts: fixture.fallbackCounts || {},
      deterministicPubMedProfile: fixture.deterministicPubMedProfile,
      fixtureContext: {
        id: fixture.id,
        allowedTaskTypes: fixture.expected.allowedTaskTypes,
        allowedClassifications: fixture.expected.allowedClassifications,
        requiredAliasesAny: fixture.expected.requiredAliasesAny,
      },
    },
    rejectionReasons: [],
  };
}

