/**
 * Discovery Queue Service
 * 
 * Manages the auto-discovery queue for new supplements.
 * Implements enqueue, dequeue, and update operations with priority scoring.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  DiscoveryQueueItem,
  calculatePriority,
  generateQueueId,
} from '../../infrastructure/discovery-queue-schema';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DISCOVERY_QUEUE_TABLE || 'supplement-discovery-queue';

// ====================================
// ENQUEUE OPERATIONS
// ====================================

/**
 * Add a new supplement query to the discovery queue
 * If the query already exists, increment its search count and update priority
 */
export async function enqueueDiscovery(
  query: string,
  normalizedQuery: string
): Promise<DiscoveryQueueItem> {
  const now = Date.now();
  
  // Generate a deterministic ID based on normalized query (without timestamp/random)
  // This allows us to detect duplicates
  const normalized = normalizedQuery.toLowerCase().replace(/[^a-z0-9]/g, '');
  const id = `supplement-${normalized}`;

  // Check if item already exists
  const existing = await getQueueItem(id);

  if (existing) {
    // Update existing item: increment search count and recalculate priority
    const newSearchCount = existing.searchCount + 1;
    const ageInDays = (now - existing.createdAt) / (1000 * 60 * 60 * 24);
    const newPriority = calculatePriority(newSearchCount, ageInDays);

    const updated = await updateQueueItem(id, {
      searchCount: newSearchCount,
      priority: newPriority,
    });

    return updated;
  }

  // Create new item
  const item: DiscoveryQueueItem = {
    id,
    query,
    normalizedQuery,
    searchCount: 1,
    priority: calculatePriority(1, 0), // New item, age = 0
    status: 'pending',
    createdAt: now,
    retryCount: 0,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );

  return item;
}

/**
 * Batch enqueue multiple queries
 */
export async function batchEnqueueDiscovery(
  queries: Array<{ query: string; normalizedQuery: string }>
): Promise<DiscoveryQueueItem[]> {
  const results = await Promise.all(
    queries.map(({ query, normalizedQuery }) =>
      enqueueDiscovery(query, normalizedQuery)
    )
  );

  return results;
}

// ====================================
// DEQUEUE OPERATIONS
// ====================================

/**
 * Get the highest priority pending item from the queue
 * Marks it as 'processing' to prevent duplicate processing
 */
export async function dequeueDiscovery(): Promise<DiscoveryQueueItem | null> {
  // Query for pending items ordered by priority (descending)
  const response = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'priority-index',
      KeyConditionExpression: '#status = :pending',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pending': 'pending',
      },
      ScanIndexForward: false, // Descending order (highest priority first)
      Limit: 1,
    })
  );

  if (!response.Items || response.Items.length === 0) {
    return null;
  }

  const item = response.Items[0] as DiscoveryQueueItem;

  // Mark as processing
  const updated = await updateQueueItem(item.id, {
    status: 'processing',
  });

  return updated;
}

/**
 * Get multiple high-priority items for batch processing
 */
export async function dequeueBatch(limit: number = 10): Promise<DiscoveryQueueItem[]> {
  const response = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'priority-index',
      KeyConditionExpression: '#status = :pending',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pending': 'pending',
      },
      ScanIndexForward: false,
      Limit: limit,
    })
  );

  if (!response.Items || response.Items.length === 0) {
    return [];
  }

  // Mark all as processing
  const items = response.Items as DiscoveryQueueItem[];
  const updated = await Promise.all(
    items.map((item) =>
      updateQueueItem(item.id, {
        status: 'processing',
      })
    )
  );

  return updated;
}

// ====================================
// UPDATE OPERATIONS
// ====================================

/**
 * Update a queue item with partial data
 */
export async function updateQueueItem(
  id: string,
  updates: Partial<DiscoveryQueueItem>
): Promise<DiscoveryQueueItem> {
  // Build update expression dynamically
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    }
  });

  const response = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  return response.Attributes as DiscoveryQueueItem;
}

/**
 * Mark item as completed with validation results
 */
export async function markCompleted(
  id: string,
  supplementId: number,
  pubmedStudyCount: number,
  validationStatus: 'valid' | 'invalid' | 'low-evidence'
): Promise<DiscoveryQueueItem> {
  return updateQueueItem(id, {
    status: 'completed',
    processedAt: Date.now(),
    supplementId,
    pubmedStudyCount,
    validationStatus,
  });
}

/**
 * Mark item as failed with error reason
 */
export async function markFailed(
  id: string,
  failureReason: string,
  retryCount: number
): Promise<DiscoveryQueueItem> {
  return updateQueueItem(id, {
    status: 'failed',
    processedAt: Date.now(),
    failureReason,
    retryCount,
  });
}

/**
 * Retry a failed item (reset to pending)
 */
export async function retryQueueItem(id: string): Promise<DiscoveryQueueItem> {
  const item = await getQueueItem(id);
  if (!item) {
    throw new Error(`Queue item not found: ${id}`);
  }

  return updateQueueItem(id, {
    status: 'pending',
    retryCount: item.retryCount + 1,
  });
}

// ====================================
// QUERY OPERATIONS
// ====================================

/**
 * Get a specific queue item by ID
 */
export async function getQueueItem(id: string): Promise<DiscoveryQueueItem | null> {
  const response = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { id },
    })
  );

  return (response.Item as DiscoveryQueueItem) || null;
}

/**
 * Get all pending items ordered by priority
 */
export async function getPendingItems(limit: number = 100): Promise<DiscoveryQueueItem[]> {
  const response = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'priority-index',
      KeyConditionExpression: '#status = :pending',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pending': 'pending',
      },
      ScanIndexForward: false,
      Limit: limit,
    })
  );

  return (response.Items as DiscoveryQueueItem[]) || [];
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}> {
  const statuses = ['pending', 'processing', 'completed', 'failed'];
  const counts = await Promise.all(
    statuses.map(async (status) => {
      const response = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: 'priority-index',
          KeyConditionExpression: '#status = :status',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':status': status,
          },
          Select: 'COUNT',
        })
      );
      return response.Count || 0;
    })
  );

  return {
    pending: counts[0],
    processing: counts[1],
    completed: counts[2],
    failed: counts[3],
  };
}

/**
 * Delete a queue item (cleanup after successful processing)
 */
export async function deleteQueueItem(id: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { id },
    })
  );
}

// ====================================
// PRIORITY MANAGEMENT
// ====================================

/**
 * Recalculate priorities for all pending items
 * Should be run periodically to ensure recent searches get priority
 */
export async function recalculatePriorities(): Promise<number> {
  const pending = await getPendingItems(1000);
  const now = Date.now();

  let updated = 0;
  for (const item of pending) {
    const ageInDays = (now - item.createdAt) / (1000 * 60 * 60 * 24);
    const newPriority = calculatePriority(item.searchCount, ageInDays);

    if (newPriority !== item.priority) {
      await updateQueueItem(item.id, { priority: newPriority });
      updated++;
    }
  }

  return updated;
}

/**
 * Check if a query should be prioritized for indexing
 * Returns true if search count > 10
 */
export function shouldPrioritize(searchCount: number): boolean {
  return searchCount > 10;
}
