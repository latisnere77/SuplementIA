#!/bin/bash
set -e

# Setup EFS using temporary EC2 instance
# Cost: ~$0.01 (1 centavo)
# Time: ~20 minutes

REGION="us-east-1"
VPC_ID="vpc-0d55802c172d83593"
EFS_ID="fs-03774cd22d8f9b3d9"
SG_ID="sg-00e692314386faa27"

echo "=========================================="
echo "EFS Setup with Temporary EC2"
echo "=========================================="
echo ""
echo "VPC: $VPC_ID"
echo "EFS: $EFS_ID"
echo "Region: $REGION"
echo ""

# Step 1: Create public subnet
echo "Step 1: Creating public subnet..."
SUBNET_ID=$(aws ec2 create-subnet \
  --vpc-id "$VPC_ID" \
  --cidr-block "10.0.101.0/24" \
  --availability-zone "${REGION}a" \
  --region "$REGION" \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=temp-efs-setup}]' \
  --query 'Subnet.SubnetId' \
  --output text)

echo "✓ Subnet created: $SUBNET_ID"

# Enable auto-assign public IP
aws ec2 modify-subnet-attribute \
  --subnet-id "$SUBNET_ID" \
  --map-public-ip-on-launch \
  --region "$REGION"

echo "✓ Auto-assign public IP enabled"

# Step 2: Create Internet Gateway
echo ""
echo "Step 2: Creating Internet Gateway..."
IGW_ID=$(aws ec2 create-internet-gateway \
  --region "$REGION" \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=temp-efs-setup}]' \
  --query 'InternetGateway.InternetGatewayId' \
  --output text)

echo "✓ Internet Gateway created: $IGW_ID"

# Attach to VPC
aws ec2 attach-internet-gateway \
  --vpc-id "$VPC_ID" \
  --internet-gateway-id "$IGW_ID" \
  --region "$REGION"

echo "✓ Internet Gateway attached to VPC"

# Step 3: Create route table
echo ""
echo "Step 3: Creating route table..."
RT_ID=$(aws ec2 create-route-table \
  --vpc-id "$VPC_ID" \
  --region "$REGION" \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=temp-efs-setup}]' \
  --query 'RouteTable.RouteTableId' \
  --output text)

echo "✓ Route table created: $RT_ID"

# Add route to internet
aws ec2 create-route \
  --route-table-id "$RT_ID" \
  --destination-cidr-block "0.0.0.0/0" \
  --gateway-id "$IGW_ID" \
  --region "$REGION"

echo "✓ Route to internet added"

# Associate with subnet
aws ec2 associate-route-table \
  --route-table-id "$RT_ID" \
  --subnet-id "$SUBNET_ID" \
  --region "$REGION"

echo "✓ Route table associated with subnet"

# Step 4: Get latest Amazon Linux 2023 ARM64 AMI
echo ""
echo "Step 4: Getting latest Amazon Linux 2023 ARM64 AMI..."
AMI_ID=$(aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=al2023-ami-2023.*-arm64" \
          "Name=state,Values=available" \
  --region "$REGION" \
  --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
  --output text)

echo "✓ AMI ID: $AMI_ID"

# Step 5: Create IAM role for EC2 (if not exists)
echo ""
echo "Step 5: Creating IAM role for EC2..."

# Check if role exists
if aws iam get-role --role-name EC2-EFS-Setup-Role 2>/dev/null; then
  echo "✓ IAM role already exists"
else
  # Create role
  aws iam create-role \
    --role-name EC2-EFS-Setup-Role \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "ec2.amazonaws.com"},
        "Action": "sts:AssumeRole"
      }]
    }' \
    --no-cli-pager

  # Attach policies
  aws iam attach-role-policy \
    --role-name EC2-EFS-Setup-Role \
    --policy-arn arn:aws:iam::aws:policy/AmazonElasticFileSystemClientFullAccess \
    --no-cli-pager

  aws iam attach-role-policy \
    --role-name EC2-EFS-Setup-Role \
    --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess \
    --no-cli-pager

  # Create instance profile
  aws iam create-instance-profile \
    --instance-profile-name EC2-EFS-Setup-Profile \
    --no-cli-pager

  aws iam add-role-to-instance-profile \
    --instance-profile-name EC2-EFS-Setup-Profile \
    --role-name EC2-EFS-Setup-Role \
    --no-cli-pager

  echo "✓ IAM role created"
  echo "Waiting 10 seconds for IAM propagation..."
  sleep 10
fi

# Step 6: Launch EC2 instance
echo ""
echo "Step 6: Launching EC2 instance..."

INSTANCE_ID=$(aws ec2 run-instances \
  --image-id "$AMI_ID" \
  --instance-type t4g.nano \
  --subnet-id "$SUBNET_ID" \
  --security-group-ids "$SG_ID" \
  --iam-instance-profile Name=EC2-EFS-Setup-Profile \
  --user-data file://infrastructure/scripts/ec2-user-data.sh \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=temp-efs-setup}]' \
  --instance-initiated-shutdown-behavior terminate \
  --region "$REGION" \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "✓ EC2 instance launched: $INSTANCE_ID"
echo ""
echo "Instance is now setting up EFS..."
echo "This will take approximately 15-20 minutes"
echo ""

# Step 7: Monitor instance
echo "Step 7: Monitoring instance..."
echo ""
echo "You can view logs at:"
echo "https://console.aws.amazon.com/ec2/v2/home?region=$REGION#Instances:instanceId=$INSTANCE_ID"
echo ""

# Wait for instance to be running
echo "Waiting for instance to be running..."
aws ec2 wait instance-running \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION"

echo "✓ Instance is running"
echo ""

# Monitor instance state
echo "Monitoring setup progress..."
echo "(Instance will auto-terminate when complete)"
echo ""

while true; do
  STATE=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --region "$REGION" \
    --query 'Reservations[0].Instances[0].State.Name' \
    --output text)
  
  if [ "$STATE" = "terminated" ] || [ "$STATE" = "shutting-down" ]; then
    echo "✓ Instance completed and terminated"
    break
  elif [ "$STATE" = "stopped" ] || [ "$STATE" = "stopping" ]; then
    echo "✓ Instance completed and stopped"
    break
  fi
  
  echo "Instance state: $STATE (checking again in 30 seconds...)"
  sleep 30
done

echo ""
echo "Step 8: Cleanup..."

# Wait a bit for termination to complete
sleep 30

# Delete route table association
echo "Deleting route table association..."
ASSOC_ID=$(aws ec2 describe-route-tables \
  --route-table-ids "$RT_ID" \
  --region "$REGION" \
  --query 'RouteTables[0].Associations[?SubnetId==`'$SUBNET_ID'`].RouteTableAssociationId' \
  --output text)

if [ -n "$ASSOC_ID" ]; then
  aws ec2 disassociate-route-table \
    --association-id "$ASSOC_ID" \
    --region "$REGION"
  echo "✓ Route table disassociated"
fi

# Delete route table
echo "Deleting route table..."
aws ec2 delete-route-table \
  --route-table-id "$RT_ID" \
  --region "$REGION"
echo "✓ Route table deleted"

# Delete subnet
echo "Deleting subnet..."
aws ec2 delete-subnet \
  --subnet-id "$SUBNET_ID" \
  --region "$REGION"
echo "✓ Subnet deleted"

# Detach and delete Internet Gateway
echo "Detaching Internet Gateway..."
aws ec2 detach-internet-gateway \
  --vpc-id "$VPC_ID" \
  --internet-gateway-id "$IGW_ID" \
  --region "$REGION"
echo "✓ Internet Gateway detached"

echo "Deleting Internet Gateway..."
aws ec2 delete-internet-gateway \
  --internet-gateway-id "$IGW_ID" \
  --region "$REGION"
echo "✓ Internet Gateway deleted"

echo ""
echo "=========================================="
echo "✅ EFS Setup Complete!"
echo "=========================================="
echo ""
echo "Resources created:"
echo "  - /mnt/efs/python/ (Python libraries)"
echo "  - /mnt/efs/models/ (ML model)"
echo "  - /mnt/efs/suplementia-lancedb/ (Database)"
echo ""
echo "Cost: ~$0.01"
echo ""
echo "Next steps:"
echo "  1. Test Lambda functions"
echo "  2. Verify search works"
echo ""
