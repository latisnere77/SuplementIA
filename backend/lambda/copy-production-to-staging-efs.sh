#!/bin/bash
set -e

# Copy LanceDB data from production EFS to staging EFS
# Uses a temporary EC2 instance to mount both filesystems

REGION="us-east-1"
PROD_EFS="fs-03774cd22d8f9b3d9"
STAGING_EFS="fs-0e6f9a62f873bc52c"

echo "================================================"
echo "  Copy Production Data to Staging EFS"
echo "================================================"
echo ""
echo "Production EFS: $PROD_EFS (1.6GB)"
echo "Staging EFS:    $STAGING_EFS (12KB)"
echo ""

# Get VPC and subnet from production Lambda
echo "Getting VPC configuration from production Lambda..."
LAMBDA_CONFIG=$(aws lambda get-function-configuration \
  --function-name production-search-api-lancedb \
  --region $REGION)

VPC_ID=$(echo $LAMBDA_CONFIG | jq -r '.VpcConfig.VpcId')
SUBNET_ID=$(echo $LAMBDA_CONFIG | jq -r '.VpcConfig.SubnetIds[0]')
SECURITY_GROUP=$(echo $LAMBDA_CONFIG | jq -r '.VpcConfig.SecurityGroupIds[0]')

echo "VPC ID: $VPC_ID"
echo "Subnet: $SUBNET_ID"
echo "Security Group: $SECURITY_GROUP"
echo ""

# Get latest Amazon Linux 2 AMI for ARM64
echo "Finding latest Amazon Linux 2 ARM64 AMI..."
AMI_ID=$(aws ec2 describe-images \
  --region $REGION \
  --owners amazon \
  --filters "Name=name,Values=amzn2-ami-hvm-*-arm64-gp2" \
           "Name=state,Values=available" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text)

echo "AMI ID: $AMI_ID"
echo ""

# Create user data script
cat > /tmp/efs-copy-userdata.sh << 'EOF'
#!/bin/bash
set -x
exec > /var/log/efs-copy.log 2>&1

echo "Installing NFS utilities..."
yum install -y amazon-efs-utils

echo "Creating mount points..."
mkdir -p /mnt/production-efs
mkdir -p /mnt/staging-efs

echo "Mounting production EFS..."
mount -t efs PROD_EFS_ID:/ /mnt/production-efs

echo "Mounting staging EFS..."
mount -t efs STAGING_EFS_ID:/ /mnt/staging-efs

echo "Checking production data..."
du -sh /mnt/production-efs/

echo "Starting rsync..."
rsync -av --progress /mnt/production-efs/ /mnt/staging-efs/

echo "Verifying staging data..."
du -sh /mnt/staging-efs/

echo "Copy complete! You can now terminate this instance."
echo "COPY_COMPLETE" > /tmp/copy-status.txt

# Signal completion
shutdown -h +5 "Data copy complete. Shutting down in 5 minutes."
EOF

# Replace EFS IDs in user data
sed -i.bak "s/PROD_EFS_ID/$PROD_EFS/g" /tmp/efs-copy-userdata.sh
sed -i.bak "s/STAGING_EFS_ID/$STAGING_EFS/g" /tmp/efs-copy-userdata.sh

# Launch EC2 instance
echo "Launching temporary EC2 instance (t4g.micro - ARM64)..."
INSTANCE_ID=$(aws ec2 run-instances \
  --region $REGION \
  --image-id $AMI_ID \
  --instance-type t4g.micro \
  --subnet-id $SUBNET_ID \
  --security-group-ids $SECURITY_GROUP \
  --user-data file:///tmp/efs-copy-userdata.sh \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=efs-copy-temp},{Key=Purpose,Value=temporary-data-copy}]' \
  --instance-initiated-shutdown-behavior terminate \
  --query 'Instances[0].InstanceId' \
  --output text)

echo ""
echo "✅ EC2 Instance launched: $INSTANCE_ID"
echo ""
echo "The instance is now copying data from production to staging."
echo "This will take approximately 5-10 minutes for 1.6GB."
echo ""
echo "To monitor progress:"
echo "  aws ec2 get-console-output --instance-id $INSTANCE_ID --region $REGION --output text"
echo ""
echo "To check instance status:"
echo "  aws ec2 describe-instances --instance-ids $INSTANCE_ID --region $REGION --query 'Reservations[0].Instances[0].State.Name'"
echo ""
echo "The instance will automatically shut down after the copy completes."
echo ""
echo "After completion, verify with:"
echo "  aws efs describe-file-systems --file-system-id $STAGING_EFS --region $REGION --query 'FileSystems[0].SizeInBytes.Value'"
echo ""
