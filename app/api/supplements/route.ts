/**
 * Supplements API
 * 
 * POST /api/supplements - Insert a new supplement with automatic embedding generation
 * 
 * Requirements: 4.1, 4.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { createVectorSearchService } from '@/lib/services/vector-search';
import { createEmbeddingService } from '@/lib/services/embedding-service';
import { z } from 'zod';

// Validation schema for supplement insertion
const SupplementInsertSchema = z.object({
  name: z.string().min(1).max(200),
  scientificName: z.string().optional(),
  commonNames: z.array(z.string()).optional().default([]),
  metadata: z.object({
    category: z.enum(['vitamin', 'mineral', 'herb', 'amino-acid', 'fatty-acid', 'mushroom', 'other']).optional(),
    popularity: z.enum(['high', 'medium', 'low']).optional(),
    evidenceGrade: z.enum(['A', 'B', 'C', 'D']).optional(),
    studyCount: z.number().int().min(0).optional(),
    pubmedQuery: z.string().optional(),
  }).optional().default({}),
});

/**
 * POST /api/supplements
 * 
 * Insert a new supplement with automatic embedding generation
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = SupplementInsertSchema.parse(body);

    // Generate embedding for the supplement name
    const embeddingService = createEmbeddingService();
    const embedding = await embeddingService.generateEmbedding(validatedData.name);

    // Insert supplement into database
    const vectorSearchService = createVectorSearchService();
    
    try {
      const supplement = await vectorSearchService.insertSupplement({
        name: validatedData.name,
        scientificName: validatedData.scientificName,
        commonNames: validatedData.commonNames,
        embedding,
        metadata: validatedData.metadata,
      });

      const latency = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        supplement: {
          id: supplement.id,
          name: supplement.name,
          scientificName: supplement.scientificName,
          commonNames: supplement.commonNames,
          metadata: supplement.metadata,
          searchCount: supplement.searchCount,
          createdAt: supplement.createdAt,
          updatedAt: supplement.updatedAt,
        },
        latency,
      }, { status: 201 });
    } finally {
      await vectorSearchService.close();
    }
  } catch (error: unknown) {
    console.error('Supplement insertion error:', error);
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
      error: err.message || 'Failed to insert supplement',
    }, { status: 500 });
  }
}
