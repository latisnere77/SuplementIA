/**
 * DynamoDB Schema for Dynamic Supplement Evidence Cache
 *
 * This file defines the structure for storing dynamically generated
 * supplement evidence data.
 */

import { AttributeValue } from '@aws-sdk/client-dynamodb';

// ====================================
// TABLE SCHEMA
// ====================================

export const TABLE_CONFIG = {
  TableName: 'supplements-evidence-cache',
  BillingMode: 'PAY_PER_REQUEST', // On-demand, scales automatically

  KeySchema: [
    { AttributeName: 'supplementName', KeyType: 'HASH' }, // Partition key
  ],

  AttributeDefinitions: [
    { AttributeName: 'supplementName', AttributeType: 'S' },
    { AttributeName: 'generatedAt', AttributeType: 'N' },
  ],

  GlobalSecondaryIndexes: [
    {
      IndexName: 'generatedAt-index',
      KeySchema: [
        { AttributeName: 'generatedAt', KeyType: 'HASH' },
      ],
      Projection: {
        ProjectionType: 'ALL',
      },
    },
  ],

  // TTL Configuration (auto-delete after 30 days)
  TimeToLiveSpecification: {
    Enabled: true,
    AttributeName: 'ttl',
  },

  Tags: [
    { Key: 'Environment', Value: 'production' },
    { Key: 'Application', Value: 'suplementia' },
    { Key: 'Purpose', Value: 'dynamic-evidence-cache' },
  ],
};

// ====================================
// ITEM STRUCTURE
// ====================================

export interface SupplementCacheItem {
  // Primary Key
  supplementName: string; // e.g., "vitamina-b12", "zinc"

  // Evidence Data (JSON stored as string)
  evidenceData: string; // Stringified RichSupplementData

  // Metadata
  generatedAt: number; // Unix timestamp
  studyQuality: 'high' | 'medium' | 'low';
  studyCount: number;
  rctCount: number;
  metaAnalysisCount: number;

  // Sources (for verification)
  pubmedIds: string[]; // Array of PMIDs

  // Cache Management
  version: string; // Schema version (e.g., "1.0")
  ttl: number; // Unix timestamp for auto-deletion (30 days)

  // Stats
  searchCount: number; // How many times this supplement was searched
  lastAccessed: number; // Last time this cache was accessed
}

// ====================================
// HELPER FUNCTIONS
// ====================================

/**
 * Convert SupplementCacheItem to DynamoDB format
 */
export function toDynamoDBItem(item: SupplementCacheItem): Record<string, AttributeValue> {
  return {
    supplementName: { S: item.supplementName },
    evidenceData: { S: item.evidenceData },
    generatedAt: { N: item.generatedAt.toString() },
    studyQuality: { S: item.studyQuality },
    studyCount: { N: item.studyCount.toString() },
    rctCount: { N: item.rctCount.toString() },
    metaAnalysisCount: { N: item.metaAnalysisCount.toString() },
    pubmedIds: { SS: item.pubmedIds.length > 0 ? item.pubmedIds : ['none'] },
    version: { S: item.version },
    ttl: { N: item.ttl.toString() },
    searchCount: { N: item.searchCount.toString() },
    lastAccessed: { N: item.lastAccessed.toString() },
  };
}

/**
 * Convert DynamoDB item to SupplementCacheItem
 */
export function fromDynamoDBItem(item: Record<string, AttributeValue>): SupplementCacheItem {
  return {
    supplementName: item.supplementName.S!,
    evidenceData: item.evidenceData.S!,
    generatedAt: parseInt(item.generatedAt.N!),
    studyQuality: item.studyQuality.S! as 'high' | 'medium' | 'low',
    studyCount: parseInt(item.studyCount.N!),
    rctCount: parseInt(item.rctCount.N!),
    metaAnalysisCount: parseInt(item.metaAnalysisCount.N!),
    pubmedIds: Array.from(item.pubmedIds.SS || []),
    version: item.version.S!,
    ttl: parseInt(item.ttl.N!),
    searchCount: parseInt(item.searchCount.N!),
    lastAccessed: parseInt(item.lastAccessed.N!),
  };
}

/**
 * Calculate TTL (30 days from now)
 */
export function calculateTTL(daysFromNow: number = 30): number {
  return Math.floor(Date.now() / 1000) + (daysFromNow * 24 * 60 * 60);
}

/**
 * Normalize supplement name for consistent storage
 */
export function normalizeSupplementName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// ====================================
// CLOUDFORMATION TEMPLATE (for deployment)
// ====================================

export const CLOUDFORMATION_TEMPLATE = {
  AWSTemplateFormatVersion: '2010-09-09',
  Description: 'DynamoDB table for supplement evidence cache',

  Resources: {
    SupplementsEvidenceCache: {
      Type: 'AWS::DynamoDB::Table',
      Properties: {
        TableName: TABLE_CONFIG.TableName,
        BillingMode: TABLE_CONFIG.BillingMode,
        AttributeDefinitions: TABLE_CONFIG.AttributeDefinitions,
        KeySchema: TABLE_CONFIG.KeySchema,
        GlobalSecondaryIndexes: TABLE_CONFIG.GlobalSecondaryIndexes,
        TimeToLiveSpecification: TABLE_CONFIG.TimeToLiveSpecification,
        Tags: TABLE_CONFIG.Tags,
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true,
        },
      },
    },
  },

  Outputs: {
    TableName: {
      Description: 'Name of the DynamoDB table',
      Value: { Ref: 'SupplementsEvidenceCache' },
      Export: { Name: 'SupplementsEvidenceCacheTable' },
    },
    TableArn: {
      Description: 'ARN of the DynamoDB table',
      Value: { 'Fn::GetAtt': ['SupplementsEvidenceCache', 'Arn'] },
      Export: { Name: 'SupplementsEvidenceCacheTableArn' },
    },
  },
};

// ====================================
// CDK CONSTRUCT (alternative to CloudFormation)
// ====================================

export const CDK_CODE = `
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cdk from 'aws-cdk-lib';

export class SupplementsCacheStack extends cdk.Stack {
  public readonly table: dynamodb.Table;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.table = new dynamodb.Table(this, 'SupplementsEvidenceCache', {
      tableName: '${TABLE_CONFIG.TableName}',
      partitionKey: {
        name: 'supplementName',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Don't delete on stack deletion
    });

    // Add GSI for querying by generatedAt
    this.table.addGlobalSecondaryIndex({
      indexName: 'generatedAt-index',
      partitionKey: {
        name: 'generatedAt',
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Output
    new cdk.CfnOutput(this, 'TableName', {
      value: this.table.tableName,
      exportName: 'SupplementsEvidenceCacheTable',
    });
  }
}
`;
