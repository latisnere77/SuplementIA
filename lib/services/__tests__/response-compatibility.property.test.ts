/**
 * Property Test: Response Format Compatibility
 * 
 * **Feature: intelligent-supplement-search, Property 33: Response format compatibility**
 * 
 * Tests that responses from the new vector search system maintain the same
 * format as the legacy supplement-mappings system for backward compatibility.
 * 
 * **Validates: Requirements 9.5**
 */

import fc from 'fast-check';
import { CompatibilityLayer } from '../compatibility-layer';
import { SupplementMapping } from '../../portal/supplement-mappings';

describe('Property 33: Response format compatibility', () => {
  it('should return SupplementMapping format from vector search', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random supplement data
        fc.record({
          name: fc.constantFrom('Magnesium', 'Vitamin D', 'Omega-3', 'Zinc'),
          scientificName: fc.option(fc.string({ minLength: 5, maxLength: 30 }), { nil: undefined }),
          commonNames: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
          category: fc.constantFrom('vitamin', 'mineral', 'herb', 'amino-acid', 'fatty-acid', 'mushroom', 'other'),
          popularity: fc.constantFrom('high', 'medium', 'low'),
          evidenceGrade: fc.option(fc.constantFrom('A', 'B', 'C', 'D'), { nil: undefined }),
          studyCount: fc.integer({ min: 0, max: 100 }),
          pubmedQuery: fc.string({ minLength: 10, maxLength: 100 }),
        }),
        async (supplementData) => {
          // Mock vector search to return our test data
          const mockVectorSearch = {
            searchByEmbedding: jest.fn().mockResolvedValue([
              {
                supplement: {
                  id: 1,
                  name: supplementData.name,
                  scientificName: supplementData.scientificName,
                  commonNames: supplementData.commonNames,
                  embedding: new Array(384).fill(0),
                  metadata: {
                    category: supplementData.category,
                    popularity: supplementData.popularity,
                    evidenceGrade: supplementData.evidenceGrade,
                    studyCount: supplementData.studyCount,
                    pubmedQuery: supplementData.pubmedQuery,
                  },
                  searchCount: 10,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
                similarity: 0.95,
              },
            ]),
          } as any;

          const mockEmbeddingService = {
            generateEmbedding: jest.fn().mockResolvedValue(new Array(384).fill(0)),
          } as any;

          const compatibilityLayer = new CompatibilityLayer(
            mockVectorSearch,
            mockEmbeddingService
          );

          // Search using vector search
          const result = await compatibilityLayer.search(supplementData.name, {
            useVectorSearch: true,
            fallbackToLegacy: false,
          });

          // Assertions
          expect(result.success).toBe(true);
          expect(result.supplement).not.toBeNull();

          const supplement = result.supplement as SupplementMapping;

          // 1. Should have all required SupplementMapping fields
          expect(supplement).toHaveProperty('normalizedName');
          expect(supplement).toHaveProperty('commonNames');
          expect(supplement).toHaveProperty('pubmedQuery');
          expect(supplement).toHaveProperty('category');
          expect(supplement).toHaveProperty('popularity');

          // 2. normalizedName should match input name
          expect(supplement.normalizedName).toBe(supplementData.name);

          // 3. commonNames should be an array
          expect(Array.isArray(supplement.commonNames)).toBe(true);
          expect(supplement.commonNames).toEqual(supplementData.commonNames);

          // 4. scientificName should match if provided
          if (supplementData.scientificName) {
            expect(supplement.scientificName).toBe(supplementData.scientificName);
          }

          // 5. pubmedQuery should be a non-empty string
          expect(typeof supplement.pubmedQuery).toBe('string');
          expect(supplement.pubmedQuery.length).toBeGreaterThan(0);

          // 6. category should be valid
          expect(['vitamin', 'mineral', 'herb', 'amino-acid', 'fatty-acid', 'mushroom', 'other'])
            .toContain(supplement.category);

          // 7. popularity should be valid
          expect(['high', 'medium', 'low']).toContain(supplement.popularity);

          // 8. pubmedFilters should have expected structure
          expect(supplement.pubmedFilters).toBeDefined();
          expect(supplement.pubmedFilters?.yearFrom).toBe(2010);
          expect(supplement.pubmedFilters?.rctOnly).toBe(false);
          expect(supplement.pubmedFilters?.maxStudies).toBe(10);

          // 9. cachedData should be present if evidenceGrade exists
          if (supplementData.evidenceGrade) {
            expect(supplement.cachedData).toBeDefined();
            expect(supplement.cachedData?.evidenceGrade).toBe(supplementData.evidenceGrade);
            expect(supplement.cachedData?.studyCount).toBe(supplementData.studyCount);
          }

          return true;
        }
      ),
      { numRuns: 20 } // Run 20 times with different data
    );
  });

  it('should maintain format consistency between vector and legacy sources', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('Magnesium', 'Zinc', 'Vitamin D', 'Omega-3'),
        async (supplementName) => {
          // Get result from vector search (mocked)
          const mockVectorSearch = {
            searchByEmbedding: jest.fn().mockResolvedValue([
              {
                supplement: {
                  id: 1,
                  name: supplementName,
                  scientificName: `${supplementName} Scientific`,
                  commonNames: [supplementName, `${supplementName} Alt`],
                  embedding: new Array(384).fill(0),
                  metadata: {
                    category: 'vitamin',
                    popularity: 'high',
                    evidenceGrade: 'B',
                    studyCount: 50,
                    pubmedQuery: `${supplementName} AND health`,
                  },
                  searchCount: 10,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
                similarity: 0.95,
              },
            ]),
          } as any;

          const mockEmbeddingService = {
            generateEmbedding: jest.fn().mockResolvedValue(new Array(384).fill(0)),
          } as any;

          const compatibilityLayer = new CompatibilityLayer(
            mockVectorSearch,
            mockEmbeddingService
          );

          // Get result from vector search
          const vectorResult = await compatibilityLayer.search(supplementName, {
            useVectorSearch: true,
            fallbackToLegacy: false,
          });

          // Get result from legacy system
          const legacyResult = await compatibilityLayer.search(supplementName, {
            useVectorSearch: false,
            fallbackToLegacy: true,
          });

          // Both should succeed
          expect(vectorResult.success).toBe(true);
          expect(legacyResult.success).toBe(true);

          const vectorSupplement = vectorResult.supplement as SupplementMapping;
          const legacySupplement = legacyResult.supplement as SupplementMapping;

          // Both should have the same structure
          const vectorKeys = Object.keys(vectorSupplement).sort();
          const legacyKeys = Object.keys(legacySupplement).sort();

          // Check that both have the core required fields
          const requiredFields = ['normalizedName', 'commonNames', 'pubmedQuery', 'category', 'popularity'];
          
          for (const field of requiredFields) {
            expect(vectorKeys).toContain(field);
            expect(legacyKeys).toContain(field);
          }

          // Check that field types match
          expect(typeof vectorSupplement.normalizedName).toBe(typeof legacySupplement.normalizedName);
          expect(Array.isArray(vectorSupplement.commonNames)).toBe(Array.isArray(legacySupplement.commonNames));
          expect(typeof vectorSupplement.pubmedQuery).toBe(typeof legacySupplement.pubmedQuery);
          expect(typeof vectorSupplement.category).toBe(typeof legacySupplement.category);
          expect(typeof vectorSupplement.popularity).toBe(typeof legacySupplement.popularity);

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should preserve all legacy SupplementMapping fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 3, maxLength: 30 }),
          scientificName: fc.option(fc.string({ minLength: 5, maxLength: 30 }), { nil: undefined }),
          commonNames: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
          category: fc.constantFrom('vitamin', 'mineral', 'herb', 'amino-acid', 'fatty-acid', 'mushroom', 'other'),
          popularity: fc.constantFrom('high', 'medium', 'low'),
          evidenceGrade: fc.constantFrom('A', 'B', 'C', 'D'),
          studyCount: fc.integer({ min: 1, max: 100 }),
          pubmedQuery: fc.string({ minLength: 10, maxLength: 100 }),
        }),
        async (data) => {
          // Mock vector search
          const mockVectorSearch = {
            searchByEmbedding: jest.fn().mockResolvedValue([
              {
                supplement: {
                  id: 1,
                  name: data.name,
                  scientificName: data.scientificName,
                  commonNames: data.commonNames,
                  embedding: new Array(384).fill(0),
                  metadata: {
                    category: data.category,
                    popularity: data.popularity,
                    evidenceGrade: data.evidenceGrade,
                    studyCount: data.studyCount,
                    pubmedQuery: data.pubmedQuery,
                  },
                  searchCount: 10,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
                similarity: 0.95,
              },
            ]),
          } as any;

          const mockEmbeddingService = {
            generateEmbedding: jest.fn().mockResolvedValue(new Array(384).fill(0)),
          } as any;

          const compatibilityLayer = new CompatibilityLayer(
            mockVectorSearch,
            mockEmbeddingService
          );

          const result = await compatibilityLayer.search(data.name, {
            useVectorSearch: true,
            fallbackToLegacy: false,
          });

          expect(result.success).toBe(true);
          const supplement = result.supplement as SupplementMapping;

          // Verify all fields are preserved correctly
          expect(supplement.normalizedName).toBe(data.name);
          expect(supplement.scientificName).toBe(data.scientificName);
          expect(supplement.commonNames).toEqual(data.commonNames);
          expect(supplement.category).toBe(data.category);
          expect(supplement.popularity).toBe(data.popularity);
          expect(supplement.pubmedQuery).toBeTruthy();

          // Verify cachedData structure
          expect(supplement.cachedData).toBeDefined();
          expect(supplement.cachedData?.evidenceGrade).toBe(data.evidenceGrade);
          expect(supplement.cachedData?.studyCount).toBe(data.studyCount);
          expect(supplement.cachedData?.lastUpdated).toBeTruthy();
          expect(supplement.cachedData?.primaryUses).toEqual([]);
          expect(supplement.cachedData?.safetyProfile).toBe('safe');

          // Verify pubmedFilters structure
          expect(supplement.pubmedFilters).toBeDefined();
          expect(supplement.pubmedFilters?.yearFrom).toBe(2010);
          expect(supplement.pubmedFilters?.rctOnly).toBe(false);
          expect(supplement.pubmedFilters?.maxStudies).toBe(10);

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle missing optional fields gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 30 }),
        async (name) => {
          // Mock vector search with minimal data (no optional fields)
          const mockVectorSearch = {
            searchByEmbedding: jest.fn().mockResolvedValue([
              {
                supplement: {
                  id: 1,
                  name,
                  commonNames: [name],
                  embedding: new Array(384).fill(0),
                  metadata: {}, // Empty metadata
                  searchCount: 0,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
                similarity: 0.90,
              },
            ]),
          } as any;

          const mockEmbeddingService = {
            generateEmbedding: jest.fn().mockResolvedValue(new Array(384).fill(0)),
          } as any;

          const compatibilityLayer = new CompatibilityLayer(
            mockVectorSearch,
            mockEmbeddingService
          );

          const result = await compatibilityLayer.search(name, {
            useVectorSearch: true,
            fallbackToLegacy: false,
          });

          expect(result.success).toBe(true);
          const supplement = result.supplement as SupplementMapping;

          // Should still have required fields with defaults
          expect(supplement.normalizedName).toBe(name);
          expect(supplement.commonNames).toEqual([name]);
          expect(supplement.category).toBe('other'); // Default category
          expect(supplement.popularity).toBe('low'); // Default popularity
          expect(supplement.pubmedQuery).toBeTruthy(); // Should generate default query

          // Optional fields should be undefined or have defaults
          expect(supplement.scientificName).toBeUndefined();
          expect(supplement.cachedData).toBeUndefined(); // No evidence grade = no cached data

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
});
