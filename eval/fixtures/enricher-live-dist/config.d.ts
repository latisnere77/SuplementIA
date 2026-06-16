/**
 * Configuration for Content Enricher
 */
export declare const config: {
    readonly region: string;
    readonly modelId: string;
    readonly maxTokens: number;
    readonly temperature: number;
    readonly cacheServiceUrl: string | undefined;
    readonly xrayEnabled: boolean;
    readonly logLevel: string;
    readonly corsOrigins: string[];
};
export declare const CORS_HEADERS: {
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Methods': string;
    'Access-Control-Allow-Headers': string;
    'Content-Type': string;
};
//# sourceMappingURL=config.d.ts.map