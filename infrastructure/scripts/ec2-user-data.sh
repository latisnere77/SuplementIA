#!/bin/bash
set -e

# Log everything
exec > >(tee /var/log/efs-setup.log)
exec 2>&1

echo "=== EFS Setup Started ==="
date

# Install dependencies
echo "Installing dependencies..."
yum install -y amazon-efs-utils python3.11 python3.11-pip

# Mount EFS
echo "Mounting EFS..."
mkdir -p /mnt/efs
mount -t efs -o tls fs-03774cd22d8f9b3d9:/ /mnt/efs

# Verify mount
df -h | grep efs
ls -la /mnt/efs

# Install Python packages to EFS
echo "Installing Python packages to EFS..."
mkdir -p /mnt/efs/python
pip3.11 install --target=/mnt/efs/python \
  sentence-transformers \
  lancedb \
  boto3

echo "Python packages installed"
ls -lh /mnt/efs/python/ | head -20

# Download ML model
echo "Downloading ML model..."
mkdir -p /mnt/efs/models
python3.11 << 'EOF'
import sys
sys.path.insert(0, '/mnt/efs/python')
from sentence_transformers import SentenceTransformer
print("Downloading model all-MiniLM-L6-v2...")
model = SentenceTransformer('all-MiniLM-L6-v2')
model.save('/mnt/efs/models/all-MiniLM-L6-v2')
print("Model downloaded successfully")
EOF

echo "Model saved"
ls -lh /mnt/efs/models/

# Initialize LanceDB
echo "Initializing LanceDB..."
python3.11 << 'EOF'
import sys
sys.path.insert(0, '/mnt/efs/python')
import lancedb
from sentence_transformers import SentenceTransformer
from datetime import datetime

print("Loading model...")
model = SentenceTransformer('/mnt/efs/models/all-MiniLM-L6-v2')

print("Connecting to LanceDB...")
db = lancedb.connect('/mnt/efs/suplementia-lancedb')

supplements = [
    {"name": "Vitamin D", "scientific_name": "Cholecalciferol", "category": "vitamin"},
    {"name": "Omega-3", "scientific_name": "Omega-3 Fatty Acids", "category": "fatty-acid"},
    {"name": "Magnesium", "scientific_name": "Magnesium", "category": "mineral"},
    {"name": "Vitamin C", "scientific_name": "Ascorbic Acid", "category": "vitamin"},
    {"name": "Zinc", "scientific_name": "Zinc", "category": "mineral"},
]

print("Creating embeddings...")
data = []
for idx, supp in enumerate(supplements, 1):
    embedding = model.encode(supp['name']).tolist()
    data.append({
        'id': idx,
        'name': supp['name'],
        'scientific_name': supp.get('scientific_name', ''),
        'common_names': [],
        'vector': embedding,
        'metadata': {
            'category': supp.get('category', 'other'),
            'popularity': 'high',
            'evidence_grade': 'A',
            'study_count': 100,
            'pubmed_query': supp['name']
        },
        'search_count': 0,
        'last_searched_at': datetime.now().isoformat(),
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    })

print("Creating LanceDB table...")
table = db.create_table('supplements', data=data, mode='overwrite')
print(f"✓ Created table with {len(data)} supplements")

# Verify
df = table.to_pandas()
print(f"✓ Verification: {len(df)} records in database")
print(df[['id', 'name', 'scientific_name']])
EOF

echo "=== EFS Setup Completed Successfully ==="
date

# Show final structure
echo "Final EFS structure:"
du -sh /mnt/efs/*

# Self-terminate
echo "Terminating instance..."
INSTANCE_ID=$(ec2-metadata --instance-id | cut -d " " -f 2)
REGION=$(ec2-metadata --availability-zone | cut -d " " -f 2 | sed 's/[a-z]$//')
aws ec2 terminate-instances --instance-ids $INSTANCE_ID --region $REGION

echo "Instance will terminate in 30 seconds..."
