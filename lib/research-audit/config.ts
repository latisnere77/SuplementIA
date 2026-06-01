import { z } from 'zod';
import { auditModels, type ResearchAuditFinding } from './schema';

const DEFAULT_KIMI_ENDPOINT = 'https://api.moonshot.ai/v1/chat/completions';

const auditProviderSchema = z.enum(['kimi']);

const configSchema = z
  .object({
    enabled: z.boolean(),
    dryRun: z.literal(true),
    provider: auditProviderSchema,
    model: z.enum(auditModels),
    endpoint: z.string().url(),
    apiKey: z.string().min(1).optional(),
    maxEventsPerRun: z.number().int().min(1).max(100),
    maxInputTokensPerEvent: z.number().int().min(250).max(8000),
    maxOutputTokensPerEvent: z.number().int().min(100).max(1500),
    maxSpendUsdPerRun: z.number().min(0).max(10),
    requestTimeoutMs: z.number().int().min(1000).max(90000),
  })
  .strict()
  .refine((config) => config.provider !== 'kimi' || config.model.startsWith('kimi-'), {
    path: ['model'],
    message: 'Kimi provider requires a Kimi model',
  });

export type AuditProviderAdapterName = z.infer<typeof auditProviderSchema>;
export type ResearchAuditProviderConfig = z.infer<typeof configSchema>;

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

function parseInteger(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function parseNumber(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function defaultModelForProvider(provider: AuditProviderAdapterName): ResearchAuditFinding['model'] {
  if (provider === 'kimi') return 'kimi-k2.6';
  return 'kimi-k2.6';
}

export function loadResearchAuditProviderConfig(
  env: NodeJS.ProcessEnv = process.env
): ResearchAuditProviderConfig {
  const provider = auditProviderSchema.parse(env.AUDIT_AGENT_PROVIDER || 'kimi');
  const model = (env.AUDIT_AGENT_MODEL || defaultModelForProvider(provider)) as ResearchAuditFinding['model'];

  return configSchema.parse({
    enabled: parseBoolean(env.AUDIT_AGENT_ENABLED, false),
    dryRun: parseBoolean(env.AUDIT_AGENT_DRY_RUN, true),
    provider,
    model,
    endpoint: env.AUDIT_AGENT_PROVIDER_ENDPOINT || DEFAULT_KIMI_ENDPOINT,
    apiKey: env.MOONSHOT_API_KEY || env.KIMI_API_KEY,
    maxEventsPerRun: parseInteger(env.AUDIT_AGENT_MAX_EVENTS_PER_RUN, 50),
    maxInputTokensPerEvent: parseInteger(env.AUDIT_AGENT_MAX_INPUT_TOKENS_PER_EVENT, 8000),
    maxOutputTokensPerEvent: parseInteger(env.AUDIT_AGENT_MAX_OUTPUT_TOKENS_PER_EVENT, 1500),
    maxSpendUsdPerRun: parseNumber(env.AUDIT_AGENT_MAX_SPEND_USD_PER_RUN, 5),
    requestTimeoutMs: parseInteger(env.AUDIT_AGENT_REQUEST_TIMEOUT_MS, 15000),
  });
}
