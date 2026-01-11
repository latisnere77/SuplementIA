/**
 * Property Test: Auto-Discovery Insertion
 * 
 * Feature: intelligent-supplement-search, Property 25: Auto-discovery insertion
 * Validates: Requirements 7.3
 * 
 * Property: For any unknown supplement discovered, it should be automatically added to database after validation
 */

import fc from 'fast-check';
import {
  enqueueDiscovery,
  dequeueDiscovery,
  markCompleted,
  getQueueItem,
  deleteQueueItem,
} from '../discovery-queue';
import { DiscoveryQueueItem } from '../../../infrastructure/discovery-queue-schema';

// Create a shared mock store that persists across test cases
const mockStore = {
  items: new Map<string, any>(),
  clear() {
    this.items.clear();
  }
};

// Mock DynamoDB client for testing
jest.mock('@aws-sdk/lib-dynamodb', () => {
  return {
    DynamoDBDocumentClient: {
      from: jest.fn(() => ({
        send: jest.fn(async (command: any) => {
          const commandName = command.constructor.name;
          
          if (commandName === 'PutCommand') {
            const item = command.input.Item;
            mockStore.items.set(item.id, { ...item });
            return { Item: item };
          }
          
          if (commandName === 'GetCommand') {
            const id = command.input.Key.id;
            const item = mockStore.items.get(id);
            return { Item: item ? { ...item } : undefined };
          }
          
          if (commandName === 'UpdateCommand') {
            const id = command.input.Key.id;
            const item = mockStore.items.get(id);
            if (!item) return { Attributes: null };
            
            // Apply updates
            const updates = command.input.ExpressionAttributeValues;
            Object.keys(updates).forEach(key => {
              const attrName = key.substring(1); // Remove ':'
              item[attrName] = updates[key];
            });
            
            mockStore.items.set(id, item);
            return { Attributes: { ...item } };
          }
          
          if (commandName === 'QueryCommand') {
            const statusValue = command.input.ExpressionAttributeValues?.[':pending'] || 
                               command.input.ExpressionAttributeValues?.[':status'];
            const items = Array.from(mockStore.items.values())
              .filter((item: any) => item.status === statusValue)
              .sort((a: any, b: any) => b.priority - a.priority)
              .slice(0, command.input.Limit || 100);
            
            return { Items: items.map(i => ({ ...i })), Count: items.length };
          }
          
          if (commandName === 'DeleteCommand') {
            const id = command.input.Key.id;
            mockStore.items.delete(id);
            return {};
          }
          
          return {};
        }),
      })),
    },
    PutCommand: class PutCommand {
      constructor(public input: any) {}
    },
    GetCommand: class GetCommand {
      constructor(public input: any) {}
    },
    UpdateCommand: class UpdateCommand {
      constructor(public input: any) {}
    },
    QueryCommand: class QueryCommand {
      constructor(public input: any) {}
    },
    DeleteCommand: class DeleteCommand {
      constructor(public input: any) {}
    },
  };
});

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(() => ({})),
}));

// Arbitrary: Generate supplement query
const supplementQueryArbitrary = fc.string({ minLength: 3, maxLength: 50 })
  .filter(s => s.trim().length >= 3);

// Arbitrary: Generate normalized query
const normalizedQueryArbitrary = fc.string({ minLength: 3, maxLength: 50 })
  .map(s => s.toLowerCase().trim())
  .filter(s => s.length >= 3);

// Arbitrary: Generate study count
const studyCountArbitrary = fc.integer({ min: 0, max: 1000 });

// Arbitrary: Generate supplement ID
const supplementIdArbitrary = fc.integer({ min: 1, max: 100000 });

describe('Property 25: Auto-Discovery Insertion', () => {
  beforeEach(() => {
    // Clear mock data before each test
    mockStore.clear();
    jest.clearAllMocks();
  });

  /**
   * Property 25a: Enqueued items can be retrieved
   * 
   * For any supplement query, after enqueuing it should be retrievable from the queue
   */
  it('should allow retrieval of enqueued items', async () => {
    await fc.assert(
      fc.asyncProperty(
        supplementQueryArbitrary,
        normalizedQueryArbitrary,
        async (query, normalizedQuery) => {
          // Clear store before each property run
          mockStore.clear();
          
          // Enqueue the discovery
          const enqueued = await enqueueDiscovery(query, normalizedQuery);
          
          // Verify it was enqueued
          expect(enqueued).toBeDefined();
          expect(enqueued.query).toBe(query);
          expect(enqueued.normalizedQuery).toBe(normalizedQuery);
          expect(enqueued.status).toBe('pending');
          expect(enqueued.searchCount).toBe(1);
          
          // Retrieve it
          const retrieved = await getQueueItem(enqueued.id);
          
          // Verify retrieval
          return (
            retrieved !== null &&
            retrieved.id === enqueued.id &&
            retrieved.query === query &&
            retrieved.normalizedQuery === normalizedQuery
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 25b: Completed items have supplementId
   * 
   * For any discovered supplement that is marked as completed,
   * it should have a supplementId indicating it was added to the database
   */
  it('should assign supplementId when marked as completed', async () => {
    await fc.assert(
      fc.asyncProperty(
        supplementQueryArbitrary,
        normalizedQueryArbitrary,
        supplementIdArbitrary,
        studyCountArbitrary,
        fc.constantFrom('valid', 'invalid', 'low-evidence'),
        async (query, normalizedQuery, supplementId, studyCount, validationStatus) => {
          // Clear store before each property run
          mockStore.clear();
          
          // Enqueue the discovery
          const enqueued = await enqueueDiscovery(query, normalizedQuery);
          
          // Mark as completed
          const completed = await markCompleted(
            enqueued.id,
            supplementId,
            studyCount,
            validationStatus as 'valid' | 'invalid' | 'low-evidence'
          );
          
          // Verify completion
          return (
            completed.status === 'completed' &&
            completed.supplementId === supplementId &&
            completed.pubmedStudyCount === studyCount &&
            completed.validationStatus === validationStatus &&
            completed.processedAt !== undefined
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 25c: Duplicate queries increment search count
   * 
   * For any supplement query that is enqueued multiple times,
   * the search count should increment rather than creating duplicate entries
   */
  it('should increment search count for duplicate queries', async () => {
    await fc.assert(
      fc.asyncProperty(
        supplementQueryArbitrary,
        fc.integer({ min: 2, max: 20 }),
        async (query, enqueueCount) => {
          // Clear store before each property run
          mockStore.clear();
          
          // Use the same query as normalized query to ensure duplicates are detected
          const normalizedQuery = query.toLowerCase().trim();
          
          // Enqueue the same query multiple times
          let lastEnqueued: DiscoveryQueueItem | null = null;
          for (let i = 0; i < enqueueCount; i++) {
            lastEnqueued = await enqueueDiscovery(query, normalizedQuery);
          }
          
          // Verify search count incremented
          return (
            lastEnqueued !== null &&
            lastEnqueued.searchCount === enqueueCount
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 25d: Dequeued items are marked as processing
   * 
   * For any pending item that is dequeued, its status should change to 'processing'
   */
  it('should mark dequeued items as processing', async () => {
    await fc.assert(
      fc.asyncProperty(
        supplementQueryArbitrary,
        async (query) => {
          // Clear store before each property run
          mockStore.clear();
          
          const normalizedQuery = query.toLowerCase().trim();
          
          // Enqueue the discovery
          await enqueueDiscovery(query, normalizedQuery);
          
          // Dequeue it
          const dequeued = await dequeueDiscovery();
          
          // Verify it's marked as processing
          return (
            dequeued !== null &&
            dequeued.status === 'processing' &&
            dequeued.query === query
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 25e: Priority increases with search count
   * 
   * For any supplement query, higher search counts should result in higher priority
   */
  it('should increase priority with search count', async () => {
    await fc.assert(
      fc.asyncProperty(
        supplementQueryArbitrary,
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 6, max: 20 }),
        async (query, lowCount, highCount) => {
          // Clear store before each property run
          mockStore.clear();
          
          const lowQuery = query + '_low';
          const highQuery = query + '_high';
          const lowNormalized = lowQuery.toLowerCase().trim();
          const highNormalized = highQuery.toLowerCase().trim();
          
          // Enqueue with low count
          let lowPriorityItem: DiscoveryQueueItem | null = null;
          for (let i = 0; i < lowCount; i++) {
            lowPriorityItem = await enqueueDiscovery(lowQuery, lowNormalized);
          }
          
          // Enqueue with high count
          let highPriorityItem: DiscoveryQueueItem | null = null;
          for (let i = 0; i < highCount; i++) {
            highPriorityItem = await enqueueDiscovery(highQuery, highNormalized);
          }
          
          // Verify higher search count has higher priority
          return (
            lowPriorityItem !== null &&
            highPriorityItem !== null &&
            highPriorityItem.priority > lowPriorityItem.priority
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 25f: Validation status is preserved
   * 
   * For any discovered supplement, the validation status should be preserved
   * when marked as completed
   */
  it('should preserve validation status', async () => {
    await fc.assert(
      fc.asyncProperty(
        supplementQueryArbitrary,
        normalizedQueryArbitrary,
        supplementIdArbitrary,
        studyCountArbitrary,
        async (query, normalizedQuery, supplementId, studyCount) => {
          // Clear store before each property run
          mockStore.clear();
          
          // Determine validation status based on study count
          const validationStatus = studyCount === 0 ? 'invalid' :
                                   studyCount < 5 ? 'low-evidence' : 'valid';
          
          // Enqueue and complete
          const enqueued = await enqueueDiscovery(query, normalizedQuery);
          const completed = await markCompleted(
            enqueued.id,
            supplementId,
            studyCount,
            validationStatus
          );
          
          // Verify validation status matches study count
          const statusMatches = 
            (studyCount === 0 && completed.validationStatus === 'invalid') ||
            (studyCount > 0 && studyCount < 5 && completed.validationStatus === 'low-evidence') ||
            (studyCount >= 5 && completed.validationStatus === 'valid');
          
          return statusMatches;
        }
      ),
      { numRuns: 100 }
    );
  });
});
