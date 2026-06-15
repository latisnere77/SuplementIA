import fs from "node:fs";
import path from "node:path";

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
};

type PricingFile = {
  models: Record<string, PricingEntry>;
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
