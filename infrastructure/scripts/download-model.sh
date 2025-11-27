#!/bin/bash
set -e

echo "Downloading ML model to EFS..."

python3 << 'PYTHON_SCRIPT'
from sentence_transformers import SentenceTransformer
import os

model_name = os.environ['MODEL_NAME']
efs_mount = os.environ['EFS_MOUNT_POINT']
model_path = os.path.join(efs_mount, 'models', model_name)

print(f"Downloading {model_name}...")
model = SentenceTransformer(model_name)
model.save(model_path)
print(f"Model saved to {model_path}")
PYTHON_SCRIPT

echo "✓ Model downloaded successfully"
