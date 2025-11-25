/**
 * Type declarations for amazon-dax-client
 * 
 * Amazon DynamoDB Accelerator (DAX) is a fully managed, highly available,
 * in-memory cache for DynamoDB that delivers up to 10x performance improvement.
 */

declare module 'amazon-dax-client' {
  import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';

  interface DAXClientConfig extends DynamoDBClientConfig {
    endpoints: string[];
    region?: string;
    requestTimeout?: number;
    maxRetries?: number;
  }

  class AmazonDaxClient extends DynamoDBClient {
    constructor(config: DAXClientConfig);
  }

  export = AmazonDaxClient;
}
