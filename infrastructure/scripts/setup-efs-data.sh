#!/bin/bash

# SuplementIA - Setup EFS Data (Model + LanceDB)
# This script should be run on an EC2 instance with EFS mounted

set -e

EFS_MOUNT_POINT=${1:-/mnt/efs}
EFS_ID="fs-03774cd22d8f9b3d9"

echo "=========================================="
echo "SuplementIA - EFS Data Setup"
echo "=========================================="
echo "EFS Mount Point: $EFS_MOUNT_POINT"
echo "EFS ID: $EFS_ID"
echo ""

# Check if EFS is mounted
if ! mountpoint -q "$EFS_MOUNT_POINT"; then
    echo "❌ EFS not mounted at $EFS_MOUNT_POINT"
    echo ""
    echo "Please mount EFS first:"
    echo "  sudo mkdir -p $EFS_MOUNT_POINT"
    echo "  sudo mount -t efs $EFS_ID:/ $EFS_MOUNT_POINT"
    exit 1
fi

echo "✓ EFS is mounted"
echo ""

# Step 1: Download ML Model
echo "Step 1: Downloading ML Model"
echo "----------------------------------------"

MODEL_DIR="$EFS_MOUNT_POINT/models/all-MiniLM-L6-v2"

if [ -d "$MODEL_DIR" ] && [ "$(ls -A $MODEL_DIR)" ]; then
    echo "⚠️  Model already exists at $MODEL_DIR"
    read -p "Overwrite? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping model download"
    else
        echo "Downloading model..."
        python3 << EOF
from sentence_transformers import SentenceTransformer
import os

model_dir = "$MODEL_DIR"
os.makedirs(os.path.dirname(model_dir), exist_ok=True)

print("Downloading all-MiniLM-L6-v2...")
model = SentenceTransformer('all-MiniLM-L6-v2')
model.save(model_dir)
print(f"✓ Model saved to {model_dir}")
EOF
    fi
else
    echo "Downloading model..."
    python3 << EOF
from sentence_transformers import SentenceTransformer
import os

model_dir = "$MODEL_DIR"
os.makedirs(os.path.dirname(model_dir), exist_ok=True)

print("Downloading all-MiniLM-L6-v2...")
model = SentenceTransformer('all-MiniLM-L6-v2')
model.save(model_dir)
print(f"✓ Model saved to {model_dir}")
EOF
fi

# Verify model
if [ -f "$MODEL_DIR/config.json" ] && [ -f "$MODEL_DIR/pytorch_model.bin" ]; then
    echo "✓ Model files verified"
    MODEL_SIZE=$(du -sh "$MODEL_DIR" | cut -f1)
    echo "  Model size: $MODEL_SIZE"
else
    echo "❌ Model files incomplete"
    exit 1
fi

echo ""

# Step 2: Initialize LanceDB
echo "Step 2: Initializing LanceDB"
echo "----------------------------------------"

LANCEDB_DIR="$EFS_MOUNT_POINT/suplementia-lancedb"

if [ -d "$LANCEDB_DIR" ] && [ "$(ls -A $LANCEDB_DIR)" ]; then
    echo "⚠️  LanceDB already exists at $LANCEDB_DIR"
    read -p "Overwrite? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping LanceDB initialization"
    else
        echo "Initializing LanceDB..."
        rm -rf "$LANCEDB_DIR"
        mkdir -p "$LANCEDB_DIR"
        echo "✓ LanceDB directory created"
    fi
else
    echo "Creating LanceDB directory..."
    mkdir -p "$LANCEDB_DIR"
    echo "✓ LanceDB directory created"
fi

echo ""

# Step 3: Migrate Sample Data
echo "Step 3: Migrating Sample Data"
echo "----------------------------------------"

python3 << 'EOF'
import lancedb
import os
from sentence_transformers import SentenceTransformer
from datetime import datetime

# Configuration
LANCEDB_PATH = os.environ.get('LANCEDB_PATH', '/mnt/efs/suplementia-lancedb')
MODEL_PATH = os.environ.get('MODEL_PATH', '/mnt/efs/models/all-MiniLM-L6-v2')

print(f"LanceDB Path: {LANCEDB_PATH}")
print(f"Model Path: {MODEL_PATH}")
print()

# Load model
print("Loading model...")
model = SentenceTransformer(MODEL_PATH)
print("✓ Model loaded")
print()

# Sample supplements (first 10 for testing)
supplements = [
    {"name": "Vitamin D", "scientific_name": "Cholecalciferol", "category": "vitamin"},
    {"name": "Omega-3", "scientific_name": "Omega-3 Fatty Acids", "category": "fatty-acid"},
    {"name": "Magnesium", "scientific_name": "Magnesium", "category": "mineral"},
    {"name": "Vitamin C", "scientific_name": "Ascorbic Acid", "category": "vitamin"},
    {"name": "Zinc", "scientific_name": "Zinc", "category": "mineral"},
    {"name": "Vitamin B12", "scientific_name": "Cobalamin", "category": "vitamin"},
    {"name": "Iron", "scientific_name": "Iron", "category": "mineral"},
    {"name": "Calcium", "scientific_name": "Calcium", "category": "mineral"},
    {"name": "Vitamin E", "scientific_name": "Tocopherol", "category": "vitamin"},
    {"name": "Probiotics", "scientific_name": "Lactobacillus", "category": "other"},
]

# Initialize LanceDB
print("Initializing LanceDB...")
db = lancedb.connect(LANCEDB_PATH)
print("✓ Connected to LanceDB")
print()

# Create table
print("Creating supplements table...")
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
    print(f"  [{idx}/{len(supplements)}] {supp['name']}")

table = db.create_table('supplements', data=data, mode='overwrite')
print(f"✓ Created table with {len(data)} supplements")
print()

# Verify
print("Verifying data...")
df = table.to_pandas()
print(f"✓ Total records: {len(df)}")
print()
print("Sample records:")
print(df[['id', 'name', 'scientific_name']].head())
print()

# Test search
print("Testing vector search...")
test_query = "vitamin d"
test_embedding = model.encode(test_query).tolist()
results = table.search(test_embedding).metric("cosine").limit(3).to_list()
print(f"Query: '{test_query}'")
print("Results:")
for i, result in enumerate(results, 1):
    similarity = 1 - result.get('_distance', 1)
    print(f"  {i}. {result['name']} (similarity: {similarity:.3f})")
print()

print("✓ Migration complete!")
EOF

echo ""
echo "=========================================="
echo "✅ EFS Data Setup Complete!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  ✓ ML Model downloaded to EFS"
echo "  ✓ LanceDB initialized"
echo "  ✓ Sample data migrated (10 supplements)"
echo ""
echo "Next steps:"
echo "  1. Deploy Lambda code"
echo "  2. Test Lambda functions"
echo "  3. Add remaining supplements"
echo ""
