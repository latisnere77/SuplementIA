
// Mock types
interface SupplementHit {
    title: string;
    abstract: string;
    conditions: string[] | string;
    ingredients: string[] | string;
    study_count?: number;
}

// The modified function (simplified for testing logic)
function transformHitsToRecommendation(hits: SupplementHit[], query: string, quizId: string): any {
    const totalStudies = hits.length === 1 ? (hits[0].study_count || hits.length) : hits.length;
    const ingredientsMap = new Map<string, number>();
    const conditionsStats = new Map<string, { count: number, papers: string[] }>();

    hits.forEach(hit => {
        // Ingredients
        const rawIng = hit.ingredients;
        const ingArray = Array.isArray(rawIng) ? rawIng : (typeof rawIng === 'string' ? rawIng.split(',').map((s: string) => s.trim()) : []);
        ingArray.forEach((ing: string) => {
            ingredientsMap.set(ing, (ingredientsMap.get(ing) || 0) + 1);
        });

        // Conditions
        const rawCond = hit.conditions;
        const condArray = Array.isArray(rawCond) ? rawCond : (typeof rawCond === 'string' ? rawCond.split(',').map((s: string) => s.trim()) : []);
        condArray.forEach((cond: string) => {
            const current = conditionsStats.get(cond) || { count: 0, papers: [] };
            current.count++;
            if (hit.title) current.papers.push(hit.title);
            conditionsStats.set(cond, current);
        });
    });

    const sortedConditions = Array.from(conditionsStats.entries())
        .sort((a, b) => b[1].count - a[1].count);

    // LOGIC TO VERIFY: Grades should be C, no random placeholders
    const worksFor = sortedConditions.map(([cond, stats], index) => ({
        condition: cond,
        evidenceGrade: 'C', // Default to 'Limited/Suggesting' until LLM confirms hierarchy
        grade: 'C',
        magnitude: 'Moderada',
        effectSize: 'Por determinar',
        studyCount: stats.count,
        notes: `Evidencia preliminar encontrada en ${stats.count} estudios. Pendiente de análisis detallado.`,
        quantitativeData: "Análisis en tiempo real de PubMed en progreso...",
        confidence: 60 - (index * 5)
    }));

    const doesntWorkFor: any[] = [];
    const limitedEvidence: any[] = [];

    const topIngredients = Array.from(ingredientsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({
            name,
            grade: 'C' as const, // LOGIC TO VERIFY: Grade C
            studyCount: count,
            rctCount: 0,
        }));

    return {
        category: query,
        supplement: {
            name: query,
            worksFor: worksFor,
            doesntWorkFor: doesntWorkFor,
            limitedEvidence: limitedEvidence,
            dosage: {
                standard: "Ver análisis de evidencia",
                effectiveDose: "Ver análisis de evidencia",
                notes: "Dosis optimizada basada en estudios recuperados."
            }
        },
        ingredients: topIngredients.map(ing => ({
            name: ing.name,
            grade: ing.grade,
        })),
        products: [{
            price: 0 // logic check: will be rendered as "Consultar" in UI component
        }]
    };
}

// Mock Data for "Magnesio"
const mockHits: SupplementHit[] = [
    {
        title: "Magnesium supplementation primarily for sleep",
        abstract: "Study on Magnesium",
        conditions: ["Sleep", "Insomnia", "Muscle Recovery"],
        ingredients: ["Magnesium Glycinate"],
        study_count: 50
    },
    {
        title: "Effects of Magnesium on Anxiety",
        abstract: "Another study",
        conditions: ["Anxiety", "Sleep"],
        ingredients: ["Magnesium Citrate"],
        study_count: 50
    }
];

// Run test
console.log("---------------------------------------------------");
console.log("🧪 TESTING SEARCH TRANSFORMATION FOR 'MAGNESIO'");
console.log("---------------------------------------------------");
const result = transformHitsToRecommendation(mockHits, "Magnesio", "test_id");

console.log("\n1. CHECKING DEFAULT GRADES (Should be 'C'):");
console.log("WorksFor Grades:", result.supplement.worksFor.map((w: any) => `${w.condition}: ${w.grade}`));
console.log("Ingredient Grades:", result.ingredients.map((i: any) => `${i.name}: ${i.grade}`));

console.log("\n2. CHECKING PLACEHOLDERS REMOVED:");
console.log("DoesntWorkFor Length (Should be 0):", result.supplement.doesntWorkFor.length);
console.log("Dosage Standard (Should be generic):", result.supplement.dosage.standard);

console.log("\n3. CHECKING PRODUCT PRICE:");
console.log("Product Price in Data:", result.products[0].price);
console.log("(Note: UI component converts 0 to 'Consultar')");

// Mock Merge Logic Test
console.log("\n---------------------------------------------------");
console.log("🧪 TESTING ENRICHMENT MERGE LOGIC");
console.log("---------------------------------------------------");

const mockEnrichedData = {
    whatIsItFor: "Magnesium is an essential mineral...",
    overallGrade: "A",
    qualityBadges: { hasRCTs: true, hasMetaAnalysis: true }
};

const recommendation = JSON.parse(JSON.stringify(result));

// Simulating the merge logic
if (mockEnrichedData.whatIsItFor) {
    recommendation.supplement.description = mockEnrichedData.whatIsItFor;
}
if (mockEnrichedData.overallGrade) {
    recommendation.supplement.overallGrade = mockEnrichedData.overallGrade;
}

console.log("Merged Description:", recommendation.supplement.description);
console.log("Merged Overall Grade:", recommendation.supplement.overallGrade);
