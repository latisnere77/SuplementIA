/**
 * ElastiCache Redis Configuration for L2 Cache
 * 
 * This file contains configuration for ElastiCache Redis cluster
 * serving as L2 cache between DynamoDB DAX and RDS Postgres.
 */

// ====================================
// ELASTICACHE CONFIGURATION
// ====================================

export const ELASTICACHE_CONFIG = {
  // Cluster details
  clusterName: 'suplementia-cache',
  engine: 'redis',
  engineVersion: '7.0',
  nodeType: 'cache.t3.micro', // Free tier eligible
  
  // Cluster mode
  clusterMode: 'enabled',
  numNodeGroups: 1, // Number of shards
  replicasPerNodeGroup: 1, // 1 replica for HA
  
  // Network
  port: 6379,
  
  // Security
  transitEncryptionEnabled: true,
  atRestEncryptionEnabled: true,
  authTokenEnabled: true,
  
  // Backup
  snapshotRetentionLimit: 5, // days
  snapshotWindow: '03:00-05:00', // UTC
  
  // Maintenance
  maintenanceWindow: 'sun:05:00-sun:06:00', // UTC
  autoMinorVersionUpgrade: true,
  
  // Performance
  maxMemory: '512mb',
  maxMemoryPolicy: 'allkeys-lru', // LRU eviction
};

// ====================================
// CACHE CONFIGURATION
// ====================================

export const CACHE_CONFIG = {
  // TTL settings
  defaultTTL: 7 * 24 * 60 * 60, // 7 days in seconds
  shortTTL: 1 * 60 * 60, // 1 hour for volatile data
  longTTL: 30 * 24 * 60 * 60, // 30 days for stable data
  
  // Connection pool
  maxConnections: 50,
  minConnections: 10,
  
  // Timeouts
  connectTimeout: 5000, // ms
  commandTimeout: 5000, // ms
  
  // Retry
  maxRetries: 3,
  retryDelay: 100, // ms
  
  // Performance targets
  targetLatency: 5, // ms
  targetHitRate: 0.85, // 85%
};

// ====================================
// CACHE KEY PATTERNS
// ====================================

export const CACHE_KEYS = {
  // Supplement search results
  supplement: (query: string) => `supplement:query:${hashQuery(query)}`,
  
  // Embeddings cache
  embedding: (text: string) => `embedding:${hashQuery(text)}`,
  
  // Analytics
  analytics: (date: string) => `analytics:${date}`,
  
  // Popular supplements (sorted set)
  popular: () => 'supplements:popular',
  
  // Recent searches (list)
  recent: () => 'supplements:recent',
  
  // Search count
  searchCount: (supplementId: number) => `supplement:${supplementId}:count`,
};

// ====================================
// HELPER FUNCTIONS
// ====================================

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

// ====================================
// CLOUDFORMATION TEMPLATE
// ====================================

export const ELASTICACHE_CLOUDFORMATION_TEMPLATE = `
AWSTemplateFormatVersion: '2010-09-09'
Description: 'ElastiCache Redis cluster for supplement cache'

Parameters:
  Environment:
    Type: String
    Default: production
    AllowedValues:
      - development
      - staging
      - production

  AuthToken:
    Type: String
    NoEcho: true
    Description: Redis AUTH token
    MinLength: 16

Resources:
  # Subnet Group
  CacheSubnetGroup:
    Type: AWS::ElastiCache::SubnetGroup
    Properties:
      CacheSubnetGroupName: !Sub '\${Environment}-cache-subnet'
      Description: Subnet group for Redis cache
      SubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2
      Tags:
        - Key: Environment
          Value: !Ref Environment

  # Security Group
  CacheSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupName: !Sub '\${Environment}-cache-sg'
      GroupDescription: Security group for Redis cache
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 6379
          ToPort: 6379
          SourceSecurityGroupId: !Ref LambdaSecurityGroup
      Tags:
        - Key: Environment
          Value: !Ref Environment

  # Parameter Group
  CacheParameterGroup:
    Type: AWS::ElastiCache::ParameterGroup
    Properties:
      CacheParameterGroupFamily: redis7
      Description: Custom parameter group for supplements cache
      Properties:
        maxmemory-policy: allkeys-lru
        timeout: 300

  # Replication Group (Cluster)
  CacheReplicationGroup:
    Type: AWS::ElastiCache::ReplicationGroup
    Properties:
      ReplicationGroupId: !Sub '\${Environment}-supplements-cache'
      ReplicationGroupDescription: Redis cluster for supplement search cache
      Engine: redis
      EngineVersion: '7.0'
      CacheNodeType: cache.t3.micro
      
      # Cluster mode
      ClusterMode: enabled
      NumNodeGroups: 1
      ReplicasPerNodeGroup: 1
      
      # Network
      Port: 6379
      CacheSubnetGroupName: !Ref CacheSubnetGroup
      SecurityGroupIds:
        - !Ref CacheSecurityGroup
      
      # Security
      TransitEncryptionEnabled: true
      AtRestEncryptionEnabled: true
      AuthToken: !Ref AuthToken
      
      # Backup
      SnapshotRetentionLimit: 5
      SnapshotWindow: '03:00-05:00'
      
      # Maintenance
      PreferredMaintenanceWindow: 'sun:05:00-sun:06:00'
      AutoMinorVersionUpgrade: true
      
      # Parameters
      CacheParameterGroupName: !Ref CacheParameterGroup
      
      # Monitoring
      NotificationTopicArn: !Ref CacheAlarmTopic
      
      Tags:
        - Key: Environment
          Value: !Ref Environment
        - Key: Application
          Value: suplementia

  # SNS Topic for Alarms
  CacheAlarmTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: !Sub '\${Environment}-cache-alarms'
      DisplayName: ElastiCache Alarms

  # CloudWatch Alarms
  HighCPUAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub '\${Environment}-cache-high-cpu'
      AlarmDescription: Alert when CPU exceeds 75%
      MetricName: CPUUtilization
      Namespace: AWS/ElastiCache
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 75
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: ReplicationGroupId
          Value: !Ref CacheReplicationGroup
      AlarmActions:
        - !Ref CacheAlarmTopic

  HighMemoryAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub '\${Environment}-cache-high-memory'
      AlarmDescription: Alert when memory exceeds 80%
      MetricName: DatabaseMemoryUsagePercentage
      Namespace: AWS/ElastiCache
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 80
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: ReplicationGroupId
          Value: !Ref CacheReplicationGroup
      AlarmActions:
        - !Ref CacheAlarmTopic

  LowCacheHitRateAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub '\${Environment}-cache-low-hit-rate'
      AlarmDescription: Alert when cache hit rate drops below 80%
      MetricName: CacheHitRate
      Namespace: AWS/ElastiCache
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 80
      ComparisonOperator: LessThanThreshold
      Dimensions:
        - Name: ReplicationGroupId
          Value: !Ref CacheReplicationGroup
      AlarmActions:
        - !Ref CacheAlarmTopic

Outputs:
  CacheEndpoint:
    Description: Redis cluster configuration endpoint
    Value: !GetAtt CacheReplicationGroup.ConfigurationEndPoint.Address
    Export:
      Name: !Sub '\${Environment}-CacheEndpoint'

  CachePort:
    Description: Redis cluster port
    Value: !GetAtt CacheReplicationGroup.ConfigurationEndPoint.Port
    Export:
      Name: !Sub '\${Environment}-CachePort'
`;

// ====================================
// SETUP INSTRUCTIONS
// ====================================

export const ELASTICACHE_SETUP_GUIDE = `
# ElastiCache Redis Setup Guide

## 1. Generate AUTH Token

\`\`\`bash
openssl rand -base64 32
\`\`\`

## 2. Create ElastiCache Cluster via CloudFormation

\`\`\`bash
aws cloudformation create-stack \\
  --stack-name supplements-cache \\
  --template-body file://infrastructure/elasticache-cloudformation.yml \\
  --parameters \\
    ParameterKey=Environment,ParameterValue=production \\
    ParameterKey=AuthToken,ParameterValue=YOUR_AUTH_TOKEN
\`\`\`

## 3. Wait for Stack Creation

\`\`\`bash
aws cloudformation wait stack-create-complete \\
  --stack-name supplements-cache
\`\`\`

## 4. Get Cluster Endpoint

\`\`\`bash
aws cloudformation describe-stacks \\
  --stack-name supplements-cache \\
  --query 'Stacks[0].Outputs'
\`\`\`

## 5. Test Connection

\`\`\`bash
redis-cli -h <endpoint> -p 6379 --tls --askpass
# Enter AUTH token when prompted
PING
# Should return PONG
\`\`\`

## 6. Add to Environment Variables

\`\`\`bash
ELASTICACHE_REDIS_ENDPOINT=<endpoint>
ELASTICACHE_REDIS_PORT=6379
ELASTICACHE_REDIS_AUTH_TOKEN=<token>
ELASTICACHE_REDIS_TLS=true
\`\`\`

## Cost Estimate

- cache.t3.micro: $12/month
- Data transfer: $1/month
- Backup storage: $1/month
- Total: ~$14/month

## Performance Monitoring

1. Monitor cache hit rate in CloudWatch
2. Track memory usage
3. Monitor CPU utilization
4. Set up alarms for anomalies

## Scaling Strategy

1. Start with cache.t3.micro (512MB)
2. Monitor memory usage
3. Scale up to cache.t3.small (1.5GB) if needed
4. Add more shards for horizontal scaling
`;
