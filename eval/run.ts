import fs from "node:fs";
import path from "node:path";
import type { ConverseCommandInput, ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

type JsonObject = { [key: string]: JsonValue };

type Fixture = {
  modelId: string;
  inputTokens?: number;
  outputTokens?: number;
  output: JsonObject | string;
};

type PricingEntry = {
  label: string;
  status: "CONFIRMED" | "NOT_CONFIRMED";
  inputPer1M: number | null;
  outputPer1M: number | null;
  note?: string;
};

type PricingFile = {
  models: Record<string, PricingEntry>;
};

type GoldenFile = {
  supplementId: string;
  metadata?: {
    studiesUsed?: number;
    tokensUsed?: number;
    sourceModel?: string;
  };
  output: JsonObject;
};

type PromptModule = {
  ENRICHMENT_PROMPT_TEMPLATE: string;
  buildEnrichmentPrompt: (
    supplementName: string,
    category?: string,
    studies?: JsonObject[],
    benefitQuery?: string,
  ) => string;
};

type ToolSchemaModule = {
  ENRICHED_CONTENT_TOOL_CONFIG: JsonObject;
};

type ModelCandidate = {
  id: string;
  label: string;
  role: "baseline" | "candidate";
  modelId: string;
  maxTokens: number;
  temperature: number;
  useToolApi: boolean;
};

type PaidModelCandidate = ModelCandidate & {
  inputPer1M: number;
  outputPer1M: number;
  priceSource: string;
};

type CandidateRunResult = {
  candidateId: string;
  modelId: string;
  supplementName: string;
  status: "completed" | "failed";
  latencyMs: number;
  stopReason: string | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  costUsd: number;
  output: JsonObject | null;
  rawText: string | null;
  error: string | null;
  score: CandidateScore;
};

type CandidateScore = {
  total: number;
  dimensions: {
    jsonValid: number;
    requiredFields: number;
    dosageForms: number;
    spanishQuality: number;
    medicalFactualGate: number;
  };
  missingFields: string[];
  spanishScore: number;
  medicalGate: {
    pass: boolean;
    criticalFailures: string[];
    warnings: string[];
    goldenPmids: string[];
    candidatePmids: string[];
  };
};

const REQUIRED_FIELDS = [
  "whatIsIt",
  "primaryUses",
  "dosage",
  "mechanisms",
  "worksFor",
  "limitedEvidence",
  "doesntWorkFor",
  "safety",
  "buyingGuidance",
  "practicalRecommendations",
  "keyStudies",
  "totalStudies",
] as const;

const DEFAULT_AB_CANDIDATES: ModelCandidate[] = [
  {
    id: "sonnet-4.5-baseline",
    label: "Claude Sonnet 4.5 production baseline",
    role: "baseline",
    modelId: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
    maxTokens: 16_000,
    temperature: 0.3,
    useToolApi: true,
  },
  {
    id: "haiku-4.5",
    label: "Claude Haiku 4.5",
    role: "candidate",
    modelId: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
    maxTokens: 16_000,
    temperature: 0.3,
    useToolApi: true,
  },
  {
    id: "nova-lite",
    label: "Amazon Nova Lite",
    role: "candidate",
    modelId: "amazon.nova-lite-v1:0",
    maxTokens: 5_000,
    temperature: 0.3,
    useToolApi: true,
  },
  {
    id: "nova-2-lite",
    label: "Amazon Nova 2 Lite",
    role: "candidate",
    modelId: "amazon.nova-2-lite-v1:0",
    maxTokens: 16_000,
    temperature: 0.3,
    useToolApi: true,
  },
];

const PAID_AB_CANDIDATES: PaidModelCandidate[] = [
  {
    ...DEFAULT_AB_CANDIDATES.find((candidate) => candidate.id === "haiku-4.5")!,
    inputPer1M: 1,
    outputPer1M: 5,
    priceSource:
      "manual fallback: AWS Pricing API/eval pricing did not expose Haiku 4.5 SKU; matches public Anthropic/Bedrock listed rate used for budget cap",
  },
  {
    ...DEFAULT_AB_CANDIDATES.find((candidate) => candidate.id === "nova-lite")!,
    inputPer1M: 0.06,
    outputPer1M: 0.24,
    priceSource: "eval/pricing.json AWS Pricing API confirmed SKU",
  },
];

const SPANISH_MARKERS = [
  " el ",
  " la ",
  " los ",
  " las ",
  " de ",
  " para ",
  " con ",
  " dosis",
  " evidencia",
  " suplemento",
];

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith("--")) continue;
    const key = current.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function listJsonFiles(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join(dir, name))
    .sort();
}

function toObject(output: JsonObject | string): { jsonValid: boolean; value: JsonObject | null } {
  if (typeof output === "string") {
    try {
      const parsed = JSON.parse(output) as JsonValue;
      return {
        jsonValid: parsed !== null && typeof parsed === "object" && !Array.isArray(parsed),
        value: parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as JsonObject) : null,
      };
    } catch {
      return { jsonValid: false, value: null };
    }
  }

  return { jsonValid: true, value: output };
}

function isNonEmpty(value: JsonValue | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function estimateTokens(value: JsonValue): number {
  const serialized = JSON.stringify(value);
  return Math.ceil(serialized.length / 4);
}

function estimateTextTokens(value: string): number {
  return Math.ceil(value.length / 4);
}

function safeJsonValue(value: unknown): JsonValue {
  if (value === null) return null;
  if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((item) => safeJsonValue(item));
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, safeJsonValue(item)]));
  }
  return String(value);
}

function spanishScore(value: JsonValue): number {
  const text = JSON.stringify(value).toLowerCase();
  const hits = SPANISH_MARKERS.filter((marker) => text.includes(marker)).length;
  return hits / SPANISH_MARKERS.length;
}

function scoreFixture(filePath: string, fixture: Fixture) {
  const parsed = toObject(fixture.output);
  const missingFields = parsed.value
    ? REQUIRED_FIELDS.filter((field) => !isNonEmpty(parsed.value?.[field]))
    : [...REQUIRED_FIELDS];
  const dosage = parsed.value?.dosage;
  const hasDosageForms =
    dosage !== null &&
    typeof dosage === "object" &&
    !Array.isArray(dosage) &&
    isNonEmpty((dosage as JsonObject).forms);
  const estimatedOutputTokens = parsed.value ? estimateTokens(parsed.value) : 0;
  const spanish = parsed.value ? spanishScore(parsed.value) : 0;
  const medicalReviewFields = ["dosage", "worksFor", "limitedEvidence", "doesntWorkFor", "safety"];

  return {
    file: path.relative(process.cwd(), filePath),
    modelId: fixture.modelId,
    jsonValid: parsed.jsonValid,
    missingFields,
    hasDosageForms,
    spanishScore: Number(spanish.toFixed(2)),
    estimatedOutputTokens,
    reportedOutputTokens: fixture.outputTokens ?? null,
    medicalReviewRequired: medicalReviewFields,
    pass:
      parsed.jsonValid &&
      missingFields.length === 0 &&
      hasDosageForms &&
      spanish >= 0.4,
  };
}

function normalizeModule<T>(module: T & { default?: T }): T {
  return module.default ?? module;
}

function buildConverseDryRunRequest(candidate: ModelCandidate, prompt: string, toolConfig: JsonObject): JsonObject {
  return {
    modelId: candidate.modelId,
    inferenceConfig: {
      maxTokens: candidate.maxTokens,
      temperature: candidate.temperature,
    },
    messages: [
      {
        role: "user",
        content: [{ text: prompt }],
      },
    ],
    toolConfig: candidate.useToolApi ? toolConfig : undefined,
  } as JsonObject;
}

function buildConverseRequest(candidate: ModelCandidate, prompt: string, toolConfig: JsonObject): ConverseCommandInput {
  return {
    modelId: candidate.modelId,
    inferenceConfig: {
      maxTokens: candidate.maxTokens,
      temperature: candidate.temperature,
    },
    messages: [
      {
        role: "user" as const,
        content: [{ text: prompt }],
      },
    ],
    toolConfig: candidate.useToolApi ? (toolConfig as unknown as ToolConfiguration) : undefined,
  };
}

function medicalFactualGate(output: JsonObject) {
  const dosage = output.dosage;
  const safety = output.safety;
  const keyStudies = Array.isArray(output.keyStudies) ? output.keyStudies : [];
  const keyStudiesWithPmid = keyStudies.filter((study) => {
    if (study === null || typeof study !== "object" || Array.isArray(study)) return false;
    const pmid = (study as JsonObject).pmid ?? (study as JsonObject).PMID;
    return typeof pmid === "string" ? pmid.trim().length > 0 : typeof pmid === "number";
  }).length;

  return {
    dosagePresent: isNonEmpty(dosage),
    dosageFormsPresent:
      dosage !== null &&
      typeof dosage === "object" &&
      !Array.isArray(dosage) &&
      isNonEmpty((dosage as JsonObject).forms),
    safetyPresent: isNonEmpty(safety),
    interactionsPresent:
      safety !== null &&
      typeof safety === "object" &&
      !Array.isArray(safety) &&
      isNonEmpty((safety as JsonObject).interactions),
    keyStudiesCount: keyStudies.length,
    keyStudiesWithPmid,
    pmidCitationRate: keyStudies.length === 0 ? null : Number((keyStudiesWithPmid / keyStudies.length).toFixed(2)),
    humanReviewRequired: ["dosage", "safety.interactions", "keyStudies[].pmid"],
  };
}

function textOf(value: JsonValue | undefined): string {
  if (value === undefined || value === null) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}

function extractPmids(value: JsonValue): string[] {
  const pmids = new Set<string>();
  const visit = (item: JsonValue): void => {
    if (item === null) return;
    if (typeof item === "string") {
      for (const match of item.matchAll(/\b(?:PMID:?\s*)?(\d{7,9})\b/gi)) {
        pmids.add(match[1]);
      }
      return;
    }
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    if (typeof item === "object") {
      for (const [key, nested] of Object.entries(item)) {
        if (/^pmid$/i.test(key) && (typeof nested === "string" || typeof nested === "number")) {
          pmids.add(String(nested).replace(/\D/g, ""));
        }
        visit(nested);
      }
    }
  };
  visit(value);
  return [...pmids].filter(Boolean).sort();
}

function extractDoseNumbers(value: JsonValue | undefined): number[] {
  const text = textOf(value).toLowerCase();
  const values = new Set<number>();
  for (const match of text.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:-|a|to)?\s*(\d+(?:[.,]\d+)?)?\s*(mg|mcg|µg|g|iu|ui|mg\/día|mg\/dia|g\/día|g\/dia)\b/g)) {
    values.add(Number(match[1].replace(",", ".")));
    if (match[2]) values.add(Number(match[2].replace(",", ".")));
  }
  return [...values].filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
}

function hasNearbyDose(value: number, reference: number[]): boolean {
  if (reference.length === 0) return true;
  return reference.some((candidate) => {
    const tolerance = Math.max(10, Math.abs(candidate) * 0.3);
    return Math.abs(candidate - value) <= tolerance;
  });
}

function scoreCandidateOutput(output: JsonObject | null, goldenOutput: JsonObject): CandidateScore {
  if (!output) {
    return {
      total: 0,
      dimensions: {
        jsonValid: 0,
        requiredFields: 0,
        dosageForms: 0,
        spanishQuality: 0,
        medicalFactualGate: 0,
      },
      missingFields: [...REQUIRED_FIELDS],
      spanishScore: 0,
      medicalGate: {
        pass: false,
        criticalFailures: ["missing_or_invalid_json_output"],
        warnings: [],
        goldenPmids: extractPmids(goldenOutput),
        candidatePmids: [],
      },
    };
  }

  const missingFields = REQUIRED_FIELDS.filter((field) => !isNonEmpty(output[field]));
  const dosage = output.dosage;
  const hasDosageForms =
    dosage !== null &&
    typeof dosage === "object" &&
    !Array.isArray(dosage) &&
    isNonEmpty((dosage as JsonObject).forms);
  const spanish = spanishScore(output);
  const goldenPmids = extractPmids(goldenOutput);
  const candidatePmids = extractPmids(output);
  const criticalFailures: string[] = [];
  const warnings: string[] = [];

  const unsupportedPmids = candidatePmids.filter((pmid) => !goldenPmids.includes(pmid));
  if (unsupportedPmids.length > 0) {
    criticalFailures.push(`unsupported_pmids:${unsupportedPmids.join(",")}`);
  }

  const goldenDoseNumbers = extractDoseNumbers(goldenOutput.dosage);
  const candidateDoseNumbers = extractDoseNumbers(output.dosage);
  const unsupportedDoseNumbers = candidateDoseNumbers.filter((value) => !hasNearbyDose(value, goldenDoseNumbers));
  if (unsupportedDoseNumbers.length > 0) {
    criticalFailures.push(`dosage_numeric_drift:${unsupportedDoseNumbers.join(",")}`);
  }

  const goldenInteractions = textOf((goldenOutput.safety as JsonObject | undefined)?.interactions).toLowerCase();
  const candidateInteractions = textOf((output.safety as JsonObject | undefined)?.interactions).toLowerCase();
  if (goldenInteractions.length > 30 && candidateInteractions.length < 30) {
    criticalFailures.push("missing_safety_interactions");
  }

  if (candidateDoseNumbers.length === 0) warnings.push("no_dosage_numbers_detected");
  if (candidateInteractions.length < 30) warnings.push("safety_interactions_sparse");

  const dimensions = {
    jsonValid: 1,
    requiredFields: missingFields.length === 0 ? 1 : Number(((REQUIRED_FIELDS.length - missingFields.length) / REQUIRED_FIELDS.length).toFixed(2)),
    dosageForms: hasDosageForms ? 1 : 0,
    spanishQuality: spanish >= 0.4 ? 1 : Number((spanish / 0.4).toFixed(2)),
    medicalFactualGate: criticalFailures.length === 0 ? 1 : 0,
  };
  const total = Number(
    (
      dimensions.jsonValid * 0.2 +
      dimensions.requiredFields * 0.2 +
      dimensions.dosageForms * 0.15 +
      dimensions.spanishQuality * 0.15 +
      dimensions.medicalFactualGate * 0.3
    ).toFixed(3),
  );

  return {
    total,
    dimensions,
    missingFields,
    spanishScore: Number(spanish.toFixed(2)),
    medicalGate: {
      pass: criticalFailures.length === 0,
      criticalFailures,
      warnings,
      goldenPmids,
      candidatePmids,
    },
  };
}

function extractModelOutput(response: JsonObject): { output: JsonObject | null; rawText: string | null } {
  const content = ((response.output as JsonObject | undefined)?.message as JsonObject | undefined)?.content;
  if (!Array.isArray(content)) return { output: null, rawText: null };

  for (const block of content) {
    if (block && typeof block === "object" && !Array.isArray(block)) {
      const toolUse = (block as JsonObject).toolUse;
      if (toolUse && typeof toolUse === "object" && !Array.isArray(toolUse)) {
        const input = (toolUse as JsonObject).input;
        if (input && typeof input === "object" && !Array.isArray(input)) {
          return { output: input as JsonObject, rawText: null };
        }
      }
    }
  }

  const text = content
    .map((block) => (block && typeof block === "object" && !Array.isArray(block) ? (block as JsonObject).text : null))
    .filter((value): value is string => typeof value === "string")
    .join("\n")
    .trim();
  if (!text) return { output: null, rawText: null };

  try {
    const parsed = JSON.parse(text) as JsonValue;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { output: parsed as JsonObject, rawText: text };
    }
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]) as JsonValue;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return { output: parsed as JsonObject, rawText: text };
        }
      } catch {
        return { output: null, rawText: text };
      }
    }
  }

  return { output: null, rawText: text };
}

function costUsd(inputTokens: number, outputTokens: number, candidate: PaidModelCandidate): number {
  return Number((((inputTokens / 1_000_000) * candidate.inputPer1M) + ((outputTokens / 1_000_000) * candidate.outputPer1M)).toFixed(6));
}

async function loadLivePromptAndTool() {
  const promptModule = normalizeModule(
    (await import("./fixtures/enricher-live-dist/prompts.js")) as unknown as PromptModule & {
      default?: PromptModule;
    },
  );
  const toolSchemaModule = normalizeModule(
    (await import("./fixtures/enricher-live-dist/toolSchema.js")) as unknown as ToolSchemaModule & {
      default?: ToolSchemaModule;
    },
  );
  return { promptModule, toolConfig: toolSchemaModule.ENRICHED_CONTENT_TOOL_CONFIG };
}

async function runDryRunAb(args: Record<string, string | boolean>): Promise<void> {
  const { promptModule, toolConfig } = await loadLivePromptAndTool();
  const goldenDir = typeof args.golden === "string" ? args.golden : "eval/golden";
  const selectedModelId = typeof args["model-id"] === "string" ? args["model-id"] : null;
  const maxTokensOverride = typeof args["max-tokens"] === "string" ? Number(args["max-tokens"]) : null;
  const candidates = DEFAULT_AB_CANDIDATES
    .filter((candidate) => !selectedModelId || candidate.modelId === selectedModelId || candidate.id === selectedModelId)
    .map((candidate) => ({
      ...candidate,
      maxTokens: maxTokensOverride ?? candidate.maxTokens,
    }));

  if (candidates.length === 0) {
    throw new Error(`No A/B candidate matched --model-id ${selectedModelId}`);
  }

  const goldenFiles = listJsonFiles(goldenDir).filter((filePath) => path.basename(filePath) !== "index.json");
  const templateTokens = estimateTextTokens(promptModule.ENRICHMENT_PROMPT_TEMPLATE);
  const toolSchemaTokens = estimateTokens(toolConfig);
  const results = goldenFiles.map((filePath) => {
    const golden = readJsonFile<GoldenFile>(filePath);
    const studies: JsonObject[] = [];
    const prompt = promptModule.buildEnrichmentPrompt(golden.supplementId, "general", studies);
    const promptTokens = estimateTextTokens(prompt);
    const candidateRequests = candidates.map((candidate) => {
      const request = buildConverseDryRunRequest(candidate, prompt, toolConfig);
      return {
        candidateId: candidate.id,
        modelId: candidate.modelId,
        maxTokens: candidate.maxTokens,
        temperature: candidate.temperature,
        useToolApi: candidate.useToolApi,
        estimatedInputTokens: estimateTokens({
          messages: request.messages,
          toolConfig: request.toolConfig,
        } as JsonObject),
      };
    });

    return {
      file: path.relative(process.cwd(), filePath),
      supplementName: golden.supplementId,
      category: "general",
      benefitQuery: null,
      studiesProvided: studies.length,
      productionMetadata: {
        studiesUsed: golden.metadata?.studiesUsed ?? null,
        tokensUsed: golden.metadata?.tokensUsed ?? null,
        sourceModel: golden.metadata?.sourceModel ?? null,
      },
      promptCharacters: prompt.length,
      promptTokensEstimated: promptTokens,
      toolSchemaTokensEstimated: toolSchemaTokens,
      candidateRequests,
      medicalFactualGate: medicalFactualGate(golden.output),
    };
  });

  const totals = results.map((result) => result.candidateRequests[0]?.estimatedInputTokens ?? 0);
  const summary = {
    mode: "dry-run-ab",
    liveInference: "BLOCKED_NOT_INVOKED",
    promptSource: "eval/fixtures/enricher-live-dist/prompts.js",
    promptTemplateCharacters: promptModule.ENRICHMENT_PROMPT_TEMPLATE.length,
    promptTemplateTokensEstimated: templateTokens,
    toolSchemaSource: "eval/fixtures/enricher-live-dist/toolSchema.js",
    toolSchemaTokensEstimated: toolSchemaTokens,
    goldenDir,
    goldenCount: results.length,
    candidates,
    inputTokenEstimateSummary: {
      min: totals.length ? Math.min(...totals) : 0,
      max: totals.length ? Math.max(...totals) : 0,
      totalAcrossGoldenPerCandidate: totals.reduce((sum, value) => sum + value, 0),
      note:
        "Deterministic local estimate from the real Converse input payload. Bedrock CountTokens/live usage was not called.",
    },
    results,
  };

  console.log(JSON.stringify(summary, null, 2));
}

async function runPaidAb(args: Record<string, string | boolean>): Promise<void> {
  const requiredFlags = ["budget-approved", "i-understand-paid-inference"];
  const missingFlags = requiredFlags.filter((flag) => args[flag] !== true);
  if (missingFlags.length > 0) {
    throw new Error(`PAID A/B BLOCKED. Missing flags: ${missingFlags.join(", ")}.`);
  }

  const maxBudgetUsd = typeof args["max-budget-usd"] === "string" ? Number(args["max-budget-usd"]) : 9;
  const goldenDir = typeof args.golden === "string" ? args.golden : "eval/golden";
  const resultsRoot = typeof args["results-dir"] === "string" ? args["results-dir"] : "eval/results";
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = path.join(resultsRoot, `paid-ab-${runId}`);
  const { promptModule, toolConfig } = await loadLivePromptAndTool();
  const goldenFiles = listJsonFiles(goldenDir).filter((filePath) => path.basename(filePath) !== "index.json");
  const projectedInputTokens = goldenFiles.reduce((sum, filePath) => {
    const golden = readJsonFile<GoldenFile>(filePath);
    const prompt = promptModule.buildEnrichmentPrompt(golden.supplementId, "general", []);
    const request = buildConverseDryRunRequest(PAID_AB_CANDIDATES[0], prompt, toolConfig);
    return sum + estimateTokens({ messages: request.messages, toolConfig: request.toolConfig } as JsonObject);
  }, 0);
  const projectedWorstCaseUsd = PAID_AB_CANDIDATES.reduce((sum, candidate) => {
    const outputTokens = goldenFiles.length * candidate.maxTokens;
    return sum + costUsd(projectedInputTokens, outputTokens, candidate);
  }, 0);

  const projection = {
    mode: "paid-ab",
    runId,
    goldenCount: goldenFiles.length,
    candidates: PAID_AB_CANDIDATES.map((candidate) => ({
      id: candidate.id,
      modelId: candidate.modelId,
      maxTokens: candidate.maxTokens,
      inputPer1M: candidate.inputPer1M,
      outputPer1M: candidate.outputPer1M,
      priceSource: candidate.priceSource,
    })),
    projectedInputTokensPerCandidate: projectedInputTokens,
    projectedWorstCaseUsd: Number(projectedWorstCaseUsd.toFixed(6)),
    maxBudgetUsd,
  };
  console.log("Paid A/B budget projection");
  console.log(JSON.stringify(projection, null, 2));
  if (projection.projectedWorstCaseUsd > maxBudgetUsd) {
    throw new Error(`Projected worst-case cost $${projection.projectedWorstCaseUsd} exceeds budget $${maxBudgetUsd}; stopping before Bedrock calls.`);
  }

  const { BedrockRuntimeClient, ConverseCommand } = await import("@aws-sdk/client-bedrock-runtime");
  const client = new BedrockRuntimeClient({ region: "us-east-1" });
  const runs: CandidateRunResult[] = [];

  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, "projection.json"), `${JSON.stringify(projection, null, 2)}\n`);

  for (const filePath of goldenFiles) {
    const golden = readJsonFile<GoldenFile>(filePath);
    const prompt = promptModule.buildEnrichmentPrompt(golden.supplementId, "general", []);
    for (const candidate of PAID_AB_CANDIDATES) {
      console.error(`Invoking ${candidate.id} for ${golden.supplementId} (single run).`);
      const startedAt = Date.now();
      let run: CandidateRunResult;
      try {
        const response = (await client.send(new ConverseCommand(buildConverseRequest(candidate, prompt, toolConfig)))) as unknown as JsonObject;
        const latencyMs = Date.now() - startedAt;
        const usage = response.usage && typeof response.usage === "object" && !Array.isArray(response.usage) ? (response.usage as JsonObject) : {};
        const inputTokens = typeof usage.inputTokens === "number" ? usage.inputTokens : 0;
        const outputTokens = typeof usage.outputTokens === "number" ? usage.outputTokens : 0;
        const totalTokens = typeof usage.totalTokens === "number" ? usage.totalTokens : inputTokens + outputTokens;
        const extracted = extractModelOutput(response);
        run = {
          candidateId: candidate.id,
          modelId: candidate.modelId,
          supplementName: golden.supplementId,
          status: "completed",
          latencyMs,
          stopReason: typeof response.stopReason === "string" ? response.stopReason : null,
          usage: {
            inputTokens,
            outputTokens,
            totalTokens,
          },
          costUsd: costUsd(inputTokens, outputTokens, candidate),
          output: extracted.output,
          rawText: extracted.rawText,
          error: null,
          score: scoreCandidateOutput(extracted.output, golden.output),
        };
      } catch (error) {
        run = {
          candidateId: candidate.id,
          modelId: candidate.modelId,
          supplementName: golden.supplementId,
          status: "failed",
          latencyMs: Date.now() - startedAt,
          stopReason: null,
          usage: {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
          },
          costUsd: 0,
          output: null,
          rawText: null,
          error: error instanceof Error ? error.message : String(error),
          score: scoreCandidateOutput(null, golden.output),
        };
      }
      runs.push(run);
      const fileName = `${String(runs.length).padStart(2, "0")}-${candidate.id}-${path.basename(filePath)}`;
      fs.writeFileSync(path.join(runDir, fileName), `${JSON.stringify(run, null, 2)}\n`);
    }
  }

  const byCandidate = PAID_AB_CANDIDATES.map((candidate) => {
    const candidateRuns = runs.filter((run) => run.candidateId === candidate.id);
    const completed = candidateRuns.filter((run) => run.status === "completed");
    const medicalFailures = candidateRuns.flatMap((run) =>
      run.score.medicalGate.criticalFailures.map((failure) => ({
        supplementName: run.supplementName,
        failure,
      })),
    );
    const totalCostUsd = Number(candidateRuns.reduce((sum, run) => sum + run.costUsd, 0).toFixed(6));
    return {
      candidateId: candidate.id,
      modelId: candidate.modelId,
      completed: completed.length,
      failed: candidateRuns.length - completed.length,
      averageScore:
        candidateRuns.length === 0
          ? 0
          : Number((candidateRuns.reduce((sum, run) => sum + run.score.total, 0) / candidateRuns.length).toFixed(3)),
      medicalGatePasses: candidateRuns.filter((run) => run.score.medicalGate.pass).length,
      medicalGateFailures: medicalFailures.length,
      medicalFailures,
      totalInputTokens: candidateRuns.reduce((sum, run) => sum + run.usage.inputTokens, 0),
      totalOutputTokens: candidateRuns.reduce((sum, run) => sum + run.usage.outputTokens, 0),
      totalCostUsd,
      averageLatencyMs:
        candidateRuns.length === 0
          ? 0
          : Math.round(candidateRuns.reduce((sum, run) => sum + run.latencyMs, 0) / candidateRuns.length),
      priceSource: candidate.priceSource,
    };
  });
  const totalCostUsd = Number(byCandidate.reduce((sum, candidate) => sum + candidate.totalCostUsd, 0).toFixed(6));
  const recommended = byCandidate
    .filter((candidate) => candidate.failed === 0 && candidate.medicalGateFailures === 0 && candidate.averageScore >= 0.9)
    .sort((a, b) => a.totalCostUsd - b.totalCostUsd)[0];
  const summary = {
    mode: "paid-ab",
    runId,
    generatedAt: new Date().toISOString(),
    promptSource: "eval/fixtures/enricher-live-dist/prompts.js",
    toolSchemaSource: "eval/fixtures/enricher-live-dist/toolSchema.js",
    goldenDir,
    goldenCount: goldenFiles.length,
    projection,
    actual: {
      totalCostUsd,
      byCandidate,
    },
    verdict: {
      recommendation: recommended
        ? `Recommend ${recommended.candidateId} for next human review stage; deterministic gates passed.`
        : "No candidate fully cleared deterministic medical gate; do not migrate yet.",
      recommendedCandidateId: recommended?.candidateId ?? null,
    },
  };

  fs.writeFileSync(path.join(runDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(
    path.join(runDir, "SUMMARY.md"),
    [
      `# Paid enricher model A/B - ${runId}`,
      "",
      `Total actual cost: $${totalCostUsd.toFixed(6)}`,
      "",
      "| Candidate | Completed | Failed | Avg score | Medical failures | Input tokens | Output tokens | Cost | Avg latency |",
      "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
      ...byCandidate.map(
        (candidate) =>
          `| ${candidate.candidateId} | ${candidate.completed} | ${candidate.failed} | ${candidate.averageScore} | ${candidate.medicalGateFailures} | ${candidate.totalInputTokens} | ${candidate.totalOutputTokens} | $${candidate.totalCostUsd.toFixed(6)} | ${candidate.averageLatencyMs} ms |`,
      ),
      "",
      `Verdict: ${summary.verdict.recommendation}`,
      "",
      "Medical gate failures:",
      ...byCandidate.flatMap((candidate) =>
        candidate.medicalFailures.length === 0
          ? [`- ${candidate.candidateId}: none`]
          : candidate.medicalFailures.map((failure) => `- ${candidate.candidateId} / ${failure.supplementName}: ${failure.failure}`),
      ),
      "",
    ].join("\n"),
  );

  console.log(JSON.stringify(summary, null, 2));
}

function printCostEstimates(pricingPath: string, inputTokens: number, outputTokens: number): void {
  const pricing = readJsonFile<PricingFile>(pricingPath);
  console.log("\nProjected cost per call");
  for (const [modelId, model] of Object.entries(pricing.models)) {
    if (model.status !== "CONFIRMED" || model.inputPer1M === null || model.outputPer1M === null) {
      console.log(`- ${model.label} (${modelId}): ${model.status}`);
      continue;
    }
    const cost = (inputTokens / 1_000_000) * model.inputPer1M + (outputTokens / 1_000_000) * model.outputPer1M;
    console.log(`- ${model.label} (${modelId}): $${cost.toFixed(6)}`);
  }
}

async function runLive(args: Record<string, string | boolean>): Promise<void> {
  const requiredFlags = ["budget-approved", "i-understand-paid-inference"];
  const missingFlags = requiredFlags.filter((flag) => args[flag] !== true);
  const requiredValues = ["model-id", "prompt-file", "schema-file", "supplement"];
  const missingValues = requiredValues.filter((key) => typeof args[key] !== "string");

  if (missingFlags.length > 0 || missingValues.length > 0) {
    throw new Error(
      `LIVE A/B BLOCKED. Missing flags: ${missingFlags.join(", ") || "none"}. Missing values: ${
        missingValues.join(", ") || "none"
      }. Recovered TS source and budget approval are required.`,
    );
  }

  const modelId = args["model-id"] as string;
  const promptFile = args["prompt-file"] as string;
  const schemaFile = args["schema-file"] as string;
  const supplement = args.supplement as string;

  const promptTemplate = fs.readFileSync(promptFile, "utf8");
  const toolSchema = readJsonFile<JsonObject>(schemaFile);
  const prompt = promptTemplate.replaceAll("{{supplement}}", supplement);

  const { BedrockRuntimeClient, ConverseCommand } = await import("@aws-sdk/client-bedrock-runtime");
  const client = new BedrockRuntimeClient({ region: "us-east-1" });
  const command = new ConverseCommand({
    modelId,
    messages: [
      {
        role: "user",
        content: [{ text: prompt }],
      },
    ],
    toolConfig: {
      tools: [
        {
          toolSpec: {
            name: "emit_enriched_supplement",
            description: "Emit structured supplement enrichment JSON.",
            inputSchema: { json: toolSchema },
          },
        },
      ],
    },
  });

  console.error("About to invoke paid Bedrock Converse because all live gates were provided.");
  const response = await client.send(command);
  console.log(JSON.stringify(response, null, 2));
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const pricingPath = typeof args.pricing === "string" ? args.pricing : "eval/pricing.json";
  const inputTokens = typeof args["input-tokens"] === "string" ? Number(args["input-tokens"]) : 10_000;
  const outputTokens = typeof args["output-tokens"] === "string" ? Number(args["output-tokens"]) : 11_000;

  printCostEstimates(pricingPath, inputTokens, outputTokens);

  if (args["dry-run-ab"] === true) {
    await runDryRunAb(args);
    return;
  }

  if (args["paid-ab"] === true) {
    await runPaidAb(args);
    return;
  }

  if (args.live === true) {
    await runLive(args);
    return;
  }

  const fixturesDir = typeof args.fixtures === "string" ? args.fixtures : "eval/fixtures";
  const scores = listJsonFiles(fixturesDir).map((filePath) => scoreFixture(filePath, readJsonFile<Fixture>(filePath)));
  console.log("\nFixture scores");
  console.log(JSON.stringify(scores, null, 2));

  const failed = scores.filter((score) => !score.pass);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
