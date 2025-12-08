/**
 * Lambda@Edge Function for Intelligent Supplement Search
 * 
 * This function runs at CloudFront edge locations to provide:
 * - Request validation and sanitization
 * - DAX cache lookup for ultra-fast responses
 * - Fallback to origin on cache miss
 * - Response formatting
 * 
 * Requirements: 1.1, 1.2, 2.1, 2.2
 */

const { DynamoDB } = require('aws-sdk');
const AmazonDaxClient = require('amazon-dax-client');

// Initialize DAX client (reused across invocations)
let daxClient;
let docClient;

/**
 * Initialize DAX client with connection pooling
 */
function initializeDaxClient() {
    if (!daxClient) {
        const daxEndpoint = process.env.DAX_ENDPOINT || '';
        
        if (daxEndpoint) {
            daxClient = new AmazonDaxClient({
                endpoints: [daxEndpoint],
                region: process.env.AWS_REGION || 'us-east-1',
            });
            docClient = new DynamoDB.DocumentClient({ service: daxClient });
        } else {
            // Fallback to regular DynamoDB if DAX not configured
            docClient = new DynamoDB.DocumentClient({
                region: process.env.AWS_REGION || 'us-east-1',
            });
        }
    }
    return docClient;
}

/**
 * Validate and sanitize search query
 * @param {string} query - Raw query string
 * @returns {Object} - Validation result
 */
function validateQuery(query) {
    // Check if query exists
    if (!query || typeof query !== 'string') {
        return {
            valid: false,
            error: 'Query parameter is required',
            statusCode: 400,
        };
    }

    // Trim whitespace
    const trimmed = query.trim();

    // Check length (max 200 chars per requirements)
    if (trimmed.length === 0) {
        return {
            valid: false,
            error: 'Query cannot be empty',
            statusCode: 400,
        };
    }

    if (trimmed.length > 200) {
        return {
            valid: false,
            error: 'Query too long (max 200 characters)',
            statusCode: 400,
        };
    }

    // Sanitize: remove potential SQL injection patterns
    const sanitized = trimmed
        .replace(/[;'"\\]/g, '') // Remove SQL special chars
        .replace(/--/g, '')       // Remove SQL comments
        .replace(/<script>/gi, '') // Remove script tags
        .replace(/<\/script>/gi, '');

    // Check for suspicious patterns
    const suspiciousPatterns = [
        /union\s+select/i,
        /drop\s+table/i,
        /delete\s+from/i,
        /insert\s+into/i,
        /update\s+.*\s+set/i,
    ];

    for (const pattern of suspiciousPatterns) {
        if (pattern.test(sanitized)) {
            return {
                valid: false,
                error: 'Invalid query format',
                statusCode: 400,
            };
        }
    }

    return {
        valid: true,
        sanitized,
    };
}

/**
 * Generate cache key from query
 * @param {string} query - Sanitized query
 * @returns {string} - Cache key
 */
function generateCacheKey(query) {
    // Normalize query for consistent caching
    const normalized = query.toLowerCase().trim();
    
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `SUPPLEMENT#${Math.abs(hash)}`;
}

/**
 * Lookup supplement in DAX cache
 * @param {string} cacheKey - Cache key
 * @returns {Object|null} - Cached supplement or null
 */
async function lookupInCache(cacheKey) {
    try {
        const client = initializeDaxClient();
        const tableName = process.env.DYNAMODB_CACHE_TABLE || 'production-supplement-cache';
        
        const startTime = Date.now();
        
        const result = await client.get({
            TableName: tableName,
            Key: {
                PK: cacheKey,
                SK: 'QUERY',
            },
        }).promise();
        
        const latency = Date.now() - startTime;
        
        if (result.Item) {
            // Check TTL
            const now = Math.floor(Date.now() / 1000);
            if (result.Item.ttl && result.Item.ttl < now) {
                // Expired
                return null;
            }
            
            // Update access count and timestamp
            await client.update({
                TableName: tableName,
                Key: {
                    PK: cacheKey,
                    SK: 'QUERY',
                },
                UpdateExpression: 'SET searchCount = searchCount + :inc, lastAccessed = :now',
                ExpressionAttributeValues: {
                    ':inc': 1,
                    ':now': now,
                },
            }).promise().catch(() => {}); // Ignore update errors
            
            return {
                supplement: result.Item.supplementData,
                latency,
                cacheHit: true,
                source: 'dax',
            };
        }
        
        return null;
    } catch (error) {
        console.error('DAX cache lookup error:', error);
        return null;
    }
}

/**
 * Format error response
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @returns {Object} - CloudFront response
 */
function errorResponse(statusCode, message) {
    return {
        status: statusCode.toString(),
        statusDescription: message,
        headers: {
            'content-type': [{
                key: 'Content-Type',
                value: 'application/json',
            }],
            'cache-control': [{
                key: 'Cache-Control',
                value: 'no-cache, no-store, must-revalidate',
            }],
        },
        body: JSON.stringify({
            success: false,
            error: message,
            timestamp: new Date().toISOString(),
        }),
    };
}

/**
 * Format success response
 * @param {Object} data - Response data
 * @returns {Object} - CloudFront response
 */
function successResponse(data) {
    return {
        status: '200',
        statusDescription: 'OK',
        headers: {
            'content-type': [{
                key: 'Content-Type',
                value: 'application/json',
            }],
            'cache-control': [{
                key: 'Cache-Control',
                value: 'public, max-age=3600', // Cache for 1 hour
            }],
            'x-cache-status': [{
                key: 'X-Cache-Status',
                value: data.cacheHit ? 'HIT' : 'MISS',
            }],
            'x-cache-source': [{
                key: 'X-Cache-Source',
                value: data.source || 'unknown',
            }],
        },
        body: JSON.stringify({
            success: true,
            ...data,
            timestamp: new Date().toISOString(),
        }),
    };
}

/**
 * Main Lambda@Edge handler
 * @param {Object} event - CloudFront viewer request event
 * @param {Object} context - Lambda context
 * @returns {Object} - CloudFront response or request
 */
exports.handler = async (event, context) => {
    const request = event.Records[0].cf.request;
    const querystring = request.querystring || '';
    
    // Parse query parameters
    const params = new URLSearchParams(querystring);
    const query = params.get('q') || params.get('query');
    
    // Log request for monitoring
    console.log('Edge request:', {
        query,
        uri: request.uri,
        country: request.headers['cloudfront-viewer-country']?.[0]?.value,
    });
    
    // Validate query
    const validation = validateQuery(query);
    if (!validation.valid) {
        return errorResponse(validation.statusCode, validation.error);
    }
    
    const sanitizedQuery = validation.sanitized;
    
    // Generate cache key
    const cacheKey = generateCacheKey(sanitizedQuery);
    
    // Try DAX cache lookup
    const cached = await lookupInCache(cacheKey);
    
    if (cached) {
        // Cache hit - return immediately from edge
        console.log('Cache HIT:', {
            query: sanitizedQuery,
            latency: cached.latency,
            source: cached.source,
        });
        
        return successResponse({
            supplement: cached.supplement,
            latency: cached.latency,
            cacheHit: true,
            source: cached.source,
        });
    }
    
    // Cache miss - forward to origin
    console.log('Cache MISS:', {
        query: sanitizedQuery,
        forwarding: 'to origin',
    });
    
    // Add sanitized query to request
    request.querystring = `q=${encodeURIComponent(sanitizedQuery)}`;
    
    // Add custom headers for origin
    request.headers['x-edge-processed'] = [{
        key: 'X-Edge-Processed',
        value: 'true',
    }];
    request.headers['x-cache-key'] = [{
        key: 'X-Cache-Key',
        value: cacheKey,
    }];
    
    // Forward to origin
    return request;
};
