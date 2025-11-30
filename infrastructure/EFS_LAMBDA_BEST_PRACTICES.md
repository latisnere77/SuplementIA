# EFS + Lambda Best Practices

## Overview

This document outlines AWS best practices for configuring Amazon EFS with Lambda functions, based on official AWS documentation and real-world implementation.

## Table of Contents

1. [EFS Configuration](#efs-configuration)
2. [Lambda Configuration](#lambda-configuration)
3. [Security Best Practices](#security-best-practices)
4. [Performance Optimization](#performance-optimization)
5. [Monitoring and Troubleshooting](#monitoring-and-troubleshooting)
6. [Cost Optimization](#cost-optimization)

---

## EFS Configuration

### Access Points

**Best Practice:** Always use EFS Access Points for Lambda functions

**Why:**
- Enforces specific user/group IDs
- Provides path isolation
- Simplifies IAM permissions
- Enables better access control

**Configuration:**
```yaml
EFSAccessPoint:
  Type: AWS::EFS::AccessPoint
  Properties:
    FileSystemId: !Ref EFSFileSystem
    PosixUser:
      Uid: '1000'
      Gid: '1000'
    RootDirectory:
      Path: /lambda
      CreationInfo:
        OwnerUid: '1000'
        OwnerGid: '1000'
        Permissions: '755'
```

**Key Points:**
- Use non-root path (e.g., `/lambda`, `/ml-models`)
- Set appropriate permissions (755 for directories, 644 for files)
- Use consistent UID/GID across all functions

### Performance Mode

**Best Practice:** Choose performance mode based on workload

**Options:**

1. **General Purpose** (Recommended for most cases)
   - Lower latency
   - Suitable for: ML model loading, database files
   - Max throughput: 7,000 file operations/second
   - Use case: SuplementIA (model loading + LanceDB)

2. **Max I/O**
   - Higher throughput
   - Suitable for: Highly parallel workloads
   - Higher latency
   - Use case: Big data processing, media processing

**Note:** Performance mode cannot be changed after creation!

### Throughput Mode

**Best Practice:** Start with Bursting, upgrade to Provisioned if needed

**Options:**

1. **Bursting** (Recommended for most cases)
   - Scales with file system size
   - Included in storage cost
   - Suitable for: Variable workloads
   - Use case: SuplementIA (intermittent model loading)

2. **Provisioned**
   - Fixed throughput regardless of size
   - Additional cost
   - Suitable for: Consistent high throughput needs

### Mount Targets

**Best Practice:** Create mount targets in all AZs where Lambda runs

**Why:**
- Reduces latency (same-AZ access)
- Improves resilience
- Avoids cross-AZ data transfer costs

**Configuration:**
```yaml
# Create mount target in each AZ
EFSMountTarget1:
  Type: AWS::EFS::MountTarget
  Properties:
    FileSystemId: !Ref EFSFileSystem
    SubnetId: !Ref PrivateSubnet1  # AZ1
    SecurityGroups:
      - !Ref EFSSecurityGroup

EFSMountTarget2:
  Type: AWS::EFS::MountTarget
  Properties:
    FileSystemId: !Ref EFSFileSystem
    SubnetId: !Ref PrivateSubnet2  # AZ2
    SecurityGroups:
      - !Ref EFSSecurityGroup
```

**Key Points:**
- Minimum 2 AZs for resilience
- Use private subnets
- Ensure Lambda subnets match EFS mount target AZs

---

## Lambda Configuration

### VPC Configuration

**Best Practice:** Deploy Lambda in VPC with proper subnet configuration

**Requirements:**
- Lambda must be in VPC to access EFS
- Use private subnets for Lambda
- Ensure subnets can route to EFS mount targets

**Configuration:**
```yaml
LambdaFunction:
  Type: AWS::Lambda::Function
  Properties:
    VpcConfig:
      SubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2
      SecurityGroupIds:
        - !Ref LambdaSecurityGroup
    FileSystemConfigs:
      - Arn: !GetAtt EFSAccessPoint.Arn
        LocalMountPath: /mnt/efs
```

### File System Configuration

**Best Practice:** Use consistent mount paths across all functions

**Recommended Structure:**
```
/mnt/efs/
├── models/              # ML models
│   └── all-MiniLM-L6-v2/
├── databases/           # Database files
│   └── lancedb/
├── cache/              # Temporary cache
└── shared/             # Shared resources
```

**Key Points:**
- Mount at `/mnt/efs` (Lambda convention)
- Use subdirectories for organization
- Keep paths consistent across environments

### Lazy Loading Pattern

**Best Practice:** Load EFS resources lazily to avoid cold start timeouts

**Anti-Pattern (Don't do this):**
```python
# BAD: Loads on every cold start
import lancedb
from sentence_transformers import SentenceTransformer

db = lancedb.connect('/mnt/efs/lancedb')
model = SentenceTransformer('/mnt/efs/models/model')

def lambda_handler(event, context):
    # Use db and model
    pass
```

**Best Practice (Do this):**
```python
# GOOD: Lazy loading
import lancedb
from sentence_transformers import SentenceTransformer

# Global variables (cached across invocations)
db = None
model = None

def initialize_lazy():
    """Load resources only when needed"""
    global db, model
    
    if db is None:
        print('Loading database...')
        db = lancedb.connect('/mnt/efs/lancedb')
    
    if model is None:
        print('Loading model...')
        model = SentenceTransformer('/mnt/efs/models/model')
    
    return db, model

def lambda_handler(event, context):
    # Load on first request only
    db, model = initialize_lazy()
    
    # Use db and model
    pass
```

**Benefits:**
- Faster cold starts (initialization deferred)
- Resources cached across warm invocations
- Better error handling
- Easier to test

### Timeout Configuration

**Best Practice:** Set appropriate timeouts for EFS operations

**Recommendations:**
- **Without EFS:** 3-30 seconds
- **With EFS (lazy loading):** 30-60 seconds
- **With EFS (eager loading):** 60-120 seconds

**Rationale:**
- EFS mount takes 5-10 seconds on cold start
- Model loading can take 10-30 seconds
- Database initialization takes 5-15 seconds

---

## Security Best Practices

### IAM Permissions

**Best Practice:** Use least privilege IAM permissions

**Required Permissions:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "elasticfilesystem:ClientMount",
        "elasticfilesystem:ClientWrite"
      ],
      "Resource": "arn:aws:elasticfilesystem:region:account:file-system/fs-id"
    }
  ]
}
```

**Key Points:**
- `ClientMount` required for read access
- `ClientWrite` required for write access
- Scope to specific file system ARN
- Use separate roles per function if needed

**Managed Policy:**
```yaml
# Use AWS managed policy (includes both permissions)
ManagedPolicyArns:
  - arn:aws:iam::aws:policy/AmazonElasticFileSystemClientReadWriteAccess
```

### Security Groups

**Best Practice:** Restrict NFS access to Lambda security group only

**Configuration:**
```yaml
# Lambda Security Group
LambdaSecurityGroup:
  Type: AWS::EC2::SecurityGroup
  Properties:
    GroupDescription: Lambda security group
    VpcId: !Ref VPC
    SecurityGroupEgress:
      - IpProtocol: tcp
        FromPort: 2049
        ToPort: 2049
        DestinationSecurityGroupId: !Ref EFSSecurityGroup

# EFS Security Group
EFSSecurityGroup:
  Type: AWS::EC2::SecurityGroup
  Properties:
    GroupDescription: EFS security group
    VpcId: !Ref VPC
    SecurityGroupIngress:
      - IpProtocol: tcp
        FromPort: 2049
        ToPort: 2049
        SourceSecurityGroupId: !Ref LambdaSecurityGroup
```

**Key Points:**
- Only allow port 2049 (NFS)
- Use security group references (not CIDR blocks)
- No public access to EFS
- Separate security groups for Lambda and EFS

### Encryption

**Best Practice:** Enable encryption at rest and in transit

**Configuration:**
```yaml
EFSFileSystem:
  Type: AWS::EFS::FileSystem
  Properties:
    Encrypted: true  # Encryption at rest
    KmsKeyId: !Ref KMSKey  # Optional: custom KMS key
```

**Key Points:**
- Encryption at rest: Always enable
- Encryption in transit: Automatic for EFS API calls
- NFS traffic: Within VPC (private network)
- Use AWS managed keys or customer managed keys

### Network Isolation

**Best Practice:** Keep EFS in private subnets with no internet access

**Architecture:**
```
┌─────────────────────────────────────────┐
│              Public Subnet               │
│         (NAT Gateway only)               │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│            Private Subnet                │
│  ┌──────────────┐    ┌──────────────┐   │
│  │   Lambda     │───▶│     EFS      │   │
│  │  Functions   │    │ Mount Target │   │
│  └──────────────┘    └──────────────┘   │
└─────────────────────────────────────────┘
```

**Key Points:**
- Lambda and EFS in private subnets
- NAT Gateway for Lambda internet access
- No direct internet access to EFS
- VPC endpoints for AWS services

---

## Performance Optimization

### Directory Structure

**Best Practice:** Limit files per directory for better performance

**Recommendations:**
- Max 50,000 files per directory
- Use subdirectories for organization
- Avoid deep nesting (max 3-4 levels)

**Example:**
```
# GOOD: Organized structure
/mnt/efs/
├── models/
│   ├── embeddings/
│   │   └── all-MiniLM-L6-v2/
│   └── classifiers/
│       └── bert-base/
└── databases/
    └── lancedb/
        ├── supplements/
        └── studies/

# BAD: Flat structure with many files
/mnt/efs/
├── model_file_1.bin
├── model_file_2.bin
├── ... (50,000 files)
└── model_file_50000.bin
```

### Caching Strategy

**Best Practice:** Cache frequently accessed data in Lambda memory

**Pattern:**
```python
# Global cache (persists across invocations)
_cache = {}

def get_from_efs_with_cache(key, efs_path):
    """Load from EFS with in-memory caching"""
    if key not in _cache:
        with open(efs_path, 'r') as f:
            _cache[key] = f.read()
    return _cache[key]
```

**Key Points:**
- Use global variables for caching
- Cache small, frequently accessed files
- Don't cache large files (memory limits)
- Clear cache if memory pressure

### Connection Pooling

**Best Practice:** Reuse connections across invocations

**Pattern:**
```python
# Global connection (reused across invocations)
_db_connection = None

def get_db_connection():
    """Get or create database connection"""
    global _db_connection
    
    if _db_connection is None:
        _db_connection = lancedb.connect('/mnt/efs/lancedb')
    
    return _db_connection
```

### Provisioned Concurrency

**Best Practice:** Use provisioned concurrency for latency-sensitive workloads

**When to use:**
- Consistent low latency required
- High traffic volume
- Cost-effective at scale

**Configuration:**
```yaml
ProvisionedConcurrencyConfig:
  Type: AWS::Lambda::ProvisionedConcurrencyConfig
  Properties:
    FunctionName: !Ref LambdaFunction
    ProvisionedConcurrentExecutions: 5
```

**Cost Consideration:**
- Provisioned concurrency costs ~$0.015/hour per GB-second
- Only use if cold start latency is critical

---

## Monitoring and Troubleshooting

### CloudWatch Metrics

**Best Practice:** Monitor EFS-specific metrics

**Key Metrics:**
- `ClientConnections` - Number of connections
- `DataReadIOBytes` - Read throughput
- `DataWriteIOBytes` - Write throughput
- `MetadataIOBytes` - Metadata operations
- `PercentIOLimit` - Throughput utilization

**Custom Metrics:**
```python
import boto3

cloudwatch = boto3.client('cloudwatch')

def log_efs_operation(operation, duration_ms):
    """Log custom EFS metrics"""
    cloudwatch.put_metric_data(
        Namespace='SuplementIA/EFS',
        MetricData=[
            {
                'MetricName': f'EFS_{operation}_Duration',
                'Value': duration_ms,
                'Unit': 'Milliseconds'
            }
        ]
    )
```

### Structured Logging

**Best Practice:** Use structured JSON logging for EFS operations

**Pattern:**
```python
import json
import time

def log_structured(event_type, **kwargs):
    """Structured logging for CloudWatch Insights"""
    log_entry = {
        'timestamp': time.time(),
        'event_type': event_type,
        **kwargs
    }
    print(json.dumps(log_entry))

# Usage
log_structured('efs_mount', duration_ms=1234, success=True)
log_structured('model_load', model_name='all-MiniLM-L6-v2', size_mb=80)
```

**CloudWatch Insights Queries:**
```sql
-- Average EFS mount time
fields @timestamp, duration_ms
| filter event_type = "efs_mount"
| stats avg(duration_ms) as avg_mount_time by bin(5m)

-- EFS errors
fields @timestamp, error_message
| filter event_type = "efs_error"
| stats count() by error_message
```

### Common Issues and Solutions

**Issue 1: Timeout during cold start**

**Symptoms:**
- Lambda times out on first invocation
- Works fine on subsequent invocations

**Solutions:**
1. Increase Lambda timeout to 60+ seconds
2. Implement lazy loading
3. Use provisioned concurrency
4. Reduce model/data size

**Issue 2: Permission denied**

**Symptoms:**
- `PermissionError: [Errno 13] Permission denied`
- Cannot write to EFS

**Solutions:**
1. Check IAM role has `elasticfilesystem:ClientWrite`
2. Verify EFS Access Point POSIX permissions
3. Check directory ownership (UID/GID)
4. Verify security groups allow port 2049

**Issue 3: EFS not mounted**

**Symptoms:**
- `/mnt/efs` directory doesn't exist
- `FileNotFoundError` when accessing EFS

**Solutions:**
1. Verify Lambda is in VPC
2. Check VPC configuration matches EFS subnets
3. Verify security groups allow NFS traffic
4. Check EFS mount targets are available
5. Ensure Lambda has VPC execution role

**Issue 4: Slow performance**

**Symptoms:**
- High latency on EFS operations
- Timeouts under load

**Solutions:**
1. Check throughput mode (consider Provisioned)
2. Reduce files per directory
3. Use caching for frequently accessed data
4. Ensure Lambda and EFS in same AZ
5. Monitor `PercentIOLimit` metric

---

## Cost Optimization

### Storage Classes

**Best Practice:** Use appropriate storage class for access patterns

**Options:**

1. **Standard** (Default)
   - $0.30/GB-month
   - Frequent access
   - Use for: Active models, databases

2. **Infrequent Access (IA)**
   - $0.025/GB-month (storage)
   - $0.01/GB (access)
   - Use for: Backups, archives

**Lifecycle Policy:**
```yaml
LifecyclePolicy:
  - TransitionToIA: AFTER_30_DAYS
  - TransitionToPrimaryStorageClass: AFTER_1_ACCESS
```

### Throughput Optimization

**Best Practice:** Start with Bursting, monitor, then optimize

**Decision Tree:**
```
Is throughput consistently maxed out?
├─ No  → Keep Bursting (no additional cost)
└─ Yes → Consider Provisioned
    ├─ Cost: $6/MB/s-month
    └─ Break-even: ~200 GB file system size
```

### Data Transfer Costs

**Best Practice:** Minimize cross-AZ data transfer

**Strategies:**
1. Deploy Lambda in same AZ as EFS mount target
2. Use multiple mount targets (one per AZ)
3. Monitor data transfer metrics

**Cost:**
- Same-AZ: Free
- Cross-AZ: $0.01/GB

### Monitoring Costs

**Best Practice:** Set up cost alerts and budgets

**CloudWatch Alarm:**
```yaml
EFSCostAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: EFS-High-Cost
    MetricName: EstimatedCharges
    Namespace: AWS/Billing
    Statistic: Maximum
    Period: 86400  # 1 day
    EvaluationPeriods: 1
    Threshold: 10  # $10/day
    ComparisonOperator: GreaterThanThreshold
```

---

## Summary

### Quick Checklist

- [ ] Use EFS Access Points for Lambda
- [ ] Choose General Purpose performance mode
- [ ] Start with Bursting throughput mode
- [ ] Create mount targets in all Lambda AZs
- [ ] Deploy Lambda in VPC with private subnets
- [ ] Configure security groups for port 2049
- [ ] Enable encryption at rest
- [ ] Use IAM least privilege permissions
- [ ] Implement lazy loading pattern
- [ ] Set appropriate Lambda timeout (30-60s)
- [ ] Use structured JSON logging
- [ ] Monitor EFS metrics in CloudWatch
- [ ] Implement caching for frequently accessed data
- [ ] Organize files in subdirectories
- [ ] Set up cost alerts

### Key Takeaways

1. **Performance:** Lazy loading + caching = fast warm starts
2. **Security:** Private subnets + security groups + IAM = secure
3. **Cost:** Bursting mode + Standard storage = cost-effective
4. **Reliability:** Multi-AZ + proper monitoring = resilient

### References

- [AWS Lambda - Configuring file system access](https://docs.aws.amazon.com/lambda/latest/dg/configuration-filesystem.html)
- [AWS Lambda - Best practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [Amazon EFS - Performance](https://docs.aws.amazon.com/efs/latest/ug/performance.html)
- [Amazon EFS - Security](https://docs.aws.amazon.com/efs/latest/ug/security-considerations.html)
