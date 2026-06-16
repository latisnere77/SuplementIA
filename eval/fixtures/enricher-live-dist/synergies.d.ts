/**
 * Synergies Service
 *
 * Fetches supplement synergies from external DynamoDB table (FormulationEngine-IngredientSynergies)
 * Uses cross-account access via STS AssumeRole
 */
/**
 * Transformed synergy for frontend
 */
export interface TransformedSynergy {
    supplement: string;
    type: string;
    mechanism: string;
    effect: string;
    score: number;
    tier: number;
    categories: string[];
    direction: 'positive' | 'negative';
    evidence?: {
        studyCount: number;
        pubmedIds: string[];
        source: string;
    };
}
/**
 * Query synergies from external DynamoDB table
 */
export declare function getSynergiesForSupplement(supplementName: string): Promise<TransformedSynergy[]>;
/**
 * Transform Claude's stacksWith array to synergy format (fallback)
 */
export declare function transformStacksWithFallback(stacksWith?: string[]): TransformedSynergy[];
//# sourceMappingURL=synergies.d.ts.map