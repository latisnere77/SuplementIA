import { readFileSync } from 'fs';
import path from 'path';
import { z } from 'zod';

const categoriesSchema = z
  .object({
    human_clinical: z.number().int().min(0),
    review: z.number().int().min(0),
    preclinical: z.number().int().min(0),
    phytochemical: z.number().int().min(0),
    other: z.number().int().min(0),
  })
  .strict();

export const auditFixtureSchema = z
  .object({
    id: z.string().min(1),
    redactedQuery: z.string().min(1).max(120),
    normalizedQuery: z.string().min(1).max(120).optional(),
    statusCounts: z.record(z.string(), z.number().int().min(0)),
    fallbackCounts: z.record(z.string(), z.number().int().min(0)).optional(),
    deterministicPubMedProfile: z
      .object({
        totalCount: z.number().int().min(0),
        categories: categoriesSchema,
      })
      .strict(),
    expected: z
      .object({
        allowedTaskTypes: z.array(z.string()).min(1),
        allowedClassifications: z.array(z.string()).min(1),
        requiredAliasesAny: z.array(z.string()).optional(),
        forbiddenTerms: z.array(z.string()).optional(),
      })
      .strict(),
  })
  .strict();

export const auditFixturesFileSchema = z
  .object({
    $schema: z.string().optional(),
    description: z.string(),
    scoring: z.record(z.string(), z.number().int().min(0)),
    fixtures: z.array(auditFixtureSchema).min(1),
  })
  .strict();

export type AuditFixture = z.infer<typeof auditFixtureSchema>;
export type AuditFixturesFile = z.infer<typeof auditFixturesFileSchema>;

export function getDefaultFixturesPath(): string {
  return path.join(process.cwd(), 'docs', 'research-audit-provider-fixtures.json');
}

export function loadAuditFixtures(filePath = getDefaultFixturesPath()): AuditFixture[] {
  const raw = readFileSync(filePath, 'utf8');
  const parsed = auditFixturesFileSchema.parse(JSON.parse(raw));
  return parsed.fixtures;
}

