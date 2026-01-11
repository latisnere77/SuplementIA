/**
 * DynamoDB Schema for Supplement Discovery Queue
 * 
 * This table manages the auto-discovery system for new supplements.
 * When users search for unknown supplements, they are added to this queue
 * for background processing and validation.
 */

import { AttributeValue } from '@aws-sdk/client-dynamodb';

// ====================================
// TABLE SCHEMA
// ====================================

export const DISCOVERY_QUEUE_CONFIG = {
  TableName: 'supplement-discovery-queue',
  BillingMode: 'PAY_PER_REQUEST', // On-demand, scales automatically

  KeySchema: [
    { AttributeName: 'id', KeyType: 'HASH' }, // Partition key
  ],

  AttributeDefinitions: [
    { AttributeName: 'id', AttributeType: 'S' },
    { AttributeName: 'priority', AttributeType: 'N' },
    { AttributeName: 'status', AttributeType: 'S' },
  ],

  GlobalSecondaryIndexes: [
    {
      IndexName: 'priority-index',
      KeySchema: [
        { AttributeName: 'status', KeyType: 'HASH' },
        { AttributeName: 'priority', KeyType: 'RANGE' },
      ],
      Projection: {
        ProjectionType: 'ALL',
      },
    },
  ],

  Tags: [
    { Key: 'Environment', Value: 'production' },
    { Key: 'Application', Value: 'suplementia' },
    { Key: 'Purpose', Value: 'supplement-discovery-queue' },
  ],
};

// ====================================
// ITEM STRUCTURE
// ====================================

export interface DiscoveryQueueItem {
  // Primary Key
  id: string; // UUID

  // Query Information
  query: string; // Original user query
  normalizedQuery: string; // Normalized version

  // Priority & Status
  searchCount: number; // How many times this was searched
  priority: number; // Calculated priority score (higher = more important)
  status: 'pending' | 'processing' | 'completed' | 'failed';

  // Processing Information
  createdAt: number; // Unix timestamp
  processedAt?: number; // Unix timestamp when processed
  failureReason?: string; // Error message if failed
  retryCount: number; // Number of retry attempts

  // Validation Results (after processing)
  pubmedStudyCount?: number;
  validationStatus?: 'valid' | 'invalid' | 'low-evidence';
  supplementId?: number; // ID in supplements table if successfully added
}

// ====================================
// HELPER FUNCTIONS
// ====================================

/**
 * Convert DiscoveryQueueItem to DynamoDB format
 */
export function toDynamoDBItem(item: DiscoveryQueueItem): Record<string, AttributeValue> {
  const dynamoItem: Record<string, AttributeValue> = {
    id: { S: item.id },
    query: { S: item.query },
    normalizedQuery: { S: item.normalizedQuery },
    searchCount: { N: item.searchCount.toString() },
    priority: { N: item.priority.toString() },
    status: { S: item.status },
    createdAt: { N: item.createdAt.toString() },
    retryCount: { N: item.retryCount.toString() },
  };

  if (item.processedAt) {
    dynamoItem.processedAt = { N: item.processedAt.toString() };
  }

  if (item.failureReason) {
    dynamoItem.failureReason = { S: item.failureReason };
  }

  if (item.pubmedStudyCount !== undefined) {
    dynamoItem.pubmedStudyCount = { N: item.pubmedStudyCount.toString() };
  }

  if (item.validationStatus) {
    dynamoItem.validationStatus = { S: item.validationStatus };
  }

  if (item.supplementId !== undefined) {
    dynamoItem.supplementId = { N: item.supplementId.toString() };
  }

  return dynamoItem;
}

/**
 * Convert DynamoDB item to DiscoveryQueueItem
 */
export function fromDynamoDBItem(item: Record<string, AttributeValue>): DiscoveryQueueItem {
  const queueItem: DiscoveryQueueItem = {
    id: item.id.S!,
    query: item.query.S!,
    normalizedQuery: item.normalizedQuery.S!,
    searchCount: parseInt(item.searchCount.N!),
    priority: parseInt(item.priority.N!),
    status: item.status.S! as 'pending' | 'processing' | 'completed' | 'failed',
    createdAt: parseInt(item.createdAt.N!),
    retryCount: parseInt(item.retryCount.N!),
  };

  if (item.processedAt?.N) {
    queueItem.processedAt = parseInt(item.processedAt.N);
  }

  if (item.failureReason?.S) {
    queueItem.failureReason = item.failureReason.S;
  }

  if (item.pubmedStudyCount?.N) {
    queueItem.pubmedStudyCount = parseInt(item.pubmedStudyCount.N);
  }

  if (item.validationStatus?.S) {
    queueItem.validationStatus = item.validationStatus.S as 'valid' | 'invalid' | 'low-evidence';
  }

  if (item.supplementId?.N) {
    queueItem.supplementId = parseInt(item.supplementId.N);
  }

  return queueItem;
}

/**
 * Calculate priority score based on search count and age
 * Higher score = higher priority
 */
export function calculatePriority(searchCount: number, ageInDays: number): number {
  // Priority formula: searchCount * 10 - (ageInDays * 0.1)
  // Recent searches with high count get highest priority
  const searchWeight = searchCount * 10;
  const ageWeight = ageInDays * 0.1;
  return Math.max(0, searchWeight - ageWeight);
}

/**
 * Generate unique ID for queue item
 */
export function generateQueueId(query: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const normalized = query.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${normalized}-${timestamp}-${random}`;
}

// ====================================
// CLOUDFORMATION TEMPLATE
// ====================================

export const DISCOVERY_QUEUE_CLOUDFORMATION = {
  AWSTemplateFormatVersion: '2010-09-09',
  Description: 'DynamoDB table for supplement discovery queue',

  Resources: {
    SupplementDiscoveryQueue: {
      Type: 'AWS::DynamoDB::Table',
      Properties: {
        TableName: DISCOVERY_QUEUE_CONFIG.TableName,
        BillingMode: DISCOVERY_QUEUE_CONFIG.BillingMode,
        AttributeDefinitions: DISCOVERY_QUEUE_CONFIG.AttributeDefinitions,
        KeySchema: DISCOVERY_QUEUE_CONFIG.KeySchema,
        GlobalSecondaryIndexes: DISCOVERY_QUEUE_CONFIG.GlobalSecondaryIndexes,
        Tags: DISCOVERY_QUEUE_CONFIG.Tags,
        StreamSpecification: {
          StreamViewType: 'NEW_AND_OLD_IMAGES',
        },
      },
    },
  },

  Outputs: {
    TableName: {
      Description: 'Name of the discovery queue table',
      Value: { Ref: 'SupplementDiscoveryQueue' },
      Export: { Name: 'SupplementDiscoveryQueueTable' },
    },
    TableArn: {
      Description: 'ARN of the discovery queue table',
      Value: { 'Fn::GetAtt': ['SupplementDiscoveryQueue', 'Arn'] },
      Export: { Name: 'SupplementDiscoveryQueueTableArn' },
    },
    StreamArn: {
      Description: 'ARN of the DynamoDB stream',
      Value: { 'Fn::GetAtt': ['SupplementDiscoveryQueue', 'StreamArn'] },
      Export: { Name: 'SupplementDiscoveryQueueStreamArn' },
    },
  },
};
