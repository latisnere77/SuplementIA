/**
 * Supplement Update API
 * 
 * PUT /api/supplements/:id - Update a supplement with cache invalidation
 * 
 * Requirements: 4.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { createVectorSearchService } from '@/lib/services/vector-search';
import { createEmbeddingService } from '@/lib/services/embedding-service';
import { SmartCache } from '@/lib/cache/smart-cache';
import { z } from 'zod';

// Validation schema for supplement update
const SupplementUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  scientificName: z.string().optional(),
  commonNames: z.array(z.string()).optional(),
  metadata: z.object({
    category: z.enum(['vitamin', 'mineral', 'herb', 'amino-acid', 'fatty-acid', 'mushroom', 'other']).optional(),
    popularity: z.enum(['high', 'medium', 'low']).optional(),
    evidenceGrade: z.enum(['A', 'B', 'C', 'D']).optional(),
    studyCount: z.number().int().min(0).optional(),
    pubmedQuery: z.string().optional(),
  }).optional(),
});

/**
 * PUT /api/supplements/:id
 * 
 * Update a supplement with automatic cache invalidation
 * Regenerates embedding if name changes
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  
  try {
    const supplementId = parseInt(params.id);
    
    if (isNaN(supplementId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid supplement ID',
      }, { status: 400 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = SupplementUpdateSchema.parse(body);

    // Get existing supplement
    const vectorSearchService = createVectorSearchService();
    
    try {
      const existingSupplement = await vectorSearchService.getById(supplementId);
      
      if (!existingSupplement) {
        return NextResponse.json({
          success: false,
          error: 'Supplement not found',
        }, { status: 404 });
      }

      // Check if name changed - if so, regenerate embedding
      let newEmbedding: number[] | undefined;
      if (validatedData.name && validatedData.name !== existingSupplement.name) {
        const embeddingService = createEmbeddingService();
        newEmbedding = await embeddingService.generateEmbedding(validatedData.name);
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (validatedData.name) {
        updates.push(`name = $${paramIndex++}`);
        values.push(validatedData.name);
      }

      if (validatedData.scientificName !== undefined) {
        updates.push(`scientific_name = $${paramIndex++}`);
        values.push(validatedData.scientificName);
      }

      if (validatedData.commonNames) {
        updates.push(`common_names = $${paramIndex++}`);
        values.push(validatedData.commonNames);
      }

      if (validatedData.metadata) {
        // Merge with existing metadata
        const mergedMetadata = {
          ...existingSupplement.metadata,
          ...validatedData.metadata,
        };
        updates.push(`metadata = $${paramIndex++}`);
        values.push(JSON.stringify(mergedMetadata));
      }

      if (newEmbedding) {
        const embeddingStr = `[${newEmbedding.join(',')}]`;
        updates.push(`embedding = $${paramIndex++}::vector`);
        values.push(embeddingStr);
      }

      // Always update updated_at
      updates.push(`updated_at = NOW()`);

      // Add supplement ID as last parameter
      values.push(supplementId);

      const query = `
        UPDATE supplements
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING 
          id,
          name,
          scientific_name,
          common_names,
          embedding,
          metadata,
          search_count,
          last_searched_at,
          created_at,
          updated_at
      `;

      const result = await vectorSearchService['pool'].query(query, values);
      const row = result.rows[0];

      const updatedSupplement = {
        id: row.id,
        name: row.name,
        scientificName: row.scientific_name,
        commonNames: row.common_names || [],
        metadata: row.metadata || {},
        searchCount: row.search_count,
        lastSearchedAt: row.last_searched_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      // Invalidate cache for both old and new names
      const cache = new SmartCache();
      await cache.delete(existingSupplement.name);
      if (validatedData.name && validatedData.name !== existingSupplement.name) {
        await cache.delete(validatedData.name);
      }

      const latency = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        supplement: updatedSupplement,
        cacheInvalidated: true,
        embeddingRegenerated: !!newEmbedding,
        latency,
      });
    } finally {
      await vectorSearchService.close();
    }
  } catch (error: unknown) {
    console.error('Supplement update error:', error);
    const err = error as Error & { name?: string; code?: string; errors?: unknown[] };

    // Handle validation errors
    if (err.name === 'ZodError') {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: err.errors,
      }, { status: 400 });
    }

    // Handle duplicate name errors
    if (err.code === '23505') { // PostgreSQL unique violation
      return NextResponse.json({
        success: false,
        error: 'Supplement with this name already exists',
      }, { status: 409 });
    }

    // Handle other errors
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to update supplement',
    }, { status: 500 });
  }
}
