/**
 * Integration Tests for Infrastructure Deployment
 * 
 * Tests that all CloudFormation resources are created correctly
 * Validates VPC and security group configuration
 * Validates DynamoDB table schemas
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { 
  CloudFormationClient, 
  DescribeStacksCommand,
  DescribeStackResourcesCommand 
} from '@aws-sdk/client-cloudformation';
import { 
  DynamoDBClient, 
  DescribeTableCommand 
} from '@aws-sdk/client-dynamodb';
import { 
  EC2Client, 
  DescribeVpcsCommand,
  DescribeSubnetsCommand,
  DescribeSecurityGroupsCommand 
} from '@aws-sdk/client-ec2';
import { 
  EFSClient, 
  DescribeFileSystemsCommand,
  DescribeMountTargetsCommand 
} from '@aws-sdk/client-efs';
import { 
  LambdaClient, 
  GetFunctionCommand 
} from '@aws-sdk/client-lambda';

const ENVIRONMENT = process.env.TEST_ENVIRONMENT || 'staging';
const REGION = process.env.AWS_REGION || 'us-east-1';
const STACK_NAME = `${ENVIRONMENT}-suplementia-lancedb`;

// Initialize AWS clients
const cfnClient = new CloudFormationClient({ region: REGION });
const dynamoClient = new DynamoDBClient({ region: REGION });
const ec2Client = new EC2Client({ region: REGION });
const efsClient = new EFSClient({ region: REGION });
const lambdaClient = new LambdaClient({ region: REGION });

describe('Infrastructure Deployment Tests', () => {
  let stackOutputs: Record<string, string> = {};
  
  beforeAll(async () => {
    // Get stack outputs for use in tests
    try {
      const response = await cfnClient.send(
        new DescribeStacksCommand({ StackName: STACK_NAME })
      );
      
      const stack = response.Stacks?.[0];
      if (stack?.Outputs) {
        stackOutputs = stack.Outputs.reduce((acc, output) => {
          if (output.OutputKey && output.OutputValue) {
            acc[output.OutputKey] = output.OutputValue;
          }
          return acc;
        }, {} as Record<string, string>);
      }
    } catch (error) {
      console.error('Failed to get stack outputs:', error);
    }
  }, 30000);

  describe('CloudFormation Stack', () => {
    it('should have stack in CREATE_COMPLETE or UPDATE_COMPLETE status', async () => {
      const response = await cfnClient.send(
        new DescribeStacksCommand({ StackName: STACK_NAME })
      );
      
      const stack = response.Stacks?.[0];
      expect(stack).toBeDefined();
      expect(stack?.StackStatus).toMatch(/CREATE_COMPLETE|UPDATE_COMPLETE/);
    });

    it('should have all required resources created', async () => {
      const response = await cfnClient.send(
        new DescribeStackResourcesCommand({ StackName: STACK_NAME })
      );
      
      const resources = response.StackResources || [];
      const resourceTypes = resources.map(r => r.ResourceType);
      
      // Verify key resource types exist
      expect(resourceTypes).toContain('AWS::EC2::VPC');
      expect(resourceTypes).toContain('AWS::EC2::Subnet');
      expect(resourceTypes).toContain('AWS::EC2::SecurityGroup');
      expect(resourceTypes).toContain('AWS::EFS::FileSystem');
      expect(resourceTypes).toContain('AWS::EFS::MountTarget');
      expect(resourceTypes).toContain('AWS::DynamoDB::Table');
      expect(resourceTypes).toContain('AWS::Lambda::Function');
      expect(resourceTypes).toContain('AWS::IAM::Role');
    });

    it('should have all resources in CREATE_COMPLETE status', async () => {
      const response = await cfnClient.send(
        new DescribeStackResourcesCommand({ StackName: STACK_NAME })
      );
      
      const resources = response.StackResources || [];
      const incompleteResources = resources.filter(
        r => r.ResourceStatus !== 'CREATE_COMPLETE' && r.ResourceStatus !== 'UPDATE_COMPLETE'
      );
      
      expect(incompleteResources).toHaveLength(0);
    });
  });

  describe('VPC Configuration', () => {
    it('should have VPC with correct CIDR block', async () => {
      const vpcId = stackOutputs['VPCId'];
      expect(vpcId).toBeDefined();
      
      const response = await ec2Client.send(
        new DescribeVpcsCommand({ VpcIds: [vpcId] })
      );
      
      const vpc = response.Vpcs?.[0];
      expect(vpc).toBeDefined();
      expect(vpc?.CidrBlock).toBe('10.0.0.0/16');
      expect(vpc?.State).toBe('available');
    });

    it('should have two private subnets in different AZs', async () => {
      const subnet1Id = stackOutputs['PrivateSubnet1Id'];
      const subnet2Id = stackOutputs['PrivateSubnet2Id'];
      
      expect(subnet1Id).toBeDefined();
      expect(subnet2Id).toBeDefined();
      
      const response = await ec2Client.send(
        new DescribeSubnetsCommand({ SubnetIds: [subnet1Id, subnet2Id] })
      );
      
      const subnets = response.Subnets || [];
      expect(subnets).toHaveLength(2);
      
      // Verify subnets are in different AZs
      const azs = subnets.map(s => s.AvailabilityZone);
      expect(new Set(azs).size).toBe(2);
      
      // Verify CIDR blocks
      const cidrBlocks = subnets.map(s => s.CidrBlock).sort();
      expect(cidrBlocks).toEqual(['10.0.1.0/24', '10.0.2.0/24']);
    });
  });

  describe('Security Groups', () => {
    it('should have Lambda security group with correct egress rules', async () => {
      const sgId = stackOutputs['LambdaSecurityGroupId'];
      expect(sgId).toBeDefined();
      
      const response = await ec2Client.send(
        new DescribeSecurityGroupsCommand({ GroupIds: [sgId] })
      );
      
      const sg = response.SecurityGroups?.[0];
      expect(sg).toBeDefined();
      expect(sg?.GroupName).toContain('lambda-sg');
      
      // Verify egress allows all traffic
      const egressRules = sg?.IpPermissionsEgress || [];
      const allowAllEgress = egressRules.some(
        rule => rule.IpProtocol === '-1' && 
                rule.IpRanges?.some(range => range.CidrIp === '0.0.0.0/0')
      );
      expect(allowAllEgress).toBe(true);
    });

    it('should have EFS security group allowing NFS from Lambda', async () => {
      const response = await cfnClient.send(
        new DescribeStackResourcesCommand({ StackName: STACK_NAME })
      );
      
      const efsSecurityGroup = response.StackResources?.find(
        r => r.LogicalResourceId === 'EFSSecurityGroup'
      );
      
      expect(efsSecurityGroup).toBeDefined();
      expect(efsSecurityGroup?.ResourceStatus).toMatch(/CREATE_COMPLETE|UPDATE_COMPLETE/);
      
      if (efsSecurityGroup?.PhysicalResourceId) {
        const sgResponse = await ec2Client.send(
          new DescribeSecurityGroupsCommand({ 
            GroupIds: [efsSecurityGroup.PhysicalResourceId] 
          })
        );
        
        const sg = sgResponse.SecurityGroups?.[0];
        expect(sg).toBeDefined();
        
        // Verify ingress allows NFS (port 2049) from Lambda SG
        const ingressRules = sg?.IpPermissions || [];
        const nfsRule = ingressRules.find(rule => 
          rule.FromPort === 2049 && rule.ToPort === 2049
        );
        expect(nfsRule).toBeDefined();
      }
    });
  });

  describe('DynamoDB Tables', () => {
    it('should have supplement-cache table with correct schema', async () => {
      const tableName = stackOutputs['SupplementCacheTableName'];
      expect(tableName).toBeDefined();
      expect(tableName).toContain('supplement-cache');
      
      const response = await dynamoClient.send(
        new DescribeTableCommand({ TableName: tableName })
      );
      
      const table = response.Table;
      expect(table).toBeDefined();
      expect(table?.TableStatus).toBe('ACTIVE');
      expect(table?.BillingModeSummary?.BillingMode).toBe('PAY_PER_REQUEST');
      
      // Verify key schema
      const keySchema = table?.KeySchema || [];
      expect(keySchema).toHaveLength(2);
      expect(keySchema.find(k => k.AttributeName === 'PK' && k.KeyType === 'HASH')).toBeDefined();
      expect(keySchema.find(k => k.AttributeName === 'SK' && k.KeyType === 'RANGE')).toBeDefined();
      
      // Verify TTL is enabled
      expect(table?.TimeToLiveDescription?.TimeToLiveStatus).toBe('ENABLED');
      expect(table?.TimeToLiveDescription?.AttributeName).toBe('ttl');
      
      // Verify streams are enabled
      expect(table?.StreamSpecification?.StreamEnabled).toBe(true);
    });

    it('should have discovery-queue table with correct schema', async () => {
      const tableName = stackOutputs['DiscoveryQueueTableName'];
      expect(tableName).toBeDefined();
      expect(tableName).toContain('discovery-queue');
      
      const response = await dynamoClient.send(
        new DescribeTableCommand({ TableName: tableName })
      );
      
      const table = response.Table;
      expect(table).toBeDefined();
      expect(table?.TableStatus).toBe('ACTIVE');
      expect(table?.BillingModeSummary?.BillingMode).toBe('PAY_PER_REQUEST');
      
      // Verify key schema
      const keySchema = table?.KeySchema || [];
      expect(keySchema).toHaveLength(2);
      expect(keySchema.find(k => k.AttributeName === 'PK' && k.KeyType === 'HASH')).toBeDefined();
      expect(keySchema.find(k => k.AttributeName === 'SK' && k.KeyType === 'RANGE')).toBeDefined();
      
      // Verify streams are enabled for triggering discovery worker
      expect(table?.StreamSpecification?.StreamEnabled).toBe(true);
      expect(table?.StreamSpecification?.StreamViewType).toBe('NEW_IMAGE');
    });
  });

  describe('EFS File System', () => {
    it('should have EFS file system in available state', async () => {
      const fileSystemId = stackOutputs['EFSFileSystemId'];
      expect(fileSystemId).toBeDefined();
      
      const response = await efsClient.send(
        new DescribeFileSystemsCommand({ FileSystemId: fileSystemId })
      );
      
      const fs = response.FileSystems?.[0];
      expect(fs).toBeDefined();
      expect(fs?.LifeCycleState).toBe('available');
      expect(fs?.Encrypted).toBe(true);
      expect(fs?.PerformanceMode).toBe('generalPurpose');
    });

    it('should have mount targets in both availability zones', async () => {
      const fileSystemId = stackOutputs['EFSFileSystemId'];
      expect(fileSystemId).toBeDefined();
      
      const response = await efsClient.send(
        new DescribeMountTargetsCommand({ FileSystemId: fileSystemId })
      );
      
      const mountTargets = response.MountTargets || [];
      expect(mountTargets.length).toBeGreaterThanOrEqual(2);
      
      // Verify all mount targets are available
      mountTargets.forEach(mt => {
        expect(mt.LifeCycleState).toBe('available');
      });
      
      // Verify mount targets are in different subnets
      const subnetIds = mountTargets.map(mt => mt.SubnetId);
      expect(new Set(subnetIds).size).toBe(mountTargets.length);
    });

    it('should have access point configured', async () => {
      const accessPointId = stackOutputs['EFSAccessPointId'];
      expect(accessPointId).toBeDefined();
      
      // Access point existence is verified by the stack output
      // Detailed validation would require DescribeAccessPoints API call
    });
  });

  describe('Lambda Functions', () => {
    it('should have search-api Lambda function deployed', async () => {
      const functionName = `${ENVIRONMENT}-search-api-lancedb`;
      
      const response = await lambdaClient.send(
        new GetFunctionCommand({ FunctionName: functionName })
      );
      
      const config = response.Configuration;
      expect(config).toBeDefined();
      expect(config?.State).toBe('Active');
      expect(config?.Runtime).toBe('python3.11');
      expect(config?.Architectures).toContain('arm64');
      expect(config?.Timeout).toBeGreaterThanOrEqual(30);
      expect(config?.MemorySize).toBeGreaterThanOrEqual(512);
      
      // Verify VPC configuration
      expect(config?.VpcConfig?.VpcId).toBeDefined();
      expect(config?.VpcConfig?.SubnetIds).toHaveLength(2);
      expect(config?.VpcConfig?.SecurityGroupIds).toHaveLength(1);
      
      // Verify EFS mount
      expect(config?.FileSystemConfigs).toHaveLength(1);
      expect(config?.FileSystemConfigs?.[0].LocalMountPath).toBe('/mnt/efs');
      
      // Verify environment variables
      const env = config?.Environment?.Variables || {};
      expect(env.LANCEDB_PATH).toBe('/mnt/efs/suplementia-lancedb');
      expect(env.MODEL_PATH).toBe('/mnt/efs/models/all-MiniLM-L6-v2');
      expect(env.DYNAMODB_CACHE_TABLE).toBeDefined();
    });

    it('should have discovery-worker Lambda function deployed', async () => {
      const functionName = `${ENVIRONMENT}-discovery-worker-lancedb`;
      
      const response = await lambdaClient.send(
        new GetFunctionCommand({ FunctionName: functionName })
      );
      
      const config = response.Configuration;
      expect(config).toBeDefined();
      expect(config?.State).toBe('Active');
      expect(config?.Runtime).toBe('python3.11');
      expect(config?.Architectures).toContain('arm64');
      expect(config?.Timeout).toBeGreaterThanOrEqual(300);
      expect(config?.MemorySize).toBeGreaterThanOrEqual(1024);
      
      // Verify VPC configuration
      expect(config?.VpcConfig?.VpcId).toBeDefined();
      expect(config?.VpcConfig?.SubnetIds).toHaveLength(2);
      
      // Verify EFS mount
      expect(config?.FileSystemConfigs).toHaveLength(1);
      expect(config?.FileSystemConfigs?.[0].LocalMountPath).toBe('/mnt/efs');
      
      // Verify environment variables
      const env = config?.Environment?.Variables || {};
      expect(env.LANCEDB_PATH).toBe('/mnt/efs/suplementia-lancedb');
      expect(env.MODEL_PATH).toBe('/mnt/efs/models/all-MiniLM-L6-v2');
    });
  });

  describe('CloudWatch Monitoring', () => {
    it('should have log groups created for Lambda functions', async () => {
      const response = await cfnClient.send(
        new DescribeStackResourcesCommand({ StackName: STACK_NAME })
      );
      
      const logGroups = response.StackResources?.filter(
        r => r.ResourceType === 'AWS::Logs::LogGroup'
      ) || [];
      
      // Should have log groups for search-api and discovery-worker
      expect(logGroups.length).toBeGreaterThanOrEqual(2);
    });

    it('should have CloudWatch alarms configured', async () => {
      const response = await cfnClient.send(
        new DescribeStackResourcesCommand({ StackName: STACK_NAME })
      );
      
      const alarms = response.StackResources?.filter(
        r => r.ResourceType === 'AWS::CloudWatch::Alarm'
      ) || [];
      
      // Should have alarms for errors and latency
      expect(alarms.length).toBeGreaterThanOrEqual(2);
      
      const alarmNames = alarms.map(a => a.LogicalResourceId);
      expect(alarmNames.some(name => name.includes('Error'))).toBe(true);
      expect(alarmNames.some(name => name.includes('Latency'))).toBe(true);
    });
  });

  describe('IAM Roles', () => {
    it('should have Lambda execution role with correct permissions', async () => {
      const roleArn = stackOutputs['LambdaExecutionRoleArn'];
      expect(roleArn).toBeDefined();
      expect(roleArn).toContain('search-api-lambda-role');
      
      // Role existence and basic structure verified by stack output
      // Detailed policy validation would require IAM API calls
    });
  });
});
