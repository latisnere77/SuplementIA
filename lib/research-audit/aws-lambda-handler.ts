import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import {
  DEFAULT_MOONSHOT_SECRET_ID,
} from './aws-secret-loader';
import {
  runAwsResearchAuditReportOnly,
  type AwsResearchAuditReportOnlyResult,
  type ResearchAuditObjectStore,
  type ResearchAuditS3Location,
} from './aws-report-runner';
import type { PmidVerifierOptions } from './pmid-verifier';
import type { ResearchAuditProviderAdapter } from './provider';

export interface ResearchAuditLambdaEvent {
  input: ResearchAuditS3Location;
  output: {
    bucket: string;
    keyPrefix: string;
  };
  useProviderSecret?: boolean;
  secretId?: string;
  region?: string;
  allowPubMedVerifier?: boolean;
  pmidVerifier?: {
    endpoint?: string;
    timeoutMs?: number;
    maxPmids?: number;
  };
}

export interface ResearchAuditLambdaResponse {
  statusCode: 200 | 400 | 500;
  body: string;
}

export interface ResearchAuditLambdaDependencies {
  objectStore?: ResearchAuditObjectStore;
  getSecretValue?: (input: { secretId: string; region: string }) => Promise<string | undefined>;
  provider?: ResearchAuditProviderAdapter;
  pmidFetchFn?: typeof fetch;
}

export function createResearchAuditLambdaHandler(dependencies: ResearchAuditLambdaDependencies = {}) {
  return async function researchAuditLambdaHandler(
    event: ResearchAuditLambdaEvent
  ): Promise<ResearchAuditLambdaResponse> {
    const validation = validateLambdaEvent(event);
    if (!validation.valid) {
      return jsonResponse(400, {
        ok: false,
        error: validation.error,
      });
    }

    try {
      const region = event.region || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
      const result = await runAwsResearchAuditReportOnly({
        input: event.input,
        output: event.output,
        objectStore: dependencies.objectStore ?? createS3ObjectStore(region),
        useProviderSecret: Boolean(event.useProviderSecret),
        secretId: event.secretId || DEFAULT_MOONSHOT_SECRET_ID,
        region,
        getSecretValue: dependencies.getSecretValue ?? createSecretsGetter(region),
        provider: dependencies.provider,
        pmidVerifier: buildLambdaPmidVerifierOptions(event, dependencies.pmidFetchFn),
      });

      return jsonResponse(200, buildLambdaSuccessBody(result));
    } catch (error) {
      return jsonResponse(500, {
        ok: false,
        error: 'research audit report-only run failed',
        message: error instanceof Error ? error.message : 'unknown error',
      });
    }
  };
}

export const handler = createResearchAuditLambdaHandler();

function validateLambdaEvent(event: ResearchAuditLambdaEvent): { valid: true } | { valid: false; error: string } {
  if (!event || typeof event !== 'object') return { valid: false, error: 'event must be an object' };
  if (!event.input?.bucket || !event.input.key) {
    return { valid: false, error: 'event.input.bucket and event.input.key are required' };
  }
  if (!event.output?.bucket || !event.output.keyPrefix) {
    return { valid: false, error: 'event.output.bucket and event.output.keyPrefix are required' };
  }

  return { valid: true };
}

function buildLambdaPmidVerifierOptions(
  event: ResearchAuditLambdaEvent,
  fetchFn?: typeof fetch
): PmidVerifierOptions | false {
  if (!event.allowPubMedVerifier) return false;

  return {
    endpoint: event.pmidVerifier?.endpoint,
    timeoutMs: event.pmidVerifier?.timeoutMs,
    maxPmids: event.pmidVerifier?.maxPmids,
    fetchFn,
  };
}

function buildLambdaSuccessBody(result: AwsResearchAuditReportOnlyResult) {
  return {
    ok: true,
    dryRun: result.report.dryRun,
    reportOnly: result.report.reportOnly,
    enabled: result.report.enabled,
    totalPackets: result.report.totalPackets,
    skippedPackets: result.report.skippedPackets,
    validationFailures: result.report.validationFailures,
    externalCalls: result.report.externalCalls,
    totalCostEstimateUsd: result.report.totalCostEstimateUsd,
    outputs: {
      json: result.objects.json,
      markdown: result.objects.markdown,
      summary: result.objects.summary,
    },
  };
}

function jsonResponse(statusCode: ResearchAuditLambdaResponse['statusCode'], body: unknown): ResearchAuditLambdaResponse {
  return {
    statusCode,
    body: JSON.stringify(body),
  };
}

function createS3ObjectStore(region: string): ResearchAuditObjectStore {
  const client = new S3Client({ region });

  return {
    async getText(location) {
      const response = await client.send(new GetObjectCommand({
        Bucket: location.bucket,
        Key: location.key,
      }));

      return bodyToString(response.Body);
    },
    async putText(location, body, contentType) {
      await client.send(new PutObjectCommand({
        Bucket: location.bucket,
        Key: location.key,
        Body: body,
        ContentType: contentType,
      }));
    },
  };
}

function createSecretsGetter(region: string) {
  const client = new SecretsManagerClient({ region });

  return async (input: { secretId: string; region: string }) => {
    const response = await client.send(new GetSecretValueCommand({
      SecretId: input.secretId,
    }));

    return response.SecretString;
  };
}

async function bodyToString(body: unknown): Promise<string> {
  if (!body) return '';
  if (typeof body === 'string') return body;
  if (body instanceof Uint8Array) return Buffer.from(body).toString('utf8');
  if (hasTransformToString(body)) return body.transformToString();
  if (isAsyncIterable(body)) {
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks).toString('utf8');
  }

  throw new Error('unsupported S3 object body type');
}

function hasTransformToString(body: unknown): body is { transformToString: () => Promise<string> } {
  return typeof (body as { transformToString?: unknown }).transformToString === 'function';
}

function isAsyncIterable(body: unknown): body is AsyncIterable<Uint8Array | Buffer | string> {
  return typeof (body as { [Symbol.asyncIterator]?: unknown })?.[Symbol.asyncIterator] === 'function';
}
