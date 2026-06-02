import { z } from 'zod';
import { validatePmids } from './pmid';

export const auditProviders = ['kimi', 'openai', 'google', 'anthropic'] as const;

export const auditModels = [
  'kimi-k2.6',
  'kimi-k2.5',
  'gpt-5.4-nano',
  'gpt-5.4-mini',
  'gemini-flash-lite',
  'claude-haiku-4.5',
] as const;

export const auditTaskTypes = [
  'alias_gap',
  'recall_gap',
  'clinical_claim_risk',
  'pipeline_failure',
  'seo_opportunity',
] as const;

export const auditClassifications = [
  'needs_human_review',
  'likely_insufficient_data',
  'possible_recall_gap',
  'operational_bug',
] as const;

const safeShortText = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[^\n\r<>]{1,120}$/);

const pmidSchema = z.string().regex(/^[1-9][0-9]{0,9}$/);

const unsafeActionPattern =
  /(worksFor|worksfor|sirve para|treats|cures|buy now|affiliate|checkout|iherb|amazon|recommend this supplement to users)/i;

export const tokenEstimateSchema = z
  .object({
    input: z.number().int().min(0).max(8000),
    output: z.number().int().min(0).max(1500),
  })
  .strict();

export const researchAuditFindingSchema = z
  .object({
    findingId: z.string().regex(/^raf_[a-z0-9_-]{8,80}$/),
    createdAt: z.string().datetime(),
    provider: z.enum(auditProviders),
    model: z.enum(auditModels),
    taskType: z.enum(auditTaskTypes),
    severity: z.enum(['low', 'medium', 'high']),
    supplementName: safeShortText,
    originalQueries: z.array(safeShortText).min(1).max(10),
    problemDetected: z.string().min(1).max(1000),
    evidenceBoundary: z.enum([
      'human_clinical_required',
      'preclinical_only',
      'editorial_only',
      'operational_only',
    ]),
    suggestedAliases: z.array(safeShortText).max(12),
    candidatePmids: z.array(pmidSchema).max(20),
    validatedPmids: z.array(pmidSchema).max(20),
    pmidVerificationStatus: z.enum([
      'not_checked',
      'all_valid',
      'partially_valid',
      'none_valid',
      'entity_mismatch',
      'verification_failed',
    ]),
    proposedClassification: z.enum(auditClassifications),
    clinicalRisk: z.enum(['none', 'low', 'medium', 'high']),
    recommendedAction: z
      .string()
      .min(1)
      .max(1200)
      .refine((value) => !unsafeActionPattern.test(value), {
        message: 'recommendedAction contains production-facing clinical, product, or affiliate language',
      }),
    blockedFromProduction: z.literal(true),
    requiresHumanReview: z.literal(true),
    confidence: z.number().min(0).max(1),
    redactionApplied: z.literal(true),
    costEstimateUsd: z.number().min(0).max(1),
    tokenEstimate: tokenEstimateSchema,
    notesForReviewer: z.string().max(1200).optional(),
  })
  .strict()
  .superRefine((finding, ctx) => {
    const validated = validatePmids(finding.validatedPmids);
    if (validated.invalidPmids.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['validatedPmids'],
        message: 'validatedPmids contains invalid PMID values',
      });
    }

    const candidates = new Set(finding.candidatePmids);
    for (const pmid of finding.validatedPmids) {
      if (!candidates.has(pmid)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['validatedPmids'],
          message: 'validatedPmids must be a subset of candidatePmids',
        });
        break;
      }
    }

    if (finding.clinicalRisk !== 'none' && !finding.requiresHumanReview) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['requiresHumanReview'],
        message: 'clinical risk findings require human review',
      });
    }

    if (finding.taskType === 'seo_opportunity') {
      if (finding.clinicalRisk !== 'none') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['clinicalRisk'],
          message: 'seo_opportunity findings must use clinicalRisk=none',
        });
      }

      if (
        finding.evidenceBoundary !== 'editorial_only' &&
        finding.evidenceBoundary !== 'operational_only'
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['evidenceBoundary'],
          message: 'seo_opportunity findings must stay editorial_only or operational_only',
        });
      }

      if (finding.candidatePmids.length > 0 || finding.validatedPmids.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['candidatePmids'],
          message: 'seo_opportunity findings must not carry PMIDs',
        });
      }
    }
  });

export type ResearchAuditFinding = z.infer<typeof researchAuditFindingSchema>;

export interface FindingValidationResult {
  valid: boolean;
  finding?: ResearchAuditFinding;
  rejectionReasons: string[];
}

export function validateResearchAuditFinding(input: unknown): FindingValidationResult {
  const result = researchAuditFindingSchema.safeParse(input);

  if (result.success) {
    return {
      valid: true,
      finding: result.data,
      rejectionReasons: [],
    };
  }

  return {
    valid: false,
    rejectionReasons: result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      return `${path}${issue.message}`;
    }),
  };
}
