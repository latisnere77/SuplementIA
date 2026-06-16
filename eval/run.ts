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
    bedrockDuration?: number;
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
    fabricatedPmids: string[];
    validPmids: string[];
    candidatePmids: string[];
    dangerousDoseFlags: string[];
    interactionsPresent: boolean;
  };
};

type PmidCache = Record<string, { exists: boolean; checkedAt: string }>;

type DoseMention = {
  raw: string;
  first: number;
  second: number | null;
  unit: string;
};

type CorrectedAggregate = {
  candidateId: string;
  modelId: string;
  completed: number;
  failed: number;
  averageScore: number;
  medicalGatePasses: number;
  medicalGateFailures: number;
  fabricatedPmids: string[];
  dangerousDoseFlags: string[];
  missingSafetyInteractions: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  costPerCompletedUsd: number | null;
  averageLatencyMs: number;
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
      for (const match of item.matchAll(/\bPMID:?\s*(\d{1,9})\b/gi)) {
        pmids.add(match[1]);
      }
      for (const match of item.matchAll(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d{1,9})/gi)) {
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

function extractDoseMentions(value: JsonValue | undefined): DoseMention[] {
  const text = textOf(value).toLowerCase();
  const mentions: DoseMention[] = [];
  const dosePattern =
    /(\d+(?:[.,]\d+)?)\s*(?:(?:-|–|—|a|to)\s*(\d+(?:[.,]\d+)?))?\s*(mg\/día|mg\/dia|g\/día|g\/dia|mcg|µg|ug|mg|g|iu|ui)\b/gi;
  for (const match of text.matchAll(dosePattern)) {
    const first = Number(match[1].replace(",", "."));
    const second = match[2] ? Number(match[2].replace(",", ".")) : null;
    const unit = match[3].replace("/día", "").replace("/dia", "").replace("ug", "mcg");
    if (Number.isFinite(first) && (second === null || Number.isFinite(second))) {
      mentions.push({
        raw: match[0],
        first,
        second,
        unit,
      });
    }
  }
  return mentions;
}

function findDangerousDoseFlags(value: JsonValue | undefined): string[] {
  return extractDoseMentions(value).flatMap((mention) => {
    const flags: string[] = [];
    const values = [mention.first, mention.second].filter((item): item is number => item !== null);
    if (values.some((item) => item < 0)) {
      flags.push(`${mention.raw}:negative-dose`);
    }
    if (mention.second !== null && mention.second < mention.first) {
      flags.push(`${mention.raw}:descending-range`);
    }

    const max = Math.max(...values);
    if (mention.unit === "mg" && max > 100_000) flags.push(`${mention.raw}:extreme-mg-dose`);
    if (mention.unit === "g" && max > 1_000) flags.push(`${mention.raw}:extreme-g-dose`);
    if ((mention.unit === "mcg" || mention.unit === "µg") && max > 1_000_000) flags.push(`${mention.raw}:extreme-mcg-dose`);
    if ((mention.unit === "iu" || mention.unit === "ui") && max > 10_000_000) flags.push(`${mention.raw}:extreme-iu-dose`);
    return flags;
  });
}

function hasMeaningfulInteractions(output: JsonObject): boolean {
  const safety = output.safety;
  const interactions =
    safety !== null && typeof safety === "object" && !Array.isArray(safety)
      ? (safety as JsonObject).interactions
      : undefined;
  if (typeof interactions === "string") return interactions.trim().length >= 30;
  if (Array.isArray(interactions)) return interactions.length > 0;
  if (interactions && typeof interactions === "object") return Object.keys(interactions).length > 0;

  const safetyText = textOf(safety).toLowerCase();
  if (safetyText.length < 80) return false;
  return [
    "interaccion",
    "interacción",
    "interaction",
    "medicament",
    "fármaco",
    "farmaco",
    "drug",
    "anticoagul",
    "diabetes",
    "hipogluc",
    "embarazo",
    "pregnan",
  ].some((marker) => safetyText.includes(marker));
}

function scoreCandidateOutput(output: JsonObject | null, pmidCache: PmidCache = {}): CandidateScore {
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
        fabricatedPmids: [],
        validPmids: [],
        candidatePmids: [],
        dangerousDoseFlags: [],
        interactionsPresent: false,
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
  const candidatePmids = extractPmids(output);
  const criticalFailures: string[] = [];
  const warnings: string[] = [];
  const fabricatedPmids = candidatePmids.filter((pmid) => pmidCache[pmid]?.exists === false);
  const validPmids = candidatePmids.filter((pmid) => pmidCache[pmid]?.exists === true);
  const unverifiedPmids = candidatePmids.filter((pmid) => pmidCache[pmid] === undefined);
  const dangerousDoseFlags = findDangerousDoseFlags(output.dosage);
  const interactionsPresent = hasMeaningfulInteractions(output);

  if (fabricatedPmids.length > 0) {
    criticalFailures.push(`fabricated_pmids:${fabricatedPmids.join(",")}`);
  }
  if (dangerousDoseFlags.length > 0) {
    criticalFailures.push(`dangerous_or_impossible_dose:${dangerousDoseFlags.join("|")}`);
  }
  if (!interactionsPresent) {
    criticalFailures.push("missing_safety_interactions");
  }

  if (extractDoseMentions(output.dosage).length === 0) warnings.push("no_dosage_mentions_detected");
  if (unverifiedPmids.length > 0) warnings.push(`unverified_pmids:${unverifiedPmids.join(",")}`);
  if (!interactionsPresent) warnings.push("safety_interactions_absent_or_sparse");

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
      fabricatedPmids,
      validPmids,
      candidatePmids,
      dangerousDoseFlags,
      interactionsPresent,
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyPmids(pmids: string[], cachePath: string): Promise<PmidCache> {
  const cache = fs.existsSync(cachePath) ? readJsonFile<PmidCache>(cachePath) : {};
  const uniquePmids = [...new Set(pmids.filter(Boolean))].sort();
  const missing = uniquePmids.filter((pmid) => cache[pmid] === undefined);
  if (missing.length === 0) return cache;

  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  const batchSize = 100;
  for (let index = 0; index < missing.length; index += batchSize) {
    const batch = missing.slice(index, index + batchSize);
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${batch.join(",")}&retmode=json`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "SuplementAI-eval-medical-gate/1.0",
      },
    });
    if (!response.ok) {
      throw new Error(`NCBI PMID verification failed with HTTP ${response.status}`);
    }
    const payload = (await response.json()) as JsonObject;
    const result = payload.result && typeof payload.result === "object" && !Array.isArray(payload.result) ? (payload.result as JsonObject) : {};
    const uids = Array.isArray(result.uids) ? result.uids.map((uid) => String(uid)) : [];
    const checkedAt = new Date().toISOString();
    for (const pmid of batch) {
      cache[pmid] = {
        exists: uids.includes(pmid) && result[pmid] !== undefined,
        checkedAt,
      };
    }
    fs.writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
    if (index + batchSize < missing.length) await sleep(350);
  }

  return cache;
}

function aggregateCorrectedRuns(runs: CandidateRunResult[]): CorrectedAggregate[] {
  const candidateIds = [...new Set(runs.map((run) => run.candidateId))].sort();
  return candidateIds.map((candidateId) => {
    const candidateRuns = runs.filter((run) => run.candidateId === candidateId);
    const completed = candidateRuns.filter((run) => run.status === "completed");
    const fabricatedPmids = [
      ...new Set(candidateRuns.flatMap((run) => run.score.medicalGate.fabricatedPmids)),
    ].sort();
    const dangerousDoseFlags = candidateRuns.flatMap((run) =>
      run.score.medicalGate.dangerousDoseFlags.map((flag) => `${run.supplementName}: ${flag}`),
    );
    const totalCostUsd = Number(candidateRuns.reduce((sum, run) => sum + run.costUsd, 0).toFixed(6));
    return {
      candidateId,
      modelId: candidateRuns[0]?.modelId ?? "",
      completed: completed.length,
      failed: candidateRuns.length - completed.length,
      averageScore:
        candidateRuns.length === 0
          ? 0
          : Number((candidateRuns.reduce((sum, run) => sum + run.score.total, 0) / candidateRuns.length).toFixed(3)),
      medicalGatePasses: candidateRuns.filter((run) => run.score.medicalGate.pass).length,
      medicalGateFailures: candidateRuns.reduce((sum, run) => sum + run.score.medicalGate.criticalFailures.length, 0),
      fabricatedPmids,
      dangerousDoseFlags,
      missingSafetyInteractions: candidateRuns.filter((run) =>
        run.score.medicalGate.criticalFailures.includes("missing_safety_interactions"),
      ).length,
      totalInputTokens: candidateRuns.reduce((sum, run) => sum + run.usage.inputTokens, 0),
      totalOutputTokens: candidateRuns.reduce((sum, run) => sum + run.usage.outputTokens, 0),
      totalCostUsd,
      costPerCompletedUsd: completed.length === 0 ? null : Number((totalCostUsd / completed.length).toFixed(6)),
      averageLatencyMs:
        candidateRuns.length === 0
          ? 0
          : Math.round(candidateRuns.reduce((sum, run) => sum + run.latencyMs, 0) / candidateRuns.length),
    };
  });
}

function markdownPmids(pmids: string[]): string {
  return pmids.length === 0 ? "none" : pmids.join(", ");
}

async function runRescorePaidAb(args: Record<string, string | boolean>): Promise<void> {
  const runDir =
    typeof args["run-dir"] === "string" ? args["run-dir"] : "eval/results/paid-ab-2026-06-15T23-05-13-395Z";
  const goldenDir = typeof args.golden === "string" ? args.golden : "eval/golden";
  const goldenFiles = listJsonFiles(goldenDir).filter((filePath) => path.basename(filePath) !== "index.json");
  const candidateFiles = listJsonFiles(runDir).filter((filePath) => /^\d+-.*\.json$/.test(path.basename(filePath)));
  const goldenRuns: CandidateRunResult[] = goldenFiles.map((filePath) => {
    const golden = readJsonFile<GoldenFile>(filePath);
    return {
      candidateId: "sonnet-baseline",
      modelId: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
      supplementName: golden.supplementId,
      status: "completed",
      latencyMs: golden.metadata?.bedrockDuration ?? 0,
      stopReason: null,
      usage: {
        inputTokens: 0,
        outputTokens: golden.metadata?.tokensUsed ?? 0,
        totalTokens: golden.metadata?.tokensUsed ?? 0,
      },
      costUsd: 0,
      output: golden.output,
      rawText: null,
      error: null,
      score: scoreCandidateOutput(golden.output),
    };
  });
  const candidateRuns = candidateFiles.map((filePath) => readJsonFile<CandidateRunResult>(filePath));
  const allPmids = [
    ...goldenRuns.flatMap((run) => (run.output ? extractPmids(run.output) : [])),
    ...candidateRuns.flatMap((run) => (run.output ? extractPmids(run.output) : [])),
  ];
  const pmidCache = await verifyPmids(allPmids, path.join(runDir, "pubmed-cache.json"));
  const correctedGoldenRuns = goldenRuns.map((run) => ({
    ...run,
    score: scoreCandidateOutput(run.output, pmidCache),
  }));
  const correctedCandidateRuns = candidateRuns.map((run) => ({
    ...run,
    score: scoreCandidateOutput(run.output, pmidCache),
  }));
  const correctedRuns = [...correctedGoldenRuns, ...correctedCandidateRuns];
  const preferredOrder = ["sonnet-baseline", "haiku-4.5", "nova-lite"];
  const byCandidate = aggregateCorrectedRuns(correctedRuns).sort(
    (a, b) =>
      (preferredOrder.includes(a.candidateId) ? preferredOrder.indexOf(a.candidateId) : preferredOrder.length) -
      (preferredOrder.includes(b.candidateId) ? preferredOrder.indexOf(b.candidateId) : preferredOrder.length),
  );
  const baseline = byCandidate.find((candidate) => candidate.candidateId === "sonnet-baseline");
  if (!baseline) throw new Error("Corrected scoring could not build sonnet-baseline row.");

  const candidates = byCandidate.filter((candidate) => candidate.candidateId !== "sonnet-baseline");
  const viable = candidates.filter(
    (candidate) =>
      candidate.failed === 0 &&
      candidate.averageScore >= baseline.averageScore &&
      candidate.medicalGateFailures <= baseline.medicalGateFailures &&
      candidate.fabricatedPmids.length <= baseline.fabricatedPmids.length &&
      candidate.dangerousDoseFlags.length <= baseline.dangerousDoseFlags.length,
  );
  const cheapestViable = viable.sort((a, b) => a.totalCostUsd - b.totalCostUsd)[0] ?? null;
  const correctedSummary = {
    mode: "paid-ab-rescore-corrected",
    generatedAt: new Date().toISOString(),
    sourceRunDir: runDir,
    goldenDir,
    liveInference: "NOT_INVOKED_REUSED_SAVED_OUTPUTS",
    pmidVerification: {
      source: "NCBI E-utilities esummary PubMed, no API key",
      cachePath: path.join(runDir, "pubmed-cache.json"),
      totalCitedPmids: [...new Set(allPmids)].length,
      fabricatedPmids: [...new Set(correctedRuns.flatMap((run) => run.score.medicalGate.fabricatedPmids))].sort(),
    },
    byCandidate,
    verdict: {
      baselineCandidateId: baseline.candidateId,
      viableCandidateIds: viable.map((candidate) => candidate.candidateId),
      recommendation: cheapestViable
        ? `${cheapestViable.candidateId} matches or exceeds the corrected absolute baseline gate; proceed to human clinical review before migration.`
        : "No candidate matches or exceeds the corrected absolute baseline gate; do not migrate yet.",
      recommendedCandidateId: cheapestViable?.candidateId ?? null,
    },
  };

  fs.writeFileSync(path.join(runDir, "summary-corrected.json"), `${JSON.stringify(correctedSummary, null, 2)}\n`);
  fs.writeFileSync(
    path.join(runDir, "VERDICT-CORRECTED.md"),
    [
      "# Corrected paid enricher model A/B verdict",
      "",
      "This rescoring reused the saved paid outputs only. No Bedrock inference was invoked.",
      "",
      "## Corrected absolute medical gate",
      "",
      "- PMIDs fail only when NCBI PubMed E-utilities confirms they do not exist.",
      "- Dose failures are limited to internally inconsistent ranges or clearly dangerous/impossible values.",
      "- Safety/interactions are scored by absolute non-trivial presence, not by similarity to the Sonnet golden output.",
      "- The Sonnet 4.5 golden output is scored as `sonnet-baseline`.",
      "",
      "## Model comparison",
      "",
      "| Model | Completed | Failed | Avg score | Medical failures | Fabricated PMIDs | Dangerous dose flags | Missing safety | Input tokens | Output tokens | Cost | Cost/item | Avg latency |",
      "| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
      ...byCandidate.map(
        (candidate) =>
          `| ${candidate.candidateId} | ${candidate.completed} | ${candidate.failed} | ${candidate.averageScore} | ${candidate.medicalGateFailures} | ${markdownPmids(candidate.fabricatedPmids)} | ${candidate.dangerousDoseFlags.length} | ${candidate.missingSafetyInteractions} | ${candidate.totalInputTokens} | ${candidate.totalOutputTokens} | $${candidate.totalCostUsd.toFixed(6)} | ${
            candidate.costPerCompletedUsd === null ? "n/a" : `$${candidate.costPerCompletedUsd.toFixed(6)}`
          } | ${candidate.averageLatencyMs} ms |`,
      ),
      "",
      "## Fabricated PMIDs by model",
      "",
      ...byCandidate.map((candidate) => `- ${candidate.candidateId}: ${markdownPmids(candidate.fabricatedPmids)}`),
      "",
      "## Verdict",
      "",
      correctedSummary.verdict.recommendation,
      "",
    ].join("\n"),
  );

  console.log(JSON.stringify(correctedSummary, null, 2));
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
          score: scoreCandidateOutput(extracted.output),
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
          score: scoreCandidateOutput(null),
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

  if (args["rescore-paid-ab"] === true) {
    await runRescorePaidAb(args);
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
