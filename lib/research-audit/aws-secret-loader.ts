import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export const DEFAULT_MOONSHOT_SECRET_ID = 'suplementia/research-audit/moonshot-api-key';
export const DEFAULT_GITHUB_ISSUE_TOKEN_SECRET_ID = 'suplementia/research-audit/github-issue-token';

const execFileAsync = promisify(execFile);

type GetSecretValue = (input: { secretId: string; region: string }) => Promise<string | undefined>;

export type ResearchAuditSecretLoaderOptions = {
  enabled: boolean;
  existingApiKey?: string;
  secretId?: string;
  region?: string;
  getSecretValue?: GetSecretValue;
  env?: NodeJS.ProcessEnv;
};

export type ResearchAuditGitHubTokenLoaderOptions = Omit<
  ResearchAuditSecretLoaderOptions,
  'existingApiKey'
> & {
  existingToken?: string;
};

function defaultAwsRegion(env: NodeJS.ProcessEnv): string {
  return env.AWS_REGION || env.AWS_DEFAULT_REGION || 'us-east-1';
}

function parseSecretValue(secretText: string, fieldNames: string[]): string | undefined {
  const trimmed = secretText.trim();
  if (!trimmed) return undefined;

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== 'object') return trimmed;

    const fields = parsed as Record<string, unknown>;
    for (const key of fieldNames) {
      const value = fields[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  } catch {
    return trimmed;
  }

  return undefined;
}

async function getSecretValueWithAwsCli(input: { secretId: string; region: string }): Promise<string | undefined> {
  const { stdout } = await execFileAsync('aws', [
    'secretsmanager',
    'get-secret-value',
    '--secret-id',
    input.secretId,
    '--region',
    input.region,
    '--query',
    'SecretString',
    '--output',
    'text',
  ]);
  const value = stdout.trim();

  return value && value !== 'None' ? value : undefined;
}

export async function loadResearchAuditProviderApiKey(
  options: ResearchAuditSecretLoaderOptions
): Promise<string | undefined> {
  if (options.existingApiKey) return options.existingApiKey;
  if (!options.enabled) return undefined;

  const env = options.env ?? process.env;
  const secretId = options.secretId || DEFAULT_MOONSHOT_SECRET_ID;
  const region = options.region || defaultAwsRegion(env);
  const getSecretValue = options.getSecretValue ?? getSecretValueWithAwsCli;
  const secretText = await getSecretValue({ secretId, region });

  return secretText
    ? parseSecretValue(secretText, ['MOONSHOT_API_KEY', 'KIMI_API_KEY', 'apiKey', 'moonshotApiKey'])
    : undefined;
}

export async function loadResearchAuditGitHubIssueToken(
  options: ResearchAuditGitHubTokenLoaderOptions
): Promise<string | undefined> {
  if (options.existingToken) return options.existingToken;
  if (!options.enabled) return undefined;

  const env = options.env ?? process.env;
  const secretId = options.secretId || DEFAULT_GITHUB_ISSUE_TOKEN_SECRET_ID;
  const region = options.region || defaultAwsRegion(env);
  const getSecretValue = options.getSecretValue ?? getSecretValueWithAwsCli;
  const secretText = await getSecretValue({ secretId, region });

  return secretText
    ? parseSecretValue(secretText, ['GITHUB_ISSUE_TOKEN', 'GITHUB_TOKEN', 'token', 'githubToken'])
    : undefined;
}
