import { client } from './client';
import { CLASS_NAME } from './schema';

export async function search(query: string) {
    console.log(`\n🔍 Search Query: "${query}"`);

    // HYBRID SEARCH: Vector (Semantic) + BM25 (Keyword)
    // This is the core magic:
    // - alpha=0.75 leans towards Vector (good for multi-lingual/synonyms)
    // - properties: abstract matches intent, ingredients matches specific terms
    const clientInstance = client; // Use exported client

    const result = await clientInstance.graphql
        .get()
        .withClassName(CLASS_NAME)
        .withFields('title abstract ingredients conditions year _additional { score distance }')
        .withHybrid({
            query: query,
            alpha: 0.75, // 0 = BM25, 1 = Vector. 0.75 is good for "semantic with keyword boost"
        })
        .withLimit(3)
        .do();

    const hits = result.data.Get[CLASS_NAME];

    if (!hits || hits.length === 0) {
        console.log("❌ No results found.");
        return;
    }

    console.log(`✅ Found ${hits.length} results:\n`);
    hits.forEach((hit: any, i: number) => {
        console.log(`[${i + 1}] ${hit.title} (${hit.year})`);
        console.log(`    MATCH: ${hit.ingredients.join(', ')}`);
        console.log(`    ABSTRACT: ${hit.abstract.substring(0, 100)}...`);
        console.log(`    SCORE: ${hit._additional.score}\n`);
    });
}

// Run example searches
async function runDemo() {
    // Case 1: Spanish Query matching English Content (Vector Power)
    await search("suplementos para la memoria"); // Should find Lion's Mane

    // Case 2: Specific Ingredient (Keyword Power)
    await search("Hericium erinaceus"); // Should exact match Lion's Mane

    // Case 3: Concept map
    await search("cansancio crónico"); // Should match Fatigue/Ginseng
}

// Only run if called directly
if (require.main === module) {
    runDemo().catch(console.error);
}
