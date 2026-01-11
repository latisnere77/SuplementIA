/**
 * DynamoDB + DAX Configuration for L1 Cache
 * 
 * This file contains configuration for DynamoDB table with DAX
 * (DynamoDB Accelerator) for microsecond latency caching.
 */

// ====================================
// DYNAMODB TABLE CONFIGURATION
// ====================================

export const DYNAMODB_CACHE_CONFIG = {
  TableName: 'supplement-cache',
  BillingMode: 'PAY_PER_REQUEST', // On-demand pricing
  
  KeySchema: [
    { AttributeName: 'PK', KeyType: 'HASH' },  // Partition key
    { AttributeName: 'SK', KeyType: 'RANGE' }, // Sort key
  ],
  
  AttributeDefinitions: [
    { AttributeName: 'PK', AttributeType: 'S' },
    { AttributeName: 'SK', AttributeType: 'S' },
    { AttributeName: 'searchCount', AttributeType: 'N' },
  ],
  
  GlobalSecondaryIndexes: [
    {
      IndexName: 'searchCount-index',
      KeySchema: [
        { AttributeName: 'SK', KeyType: 'HASH' },
        { AttributeName: 'searchCount', KeyType: 'RANGE' },
      ],
      Projection: {
        ProjectionType: 'ALL',
      },
    },
  ],
  
  TimeToLiveSpecification: {
    Enabled: true,
    AttributeName: 'ttl',
  },
  
  StreamSpecification: {
    StreamEnabled: true,
    StreamViewType: 'NEW_AND_OLD_IMAGES',
  },
  
  Tags: [
    { Key: 'Environment', Value: 'production' },
    { Key: 'Application', Value: 'suplementia' },
    { Key: 'Purpose', Value: 'supplement-cache' },
  ],
};

// ====================================
// DAX CLUSTER CONFIGURATION
// ====================================

export const DAX_CONFIG = {
  // Cluster details
  clusterName: 'suplementia-dax',
  nodeType: 'dax.t3.small', // Smallest production-ready size
  replicationFactor: 3, // 1 primary + 2 replicas for HA
  
  // Network
  port: 8111,
  
  // Security
  sseEnabled: true, // Server-side encryption
  
  // Maintenance
  maintenanceWindow: 'sun:05:00-sun:06:00', // UTC
  
  // Parameter group
  parameterGroupName: 'default.dax1.0',
  
  // Performance
  queryTTL: 300000, // 5 minutes in milliseconds
  itemTTL: 300000, // 5 minutes in milliseconds
};

// ====================================
// CACHE ITEM STRUCTURE
// ====================================

export interface CacheItem {
  // Keys
  PK: string;              // "SUPPLEMENT#{hash}"
  SK: string;              // "QUERY" or "EMBEDDING"
  
  // Data
  supplementData?: {
    id: number;
    name: string;
    scientificName?: string;
    commonNames: string[];
    metadata: Record<string, any>;
    similarity: number;
  };
  
  embedding?: number[];    // 384-dim vector
  
  // Metadata
  searchCount: number;
  lastAccessed: number;    // Unix timestamp
  cachedAt: number;        // Unix timestamp
  ttl: number;             // Unix timestamp for auto-deletion
}

// ====================================
// HELPER FUNCTIONS
// ====================================

/**
 * Generate partition key for supplement query
 */
export function generateSupplementPK(query: string): string {
  const hash = hashQuery(query);
  return `SUPPLEMENT#${hash}`;
}

/**
 * Generate partition key for embedding
 */
export function generateEmbeddingPK(text: string): string {
  const hash = hashQuery(text);
  return `EMBEDDING#${hash}`;
}

/**
 * Hash query string for consistent keys
 */
function hashQuery(query: string): string {
  const normalized = query.toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Calculate TTL (7 days from now)
 */
export function calculateTTL(daysFromNow: number = 7): number {
  return Math.floor(Date.now() / 1000) + (daysFromNow * 24 * 60 * 60);
}

// ====================================
// CLOUDFORMATION TEMPLATE
// ====================================

export const DYNAMODB_DAX_CLOUDFORMATION_TEMPLATE = `
AWSTemplateFormatVersion: '2010-09-09'
Description: 'DynamoDB table with DAX cluster for supplement cache'

Parameters:
  Environment:
    Type: String
    Default: production
    AllowedValues:
      - development
      - staging
      - production

Resources:
  # DynamoDB Table
  SupplementCacheTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub '\${Environment}-supplement-cache'
      BillingMode: PAY_PER_REQUEST
      
      AttributeDefinitions:
        - AttributeName: PK
          AttributeType: S
        - AttributeName: SK
          AttributeType: S
        - AttributeName: searchCount
          AttributeType: N
      
      KeySchema:
        - AttributeName: PK
          KeyType: HASH
        - AttributeName: SK
          KeyType: RANGE
      
      GlobalSecondaryIndexes:
        - IndexName: searchCount-index
          KeySchema:
            - AttributeName: SK
              KeyType: HASH
            - AttributeName: searchCount
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
      
      TimeToLiveSpecification:
        Enabled: true
        AttributeName: ttl
      
      StreamSpecification:
        StreamViewType: NEW_AND_OLD_IMAGES
      
      SSESpecification:
        SSEEnabled: true
        SSEType: KMS
      
      PointInTimeRecoverySpecification:
        PointInTimeRecoveryEnabled: true
      
      Tags:
        - Key: Environment
          Value: !Ref Environment
        - Key: Application
          Value: suplementia

  # DAX Subnet Group
  DAXSubnetGroup:
    Type: AWS::DAX::SubnetGroup
    Properties:
      SubnetGroupName: !Sub '\${Environment}-dax-subnet'
      Description: Subnet group for DAX cluster
      SubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2

  # DAX Security Group
  DAXSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupName: !Sub '\${Environment}-dax-sg'
      GroupDescription: Security group for DAX cluster
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 8111
          ToPort: 8111
          SourceSecurityGroupId: !Ref LambdaSecurityGroup
      Tags:
        - Key: Environment
          Value: !Ref Environment

  # DAX IAM Role
  DAXRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub '\${Environment}-dax-role'
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: dax.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: DAXDynamoDBAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - dynamodb:GetItem
                  - dynamodb:PutItem
                  - dynamodb:UpdateItem
                  - dynamodb:DeleteItem
                  - dynamodb:Query
                  - dynamodb:Scan
                  - dynamodb:BatchGetItem
                  - dynamodb:BatchWriteItem
                Resource:
                  - !GetAtt SupplementCacheTable.Arn
                  - !Sub '\${SupplementCacheTable.Arn}/index/*'

  # DAX Cluster
  DAXCluster:
    Type: AWS::DAX::Cluster
    Properties:
      ClusterName: !Sub '\${Environment}-supplements-dax'
      Description: DAX cluster for supplement cache
      NodeType: dax.t3.small
      ReplicationFactor: 3
      IAMRoleARN: !GetAtt DAXRole.Arn
      SubnetGroupName: !Ref DAXSubnetGroup
      SecurityGroupIds:
        - !Ref DAXSecurityGroup
      SSESpecification:
        SSEEnabled: true
      PreferredMaintenanceWindow: 'sun:05:00-sun:06:00'
      NotificationTopicARN: !Ref DAXAlarmTopic
      Tags:
        - Key: Environment
          Value: !Ref Environment
        - Key: Application
          Value: suplementia

  # SNS Topic for Alarms
  DAXAlarmTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: !Sub '\${Environment}-dax-alarms'
      DisplayName: DAX Cluster Alarms

  # CloudWatch Alarms
  DAXCPUAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub '\${Environment}-dax-high-cpu'
      AlarmDescription: Alert when DAX CPU exceeds 75%
      MetricName: CPUUtilization
      Namespace: AWS/DAX
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 75
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: ClusterName
          Value: !Ref DAXCluster
      AlarmActions:
        - !Ref DAXAlarmTopic

  DAXCacheMissAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub '\${Environment}-dax-high-cache-miss'
      AlarmDescription: Alert when DAX cache miss rate exceeds 20%
      MetricName: ItemCacheMisses
      Namespace: AWS/DAX
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 20
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: ClusterName
          Value: !Ref DAXCluster
      AlarmActions:
        - !Ref DAXAlarmTopic

Outputs:
  TableName:
    Description: DynamoDB table name
    Value: !Ref SupplementCacheTable
    Export:
      Name: !Sub '\${Environment}-SupplementCacheTable'

  TableArn:
    Description: DynamoDB table ARN
    Value: !GetAtt SupplementCacheTable.Arn
    Export:
      Name: !Sub '\${Environment}-SupplementCacheTableArn'

  DAXEndpoint:
    Description: DAX cluster endpoint
    Value: !GetAtt DAXCluster.ClusterDiscoveryEndpoint
    Export:
      Name: !Sub '\${Environment}-DAXEndpoint'
`;

// ====================================
// SETUP INSTRUCTIONS
// ====================================

export const DAX_SETUP_GUIDE = `
# DynamoDB + DAX Setup Guide

## 1. Create DynamoDB Table and DAX Cluster

\`\`\`bash
aws cloudformation create-stack \\
  --stack-name supplements-cache-dax \\
  --template-body file://infrastructure/dynamodb-dax-cloudformation.yml \\
  --parameters ParameterKey=Environment,ParameterValue=production \\
  --capabilities CAPABILITY_NAMED_IAM
\`\`\`

## 2. Wait for Stack Creation

\`\`\`bash
aws cloudformation wait stack-create-complete \\
  --stack-name supplements-cache-dax
\`\`\`

## 3. Get DAX Endpoint

\`\`\`bash
aws cloudformation describe-stacks \\
  --stack-name supplements-cache-dax \\
  --query 'Stacks[0].Outputs'
\`\`\`

## 4. Test DynamoDB Table

\`\`\`bash
aws dynamodb describe-table \\
  --table-name production-supplement-cache
\`\`\`

## 5. Add to Environment Variables

\`\`\`bash
DYNAMODB_CACHE_TABLE=production-supplement-cache
DAX_ENDPOINT=<dax-endpoint>
DAX_PORT=8111
\`\`\`

## Cost Estimate

- DynamoDB (on-demand): $2/month for 10K searches/day
- DAX cluster (3 nodes × dax.t3.small): $8/month
- Total: ~$10/month

## Performance Benefits

- DynamoDB alone: ~10ms latency
- DynamoDB + DAX: <1ms latency (microseconds)
- 10x cost reduction vs direct DynamoDB reads
- 90%+ cache hit rate expected

## Monitoring

1. Monitor cache hit rate in CloudWatch
2. Track request latency
3. Monitor CPU and memory usage
4. Set up alarms for anomalies
`;
