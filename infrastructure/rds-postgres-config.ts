/**
 * RDS Postgres Configuration with pgvector
 * 
 * This file contains configuration for RDS Postgres database
 * with pgvector extension for vector similarity search.
 */

// ====================================
// RDS CONFIGURATION
// ====================================

export const RDS_CONFIG = {
  // Database details
  identifier: 'suplementia-supplements',
  engine: 'postgres',
  engineVersion: '15.4', // Latest with pgvector support
  instanceClass: 'db.t3.micro', // Free tier eligible
  
  // Storage
  allocatedStorage: 20, // GB (free tier: 20GB)
  storageType: 'gp3',
  storageEncrypted: true,
  
  // High Availability
  multiAZ: true, // Recommended for production
  
  // Backup
  backupRetentionPeriod: 7, // days
  preferredBackupWindow: '03:00-04:00', // UTC
  
  // Maintenance
  preferredMaintenanceWindow: 'sun:04:00-sun:05:00', // UTC
  autoMinorVersionUpgrade: true,
  
  // Performance
  maxConnections: 100,
  sharedBuffers: '256MB',
  effectiveCacheSize: '1GB',
  
  // Monitoring
  enablePerformanceInsights: true,
  performanceInsightsRetentionPeriod: 7, // days
  enableCloudwatchLogsExports: ['postgresql', 'upgrade'],
};

// ====================================
// CONNECTION CONFIGURATION
// ====================================

export interface RDSConnectionConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  max: number; // connection pool size
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

export const getConnectionConfig = (): RDSConnectionConfig => ({
  host: process.env.RDS_POSTGRES_HOST || '',
  port: parseInt(process.env.RDS_POSTGRES_PORT || '5432'),
  database: process.env.RDS_POSTGRES_DATABASE || 'supplements',
  user: process.env.RDS_POSTGRES_USER || 'postgres',
  password: process.env.RDS_POSTGRES_PASSWORD || '',
  ssl: true,
  max: 20, // connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ====================================
// PGVECTOR CONFIGURATION
// ====================================

export const PGVECTOR_CONFIG = {
  // Vector dimensions
  dimensions: 384, // all-MiniLM-L6-v2 model
  
  // Index type
  indexType: 'hnsw', // Hierarchical Navigable Small World
  
  // HNSW parameters
  m: 16, // Number of connections per layer
  efConstruction: 64, // Size of dynamic candidate list for construction
  efSearch: 40, // Size of dynamic candidate list for search
  
  // Distance metric
  distanceMetric: 'vector_cosine_ops', // Cosine similarity
  
  // Search parameters
  similarityThreshold: 0.85, // Minimum similarity score
  maxResults: 5,
};

// ====================================
// CLOUDFORMATION TEMPLATE
// ====================================

export const RDS_CLOUDFORMATION_TEMPLATE = `
AWSTemplateFormatVersion: '2010-09-09'
Description: 'RDS Postgres with pgvector for supplement search'

Parameters:
  Environment:
    Type: String
    Default: production
    AllowedValues:
      - development
      - staging
      - production

  DBPassword:
    Type: String
    NoEcho: true
    Description: Database master password
    MinLength: 8

Resources:
  # DB Subnet Group
  DBSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupName: !Sub '\${Environment}-supplements-db-subnet'
      DBSubnetGroupDescription: Subnet group for supplements database
      SubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2
      Tags:
        - Key: Environment
          Value: !Ref Environment

  # Security Group
  DBSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupName: !Sub '\${Environment}-supplements-db-sg'
      GroupDescription: Security group for supplements database
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 5432
          ToPort: 5432
          SourceSecurityGroupId: !Ref LambdaSecurityGroup
      Tags:
        - Key: Environment
          Value: !Ref Environment

  # RDS Instance
  SupplementsDB:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: !Sub '\${Environment}-supplements-db'
      Engine: postgres
      EngineVersion: '15.4'
      DBInstanceClass: db.t3.micro
      AllocatedStorage: 20
      StorageType: gp3
      StorageEncrypted: true
      
      # Database
      DBName: supplements
      MasterUsername: postgres
      MasterUserPassword: !Ref DBPassword
      
      # Network
      DBSubnetGroupName: !Ref DBSubnetGroup
      VPCSecurityGroups:
        - !Ref DBSecurityGroup
      PubliclyAccessible: false
      
      # High Availability
      MultiAZ: true
      
      # Backup
      BackupRetentionPeriod: 7
      PreferredBackupWindow: '03:00-04:00'
      CopyTagsToSnapshot: true
      
      # Maintenance
      PreferredMaintenanceWindow: 'sun:04:00-sun:05:00'
      AutoMinorVersionUpgrade: true
      
      # Monitoring
      EnablePerformanceInsights: true
      PerformanceInsightsRetentionPeriod: 7
      EnableCloudwatchLogsExports:
        - postgresql
        - upgrade
      MonitoringInterval: 60
      MonitoringRoleArn: !GetAtt RDSMonitoringRole.Arn
      
      Tags:
        - Key: Environment
          Value: !Ref Environment
        - Key: Application
          Value: suplementia

  # Monitoring Role
  RDSMonitoringRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: monitoring.rds.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole

Outputs:
  DBEndpoint:
    Description: Database endpoint
    Value: !GetAtt SupplementsDB.Endpoint.Address
    Export:
      Name: !Sub '\${Environment}-SupplementsDBEndpoint'

  DBPort:
    Description: Database port
    Value: !GetAtt SupplementsDB.Endpoint.Port
    Export:
      Name: !Sub '\${Environment}-SupplementsDBPort'

  DBName:
    Description: Database name
    Value: supplements
    Export:
      Name: !Sub '\${Environment}-SupplementsDBName'
`;

// ====================================
// SETUP INSTRUCTIONS
// ====================================

export const RDS_SETUP_GUIDE = `
# RDS Postgres Setup Guide

## 1. Create RDS Instance via CloudFormation

\`\`\`bash
aws cloudformation create-stack \\
  --stack-name supplements-rds \\
  --template-body file://infrastructure/rds-cloudformation.yml \\
  --parameters \\
    ParameterKey=Environment,ParameterValue=production \\
    ParameterKey=DBPassword,ParameterValue=YOUR_SECURE_PASSWORD \\
  --capabilities CAPABILITY_IAM
\`\`\`

## 2. Wait for Stack Creation

\`\`\`bash
aws cloudformation wait stack-create-complete \\
  --stack-name supplements-rds
\`\`\`

## 3. Get Database Endpoint

\`\`\`bash
aws cloudformation describe-stacks \\
  --stack-name supplements-rds \\
  --query 'Stacks[0].Outputs'
\`\`\`

## 4. Connect to Database

\`\`\`bash
psql -h <endpoint> -U postgres -d supplements
\`\`\`

## 5. Install pgvector Extension

\`\`\`sql
CREATE EXTENSION IF NOT EXISTS vector;
\`\`\`

## 6. Run Schema Migration

\`\`\`bash
psql -h <endpoint> -U postgres -d supplements -f infrastructure/postgres-schema.sql
\`\`\`

## 7. Verify Installation

\`\`\`sql
SELECT * FROM pg_extension WHERE extname = 'vector';
SELECT COUNT(*) FROM supplements;
\`\`\`

## 8. Add to Environment Variables

\`\`\`bash
RDS_POSTGRES_HOST=<endpoint>
RDS_POSTGRES_PORT=5432
RDS_POSTGRES_DATABASE=supplements
RDS_POSTGRES_USER=postgres
RDS_POSTGRES_PASSWORD=<password>
\`\`\`

## Cost Estimate

- Free tier (12 months): $0/month
  - db.t3.micro instance
  - 20GB storage
  - 20GB backup storage

- After free tier: ~$15/month
  - db.t3.micro: $12/month
  - Storage: $2/month
  - Backup: $1/month

## Performance Tuning

1. Enable Performance Insights
2. Monitor slow queries in CloudWatch
3. Adjust connection pool size based on load
4. Consider read replicas for high traffic
`;
