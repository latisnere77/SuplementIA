import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../../..");

type PromptModule = {
  buildEnrichmentPrompt: (
    supplementName: string,
    category?: string,
    studies?: unknown[],
    benefitQuery?: string,
  ) => string;
  validateEnrichedContent: (data: unknown) => { valid: boolean; errors: string[] };
};

describe("content-enricher source reconstruction", () => {
  it("builds the same enrichment prompt strings as the live dist fixture for golden inputs", () => {
    const reconstructed = require("../src/prompts") as PromptModule;
    const liveDist = require("../../../eval/fixtures/enricher-live-dist/prompts.js") as PromptModule;
    const goldenDir = path.join(repoRoot, "eval/golden");
    const goldenFiles = fs
      .readdirSync(goldenDir)
      .filter((name) => name.endsWith(".json") && name !== "index.json")
      .sort();

    expect(goldenFiles.length).toBeGreaterThan(0);
    for (const fileName of goldenFiles) {
      const golden = JSON.parse(fs.readFileSync(path.join(goldenDir, fileName), "utf8")) as {
        supplementId: string;
      };
      expect(reconstructed.buildEnrichmentPrompt(golden.supplementId, "general", [])).toBe(
        liveDist.buildEnrichmentPrompt(golden.supplementId, "general", []),
      );
    }
  });

  it("preserves the tool schema exported by the live dist fixture", () => {
    const reconstructed = require("../src/toolSchema") as { ENRICHED_CONTENT_TOOL_CONFIG: unknown };
    const liveDist = require("../../../eval/fixtures/enricher-live-dist/toolSchema.js") as {
      ENRICHED_CONTENT_TOOL_CONFIG: unknown;
    };

    expect(reconstructed.ENRICHED_CONTENT_TOOL_CONFIG).toEqual(liveDist.ENRICHED_CONTENT_TOOL_CONFIG);
  });

  it("does not throw when Haiku returns dosage and safety as plain strings", () => {
    const { validateEnrichedContent } = require("../src/prompts") as PromptModule;
    const result = validateEnrichedContent({
      whatIsIt: "Test",
      primaryUses: [],
      mechanisms: [],
      worksFor: [],
      dosage: "300-600 mg/dia con alimentos",
      safety: "Puede interactuar con anticoagulantes. Consultar a un profesional.",
      buyingGuidance: {
        preferredForm: "standard",
        keyCompounds: [],
        qualityIndicators: [],
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining(["dosage must be an object", "safety must be an object"]));
  });

  it("normalizes JSON-string dosage and safety before validation", () => {
    const { validateEnrichedContent } = require("../src/prompts") as PromptModule;
    const result = validateEnrichedContent({
      whatIsIt: "Test",
      primaryUses: [],
      mechanisms: [],
      worksFor: [],
      dosage: JSON.stringify({
        standard: "300 mg/dia",
        timing: "Con alimentos",
        duration: "8 semanas",
      }),
      safety: JSON.stringify({
        overallRating: "Generally Safe",
      }),
      buyingGuidance: {
        preferredForm: "standard",
        keyCompounds: [],
        qualityIndicators: [],
      },
    });

    expect(result.errors).not.toContain("dosage must be an object");
    expect(result.errors).not.toContain("safety must be an object");
  });

  it("compiles the reconstructed service to a dist artifact", () => {
    execFileSync("npm", ["--prefix", "services/content-enricher", "run", "build"], {
      cwd: repoRoot,
      stdio: "pipe",
    });

    expect(fs.existsSync(path.join(repoRoot, "services/content-enricher/dist/index.js"))).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, "services/content-enricher/dist/prompts.js"))).toBe(true);
  });
});

